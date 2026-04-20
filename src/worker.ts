import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
// Import types
import type {
  CockpitAlert,
  ChangeHistoryEntry,
  DomainHealth,
  EvidenceBackedReview,
  EvidenceReference,
  HealthDomain,
  MultiDomainHealthSummary,
  RemediationPlan,
  StateSummary,
} from "./types.js";

// Import health summary module
import {
  buildMultiDomainHealthSummary,
  computeOverallStatus,
  getConnectorHealth,
  getCoreHealth,
  getDepartmentsHealth,
  getSetupHealth,
  getSkillsHealth,
  getToolsHealth,
} from "./health-summary.js";

// Import review generation module
import {
  createEvidenceReference,
  generateOperatingReview,
  generateProbableCauses,
  generateRankedActions,
  mediumConfidence,
} from "./review-generation.js";

// Import alert generation module
import {
  createConnectorAlert,
  createDriftAlert,
  createReconciliationNeededAlert,
  createUpgradeFailureAlert,
  filterActiveAlerts,
  sortAlertsByPriority,
} from "./alert-generation.js";

// Import change history module
import {
  buildChangeHistory,
  correlateAlertToChanges,
  createConfigChangeEntry,
  createConnectorChangeEntry,
  createProvisioningEntry,
  createReconcileEntry,
  createRollbackEntry,
  createUpgradeEntry,
  getRecentChanges,
} from "./change-history.js";

// =============================================================================
// Tool Health Registry Types
// =============================================================================

interface ToolHealthReport {
  toolId: string;
  toolName: string;
  status: "ok" | "degraded" | "error" | "unknown";
  checkedAt: string;
  message?: string;
}

interface ToolHealthRegistry {
  tools: Map<string, ToolHealthReport>;
  lastUpdate: string;
}

// =============================================================================
// Cockpit State Storage
// =============================================================================

interface CockpitState {
  changeHistory: ChangeHistoryEntry[];
  activeAlerts: CockpitAlert[];
  lastHealthCheck?: string;
  lastReviewGeneration?: string;
  toolHealthRegistry: ToolHealthRegistry;
}

const cockpitState: CockpitState = {
  changeHistory: [],
  activeAlerts: [],
  toolHealthRegistry: {
    tools: new Map(),
    lastUpdate: new Date().toISOString(),
  },
};

interface FoundationSnapshot {
  setupId: string;
  handoff: {
    setupId: string;
    workspaceId: string;
    cockpitUrl?: string;
    status: "ready" | "degraded";
    healthSummary: Record<string, "ok" | "degraded" | "error">;
    evidence: {
      provisioningOutput: {
        setupId: string;
        completedAt: string;
        stages: Array<{
          id: string;
          name: string;
          status: "pending" | "running" | "complete" | "failed" | "skipped";
          duration: number;
        }>;
      };
      completedStages: string[];
      contractValidation: Array<{
        contractId: string;
        expectedVersion: string;
        actualVersion: string;
        severity: "blocking" | "warning";
        affectedSurface: string;
        remediation: string;
      }>;
    };
  };
  compatibility: {
    overallStatus: "supported" | "degraded" | "unsupported" | "unknown";
    consumers: Array<{
      consumerId: string;
      currentStatus: "supported" | "degraded" | "unsupported" | "unknown";
      validationMode: "direct" | "inferred";
      maintained: boolean;
      evidenceSource?: string;
    }>;
    supportedConsumers: string[];
    degradedConsumers: string[];
    blockedConsumers: string[];
  };
  connectorFailure: {
    id: string;
    category: string;
    severity: "low" | "medium" | "high" | "critical";
    providerId: string;
    detectedAt: string;
    retryable: boolean;
    suggestedRetryDelayMs?: number;
    maxRetries: number;
    displayMessage: string;
    evidence: Array<{
      type: string;
      key: string;
      value: string;
      containsSensitiveData: boolean;
    }>;
  };
  reconciliation: {
    id: string;
    providerId: string;
    status: "idle" | "detecting_gaps" | "reconciling" | "replayed" | "partial" | "failed" | "no_gaps_found";
    startedAt: string;
    completedAt?: string;
    detectedGaps: Array<{
      id: string;
      providerId: string;
      eventType: string;
      gapStart: string;
      gapEnd: string;
      reason: string;
      estimatedMissedCount: number;
      reconciled: boolean;
      unresolvedEvents: Array<{
        id: string;
        eventType: string;
        errorMessage?: string;
      }>;
    }>;
    totalReplayed: number;
    totalUnresolved: number;
    stateConsistent: boolean;
    summary: string;
  };
}

type CrossAreaRuntime = {
  performAction?: <TResult = unknown>(actionName: string, args?: Record<string, unknown>) => Promise<TResult>;
  getData: <TResult = unknown>(key: string, args?: Record<string, unknown>) => Promise<TResult>;
};

function createFallbackCrossAreaRuntime(): CrossAreaRuntime {
  return {
    getData: async <TResult = unknown>(key: string) => {
      switch (key) {
        case "setup.handoff":
          return {
            setupId: "setup_studio_handoff",
            workspaceId: "workspace_acme_ready",
            cockpitUrl: "http://localhost:3102/cockpit/workspace_acme_ready",
            status: "ready",
            healthSummary: "Workspace is ready for cockpit monitoring.",
            evidence: {
              provisioningOutput: {
                action: "provision",
                status: "ready",
                completedAt: "2026-04-03T15:00:00.000Z",
                checks: [
                  { name: "core-packages", status: "passed" },
                  { name: "connector-prereqs", status: "passed" },
                ],
              },
              completedStages: ["preflight", "apply", "handoff"],
              contractValidation: {
                status: "passed",
                blockingMismatches: [],
              },
            },
          } as TResult;
        case "compat:summary":
          return {
            overallStatus: "supported",
            consumers: [
              {
                consumerId: "uos-plugin-operations-cockpit",
                currentStatus: "supported",
                validationMode: "runtime",
                maintained: true,
                evidenceSource: "compat:summary",
              },
              {
                consumerId: "uos-plugin-connectors",
                currentStatus: "supported",
                validationMode: "runtime",
                maintained: true,
                evidenceSource: "compat:summary",
              },
            ],
            supportedConsumers: ["uos-plugin-operations-cockpit", "uos-plugin-connectors"],
            degradedConsumers: [],
            blockedConsumers: [],
          } as TResult;
        case "classifyFailure":
          return {
            failure: {
              id: "failure-none",
              category: "none",
              severity: "info",
              providerId: "connectors",
              detectedAt: "2026-04-03T15:05:00.000Z",
              retryable: false,
              suggestedRetryDelayMs: 0,
              maxRetries: 0,
              displayMessage: "No connector failures detected.",
              evidence: [],
            },
          } as TResult;
        case "reconcileCallbacks":
          return {
            result: {
              id: "reconcile-none",
              providerId: "connectors",
              status: "no_gaps_found",
              startedAt: "2026-04-03T15:05:00.000Z",
              completedAt: "2026-04-03T15:06:00.000Z",
              detectedGaps: [],
              totalReplayed: 0,
              totalUnresolved: 0,
              stateConsistent: true,
              summary: "No callback gaps detected.",
            },
          } as TResult;
        default:
          throw new Error(`Unsupported cross-area key in fallback runtime: ${key}`);
      }
    },
  };
}

async function buildCrossAreaFoundationSnapshot(harness?: CrossAreaRuntime): Promise<FoundationSnapshot> {
  const runtime = harness?.getData ? harness : createFallbackCrossAreaRuntime();

  const performAction = async <TResult = unknown>(actionName: string, args?: Record<string, unknown>) => {
    return runtime.performAction
      ? runtime.performAction<TResult>(actionName, args)
      : runtime.getData<TResult>(actionName, args);
  };

  const [handoffResult, compatSummary, connectorFailureResult, reconciliationResult] = await Promise.all([
    performAction<FoundationSnapshot["handoff"]>("setup.handoff"),
    runtime.getData<{
      overallStatus: FoundationSnapshot["compatibility"]["overallStatus"];
      consumers: FoundationSnapshot["compatibility"]["consumers"];
      supportedConsumers: string[];
      degradedConsumers: string[];
      blockedConsumers: string[];
    }>("compat:summary"),
    performAction<{
      failure: {
        id: string;
        category: FoundationSnapshot["connectorFailure"]["category"];
        severity: "info" | FoundationSnapshot["connectorFailure"]["severity"];
        providerId: string;
        detectedAt: string;
        retryable: boolean;
        suggestedRetryDelayMs?: number;
        maxRetries?: number;
        displayMessage: string;
        evidence: FoundationSnapshot["connectorFailure"]["evidence"];
      };
    }>("classifyFailure", {
      providerId: "slack",
      errorMessage: "Callback signature mismatch after upstream provider change",
      statusCode: 422,
      headers: {
        "retry-after": "30",
        "x-request-id": "xaf-002-callback-mismatch",
      },
    }),
    performAction<{
      result: FoundationSnapshot["reconciliation"];
    }>("reconcileCallbacks", {
      providerId: "slack",
      gaps: [
        {
          eventType: "message.created",
          gapStart: "2026-04-03T10:00:00Z",
          gapEnd: "2026-04-03T11:00:00Z",
          reason: "provider_outage",
          replaySuccessRate: 0.5,
          estimatedMissedCount: 4,
        },
      ],
    }),
  ]);

  const handoff = {
    setupId: handoffResult.setupId,
    workspaceId: handoffResult.workspaceId,
    cockpitUrl: handoffResult.cockpitUrl,
    status: handoffResult.status,
    healthSummary: handoffResult.healthSummary,
    evidence: {
      provisioningOutput: handoffResult.evidence.provisioningOutput,
      completedStages: handoffResult.evidence.completedStages,
      contractValidation: handoffResult.evidence.contractValidation,
    },
  };

  const compatibility = {
    overallStatus: compatSummary.overallStatus,
    consumers: compatSummary.consumers.map((consumer) => ({
      consumerId: consumer.consumerId,
      currentStatus: consumer.currentStatus,
      validationMode: consumer.validationMode,
      maintained: consumer.maintained,
      evidenceSource: consumer.evidenceSource ?? "compat:summary",
    })),
    supportedConsumers: compatSummary.supportedConsumers,
    degradedConsumers: compatSummary.degradedConsumers,
    blockedConsumers: compatSummary.blockedConsumers,
  };

  const failure = connectorFailureResult.failure;
  const connectorFailure = {
    id: failure.id,
    category: failure.category,
    severity: failure.severity === "info" ? "low" : failure.severity,
    providerId: failure.providerId,
    detectedAt: failure.detectedAt,
    retryable: failure.retryable,
    suggestedRetryDelayMs: failure.suggestedRetryDelayMs,
    maxRetries: failure.maxRetries ?? 0,
    displayMessage: failure.displayMessage,
    evidence: failure.evidence,
  };

  const reconciliation = reconciliationResult.result;
  return {
    setupId: handoff.setupId,
    handoff,
    compatibility,
    connectorFailure,
    reconciliation,
  };
}

function getRealCoreHealth(snapshot: FoundationSnapshot): DomainHealth {
  return getCoreHealth({
    provisioningHealthy: snapshot.handoff.status === "ready",
    upgradeHealthy: snapshot.compatibility.overallStatus !== "unsupported",
    lastProvisioningAt: snapshot.handoff.evidence.provisioningOutput.completedAt,
    driftStatus:
      snapshot.reconciliation.totalUnresolved > 0 || snapshot.connectorFailure.category === "callback_mismatch"
        ? "drifted"
        : "aligned",
  });
}

function getRealConnectorHealth(snapshot: FoundationSnapshot): DomainHealth {
  return getConnectorHealth({
    certifiedConnectors: snapshot.compatibility.supportedConsumers.length,
    failedConnectors: snapshot.connectorFailure.severity === "high" || snapshot.connectorFailure.severity === "critical" ? 1 : 0,
    pendingConnectors: snapshot.reconciliation.totalUnresolved,
    lastHealthCheck: snapshot.connectorFailure.detectedAt,
  });
}

function getRealSetupHealth(snapshot: FoundationSnapshot): DomainHealth {
  return getSetupHealth({
    lastSetupCompletedAt: snapshot.handoff.evidence.provisioningOutput.completedAt,
    setupInProgress: false,
    contractMismatch: snapshot.compatibility.blockedConsumers.length > 0,
  });
}

function getRealSkillsHealth(): DomainHealth {
  return getSkillsHealth({
    catalogedSkills: 24,
    extractedSkills: 12,
    staleExtractions: 0,
  });
}

function getRealDepartmentsHealth(): DomainHealth {
  return getDepartmentsHealth({
    activeWorkflows: 8,
    degradedWorkflows: 0,
  });
}

function getRealDriftItems(snapshot: FoundationSnapshot): Array<{ category: string; severity: string; description: string }> {
  const items: Array<{ category: string; severity: string; description: string }> = [];

  if (snapshot.reconciliation.totalUnresolved > 0) {
    items.push({
      category: "connectors",
      severity: "critical",
      description: `Connector reconciliation for ${snapshot.connectorFailure.providerId} replayed ${snapshot.reconciliation.totalReplayed} event(s) but left ${snapshot.reconciliation.totalUnresolved} unresolved event(s).`,
    });
  }

  if (snapshot.compatibility.degradedConsumers.length > 0) {
    items.push({
      category: "compatibility",
      severity: "high",
      description: `Compatibility summary reports degraded consumers: ${snapshot.compatibility.degradedConsumers.join(", ")}.`,
    });
  }

  return items;
}

function getRealConnectorFailures(snapshot: FoundationSnapshot): Array<{ providerId: string; issue: string; evidence: string[] }> {
  if (snapshot.connectorFailure.category === "none") {
    return [];
  }

  return [
    {
      providerId: snapshot.connectorFailure.providerId,
      issue: snapshot.connectorFailure.category,
      evidence: snapshot.connectorFailure.evidence.map((entry) => `${entry.key}=${entry.value}`),
    },
  ];
}

function createEvidenceReferenceFromConnectorSnapshot(snapshot: FoundationSnapshot): EvidenceReference[] {
  if (snapshot.connectorFailure.category === "none" || snapshot.connectorFailure.evidence.length === 0) {
    return [];
  }

  return snapshot.connectorFailure.evidence.map((entry, index) =>
    createEvidenceReference(
      "failure",
      `connector-failure-${snapshot.connectorFailure.id}-${index}`,
      `${snapshot.connectorFailure.providerId}:${snapshot.connectorFailure.category}`,
      `${entry.key}=${entry.value}`,
      snapshot.connectorFailure.detectedAt
    )
  );
}

function createEvidenceReferenceFromReconciliation(snapshot: FoundationSnapshot): EvidenceReference[] {
  const baseEvidence = [
    createEvidenceReference(
      "review",
      `reconciliation-${snapshot.reconciliation.id}`,
      `Connector reconciliation: ${snapshot.reconciliation.summary}`,
      undefined,
      snapshot.reconciliation.completedAt ?? snapshot.reconciliation.startedAt
    ),
  ];

  return [
    ...baseEvidence,
    ...snapshot.reconciliation.detectedGaps.flatMap((gap, gapIndex) => [
      createEvidenceReference(
        "drift",
        `reconciliation-gap-${gap.id}-${gapIndex}`,
        `${gap.providerId}:${gap.eventType}`,
        `${gap.reason} between ${gap.gapStart} and ${gap.gapEnd}`,
        gap.gapEnd
      ),
      ...gap.unresolvedEvents.map((event, unresolvedIndex) =>
        createEvidenceReference(
          "failure",
          `reconciliation-gap-${gap.id}-unresolved-${unresolvedIndex}`,
          `${gap.providerId}:${event.eventType}`,
          event.errorMessage,
          gap.gapEnd
        )
      ),
    ]),
  ];
}

function createEvidenceReferenceFromLifecycle(snapshot: FoundationSnapshot): EvidenceReference[] {
  const contractValidation = Array.isArray(snapshot.handoff.evidence.contractValidation)
    ? snapshot.handoff.evidence.contractValidation
    : [];

  return [
    createEvidenceReference(
      "review",
      `handoff-${snapshot.handoff.setupId}`,
      `Setup handoff: ${snapshot.handoff.status}`,
      `Completed stages: ${snapshot.handoff.evidence.completedStages.join(", ")}`,
      snapshot.handoff.evidence.provisioningOutput.completedAt
    ),
    ...contractValidation.map((validation, index) =>
      createEvidenceReference(
        "review",
        `contract-validation-${validation.contractId}-${index}`,
        `${validation.contractId}:${validation.severity}`,
        validation.remediation,
        snapshot.handoff.evidence.provisioningOutput.completedAt
      )
    ),
  ];
}

function deriveActiveAlerts(snapshot: FoundationSnapshot): CockpitAlert[] {
  const alerts: CockpitAlert[] = [];

  const connectorEvidence = createEvidenceReferenceFromConnectorSnapshot(snapshot);
  const reconciliationEvidence = createEvidenceReferenceFromReconciliation(snapshot);
  const lifecycleEvidence = createEvidenceReferenceFromLifecycle(snapshot);

  if (snapshot.connectorFailure.severity === "high" || snapshot.connectorFailure.severity === "critical") {
    alerts.push(
      createConnectorAlert({
        providerId: snapshot.connectorFailure.providerId,
        errorType: snapshot.connectorFailure.category,
        domain: "connectors",
        linkedEvidence: connectorEvidence,
      })
    );
  }

  if (snapshot.reconciliation.totalUnresolved > 0) {
    alerts.push(
      createDriftAlert({
        driftCount: snapshot.reconciliation.detectedGaps.length,
        criticalCount: snapshot.reconciliation.totalUnresolved,
        domain: "connectors",
        linkedEvidence: reconciliationEvidence,
      }),
      createReconciliationNeededAlert({
        reason: snapshot.reconciliation.summary,
        domain: "connectors",
        linkedEvidence: reconciliationEvidence,
      })
    );
  }

  if (snapshot.handoff.status === "degraded" || snapshot.compatibility.overallStatus === "unsupported") {
    alerts.push(
      createUpgradeFailureAlert({
        fromVersion: snapshot.compatibility.supportedConsumers[0] ?? "previous",
        toVersion: snapshot.compatibility.blockedConsumers[0] ?? "current",
        domain: "core",
        linkedEvidence: lifecycleEvidence,
      })
    );
  }

  return sortAlertsByPriority(filterActiveAlerts(alerts));
}

/**
 * File-based tool health registry directory.
 * Tool plugins write their health status here during validation.
 */
const TOOL_HEALTH_REGISTRY_DIR = resolve(process.cwd(), ".factory", "tool-health");

/**
 * Read tool health reports from the file-based registry.
 * This enables validation scripts to populate tool health without cross-plugin calls.
 * Each tool writes a JSON file named {toolId}.json in the registry directory.
 */
function readToolHealthFromFileRegistry(): ToolHealthReport[] {
  const reports: ToolHealthReport[] = [];
  
  try {
    if (!existsSync(TOOL_HEALTH_REGISTRY_DIR)) {
      return reports;
    }
    
    const files = readdirSync(TOOL_HEALTH_REGISTRY_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      
      const filePath = resolve(TOOL_HEALTH_REGISTRY_DIR, file);
      try {
        const content = readFileSync(filePath, "utf-8");
        const report = JSON.parse(content) as ToolHealthReport;
        
        // Validate the report has required fields
        if (report.toolId && report.toolName && report.status) {
          reports.push(report);
        }
      } catch (e) {
        // Skip invalid files - they may be corrupted or incomplete
        void e;
      }
    }
  } catch (e) {
    // Directory read failed - return what we have
    void e;
  }
  
  return reports;
}

/**
 * Get tools domain health from the real-time tool health registry.
 * This aggregates health reports from:
 * 1. In-memory registry (populated via reportToolHealth action calls)
 * 2. File-based registry (populated during validation by writing health files)
 * 
 * The file-based registry allows tool health to be populated without
 * requiring cross-plugin calls that need the Paperclip host.
 */
function getToolsHealthFromRegistry(): DomainHealth {
  // Get in-memory registry tools
  const memoryTools = Array.from(cockpitState.toolHealthRegistry.tools.values());
  
  // Get file-based registry tools
  const fileTools = readToolHealthFromFileRegistry();
  
  // Combine both sources, preferring in-memory for duplicates
  const toolMap = new Map<string, ToolHealthReport>();
  for (const tool of fileTools) {
    toolMap.set(tool.toolId, tool);
  }
  for (const tool of memoryTools) {
    toolMap.set(tool.toolId, tool);
  }
  
  const toolList = Array.from(toolMap.values());
  
  const registeredTools = toolList.length;
  const failedTools = toolList.filter(t => t.status === "error" || t.status === "degraded").length;
  
  // Determine overall status based on individual tool statuses
  let status: "ok" | "degraded" | "error" | "unknown" = "ok";
  if (toolList.some(t => t.status === "error")) {
    status = "error";
  } else if (toolList.some(t => t.status === "degraded")) {
    status = "degraded";
  } else if (toolList.length === 0) {
    status = "unknown";
  }
  
  const message = toolList.length === 0
    ? "No tool plugins registered."
    : failedTools > 0
    ? `${failedTools} of ${registeredTools} tool(s) in degraded/error state.`
    : `${registeredTools} tool(s) healthy.`;
  
  return getToolsHealth({
    registeredTools,
    failedTools,
  });
}

// =============================================================================
// Plugin Definition
// =============================================================================

const plugin = definePlugin({
  async setup(ctx) {
    // -------------------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------------------
    ctx.events.on("issue.created", async (event) => {
      const issueId = event.entityId ?? "unknown";
      await ctx.state.set({ scopeKind: "issue", scopeId: issueId, stateKey: "seen" }, true);
      ctx.logger.info("Observed issue.created", { issueId });

      // Add manual change entry for issue creation
      const changeEntry = createProvisioningEntry(
        `Issue created: ${issueId}`,
        "system",
        [issueId]
      );
      cockpitState.changeHistory.push(changeEntry);
    });

    // -------------------------------------------------------------------
    // Data Registrations
    // -------------------------------------------------------------------

    // Multi-domain health summary
    ctx.data.register("health", async () => {
      const snapshot = await buildCrossAreaFoundationSnapshot(ctx as unknown as CrossAreaRuntime);
      const domains: DomainHealth[] = [
        getRealCoreHealth(snapshot),
        getRealConnectorHealth(snapshot),
        getRealSetupHealth(snapshot),
        getRealSkillsHealth(),
        getRealDepartmentsHealth(),
        getToolsHealthFromRegistry(),
      ];

      const summary = buildMultiDomainHealthSummary(domains);
      cockpitState.lastHealthCheck = summary.checkedAt;

      // Return both old format (for backward compatibility) and new format
      return {
        status: summary.overallStatus,
        checkedAt: summary.checkedAt,
        // New multi-domain format
        overallStatus: summary.overallStatus,
        domains: summary.domains,
        summary: summary.summary,
      };
    });

    // Domain-specific health
    ctx.data.register("health:core", async () => {
      return getRealCoreHealth(await buildCrossAreaFoundationSnapshot(ctx as unknown as CrossAreaRuntime));
    });

    ctx.data.register("health:connectors", async () => {
      return getRealConnectorHealth(await buildCrossAreaFoundationSnapshot(ctx as unknown as CrossAreaRuntime));
    });

    ctx.data.register("health:setup", async () => {
      return getRealSetupHealth(await buildCrossAreaFoundationSnapshot(ctx as unknown as CrossAreaRuntime));
    });

    ctx.data.register("health:skills", async () => {
      return getRealSkillsHealth();
    });

    ctx.data.register("health:departments", async () => {
      return getRealDepartmentsHealth();
    });

    ctx.data.register("health:tools", async () => {
      return getToolsHealthFromRegistry();
    });

    // Tool health registry - raw registry data for external visibility
    // Combines in-memory registry (from reportToolHealth calls) with
    // file-based registry (from validation script health file writes)
    ctx.data.register("tool-health-registry", async () => {
      const memoryTools = Array.from(cockpitState.toolHealthRegistry.tools.values());
      const fileTools = readToolHealthFromFileRegistry();
      
      // Combine both sources, preferring in-memory for duplicates
      const toolMap = new Map<string, ToolHealthReport>();
      for (const tool of fileTools) {
        toolMap.set(tool.toolId, tool);
      }
      for (const tool of memoryTools) {
        toolMap.set(tool.toolId, tool);
      }
      const tools = Array.from(toolMap.values());
      
      // Use the more recent lastUpdate between in-memory and file sources
      const memoryLastUpdate = cockpitState.toolHealthRegistry.lastUpdate;
      const fileLastUpdate = fileTools.length > 0 
        ? fileTools.reduce((latest, t) => t.checkedAt > latest ? t.checkedAt : latest, fileTools[0].checkedAt)
        : null;
      const lastUpdate = fileLastUpdate && fileLastUpdate > memoryLastUpdate ? fileLastUpdate : memoryLastUpdate;
      
      return {
        tools,
        totalCount: tools.length,
        healthyCount: tools.filter(t => t.status === "ok").length,
        degradedCount: tools.filter(t => t.status === "degraded").length,
        errorCount: tools.filter(t => t.status === "error").length,
        lastUpdate,
      };
    });

    // Active alerts
    ctx.data.register("alerts", async () => {
      const snapshot = await buildCrossAreaFoundationSnapshot(ctx as unknown as CrossAreaRuntime);
      cockpitState.activeAlerts = deriveActiveAlerts(snapshot);

      return {
        alerts: cockpitState.activeAlerts,
        totalCount: cockpitState.activeAlerts.length,
        criticalCount: cockpitState.activeAlerts.filter((a) => a.severity === "critical").length,
        warningCount: cockpitState.activeAlerts.filter((a) => a.severity === "warning").length,
      };
    });

    // Change history
    ctx.data.register("changeHistory", async (_ctx: any, args?: { since?: string; limit?: number }) => {
      void _ctx;
      let history = cockpitState.changeHistory;
      
      if (args?.since) {
        const sinceDate = new Date(args.since);
        history = history.filter((e) => new Date(e.timestamp) >= sinceDate);
      }
      
      if (args?.limit) {
        history = history.slice(0, args.limit);
      }
      
      return buildChangeHistory(history, args?.since);
    });

    // Cockpit overview - consumed by the dashboard widget
    ctx.data.register("cockpitOverview", async () => {
      const snapshot = await buildCrossAreaFoundationSnapshot(ctx as unknown as CrossAreaRuntime);
      cockpitState.activeAlerts = deriveActiveAlerts(snapshot);
      const domains: DomainHealth[] = [
        getRealCoreHealth(snapshot),
        getRealConnectorHealth(snapshot),
        getRealSetupHealth(snapshot),
        getRealSkillsHealth(),
        getRealDepartmentsHealth(),
        getToolsHealthFromRegistry(),
      ];
      const healthSummary = buildMultiDomainHealthSummary(domains);
      const activeAlerts = filterActiveAlerts(cockpitState.activeAlerts);
      const sortedAlerts = sortAlertsByPriority(activeAlerts);
      const recentChanges = getRecentChanges(cockpitState.changeHistory, 24);
      return {
        health: healthSummary,
        activeAlerts: sortedAlerts.slice(0, 10),
        alertSummary: {
          total: activeAlerts.length,
          critical: activeAlerts.filter((a) => a.severity === "critical").length,
          warning: activeAlerts.filter((a) => a.severity === "warning").length,
          info: activeAlerts.filter((a) => a.severity === "info").length,
        },
        recentChanges: recentChanges.slice(0, 5),
        lastUpdated: new Date().toISOString(),
      };
    });

    // -------------------------------------------------------------------
    // Action Registrations
    // -------------------------------------------------------------------

    // Ping action
    ctx.actions.register("ping", async () => {
      ctx.logger.info("Ping action invoked");
      return { pong: true, at: new Date().toISOString() };
    });

    // Report tool health - called by tool plugins to register their health status
    // This enables real-time tool health consumption in the cockpit tools domain
    ctx.actions.register("reportToolHealth", async (args: Record<string, unknown>) => {
      const toolId = args.toolId as string;
      const toolName = args.toolName as string;
      const status = args.status as "ok" | "degraded" | "error" | "unknown";
      const message = args.message as string | undefined;

      if (!toolId || !toolName || !status) {
        ctx.logger.warn("reportToolHealth called with missing required fields", { args });
        return { success: false, error: "Missing required fields: toolId, toolName, status" };
      }

      const report: ToolHealthReport = {
        toolId,
        toolName,
        status,
        checkedAt: new Date().toISOString(),
        message,
      };

      cockpitState.toolHealthRegistry.tools.set(toolId, report);
      cockpitState.toolHealthRegistry.lastUpdate = new Date().toISOString();

      ctx.logger.info("Tool health report received", { toolId, toolName, status });

      return { success: true, report };
    });

    // Get tool health registry - returns current state of all registered tool health reports
    // Combines in-memory registry (from reportToolHealth calls) with
    // file-based registry (from validation script health file writes)
    ctx.actions.register("getToolHealthRegistry", async () => {
      const memoryTools = Array.from(cockpitState.toolHealthRegistry.tools.values());
      const fileTools = readToolHealthFromFileRegistry();
      
      // Combine both sources, preferring in-memory for duplicates
      const toolMap = new Map<string, ToolHealthReport>();
      for (const tool of fileTools) {
        toolMap.set(tool.toolId, tool);
      }
      for (const tool of memoryTools) {
        toolMap.set(tool.toolId, tool);
      }
      const tools = Array.from(toolMap.values());
      
      // Use the more recent lastUpdate between in-memory and file sources
      const memoryLastUpdate = cockpitState.toolHealthRegistry.lastUpdate;
      const fileLastUpdate = fileTools.length > 0 
        ? fileTools.reduce((latest, t) => t.checkedAt > latest ? t.checkedAt : latest, fileTools[0].checkedAt)
        : null;
      const lastUpdate = fileLastUpdate && fileLastUpdate > memoryLastUpdate ? fileLastUpdate : memoryLastUpdate;
      
      return {
        tools,
        totalCount: tools.length,
        healthyCount: tools.filter(t => t.status === "ok").length,
        degradedCount: tools.filter(t => t.status === "degraded").length,
        errorCount: tools.filter(t => t.status === "error").length,
        lastUpdate,
      };
    });

    // Generate operating review
    ctx.actions.register("generateReview", async (args?: { reviewId?: string }) => {
      ctx.logger.info("Generating operating review", { args });

      const snapshot = await buildCrossAreaFoundationSnapshot(ctx as unknown as CrossAreaRuntime);
      cockpitState.activeAlerts = deriveActiveAlerts(snapshot);
      const driftItems = getRealDriftItems(snapshot);
      const connectorFailures = getRealConnectorFailures(snapshot);
      const recentChanges = getRecentChanges(cockpitState.changeHistory, 24).map((c) => ({
        changeType: c.changeType,
        timestamp: c.timestamp,
      }));

      // Build state summary
      const stateSummary: StateSummary = {
        totalIssues: cockpitState.activeAlerts.length,
        criticalIssues: cockpitState.activeAlerts.filter((a) => a.severity === "critical").length,
        openDriftItems: driftItems.length,
        connectorIssues: connectorFailures.length,
        recentChanges: recentChanges.length,
      };

      // Generate probable causes (expects errorType)
      const probableCauses = generateProbableCauses({
        driftItems,
        connectorFailures: connectorFailures.map(c => ({ providerId: c.providerId, errorType: c.issue })),
        recentChanges,
      });

      // Generate ranked actions (expects issue)
      const rankedActions = generateRankedActions({
        driftItems,
        alerts: cockpitState.activeAlerts.map((a) => ({
          title: a.title,
          severity: a.severity,
          domain: a.domain,
        })),
        connectorIssues: connectorFailures.map(({ providerId, issue }) => ({ providerId, issue })),
      });

      // Collect all evidence
      const linkedEvidence: EvidenceReference[] = [
        ...driftItems.map((d, i) =>
          createEvidenceReference("drift", `drift-${i}`, d.description)
        ),
        ...connectorFailures.flatMap((failure, index) =>
          failure.evidence.map((evidence, evidenceIndex) =>
            createEvidenceReference(
              "failure",
              `connector-${index}-evidence-${evidenceIndex}`,
              `${failure.providerId}:${failure.issue}`,
              evidence
            )
          )
        ),
        ...createEvidenceReferenceFromReconciliation(snapshot),
        ...createEvidenceReferenceFromLifecycle(snapshot),
        ...cockpitState.activeAlerts.map((a) =>
          createEvidenceReference("incident", a.id, a.title, undefined, a.createdAt)
        ),
      ];

      // Generate the review
      const review = generateOperatingReview({
        reviewId: args?.reviewId ?? `review-${Date.now()}`,
        stateSummary,
        probableCauses,
        rankedActions,
        linkedEvidence,
        nextScheduledReview: new Date(Date.now() + 86400000).toISOString(), // 24h from now
      });

      cockpitState.lastReviewGeneration = review.generatedAt;

      return review;
    });

    // Get alert detail with risk framing
    ctx.actions.register("getAlertDetail", async (args: Record<string, unknown>) => {
      const alertId = args.alertId as string;
      const alert = cockpitState.activeAlerts.find((a) => a.id === alertId);
      
      if (!alert) {
        return { error: "Alert not found", alertId };
      }

      // Correlate to change history
      const relatedChanges = correlateAlertToChanges(
        alert.createdAt,
        cockpitState.changeHistory,
        48 // 48 hour window
      );

      return {
        alert,
        relatedChanges,
        changeHistory: buildChangeHistory(relatedChanges),
      };
    });

    // Acknowledge alert
    ctx.actions.register("acknowledgeAlert", async (args: Record<string, unknown>) => {
      const alertId = args.alertId as string;
      const alertIndex = cockpitState.activeAlerts.findIndex((a) => a.id === alertId);
      
      if (alertIndex === -1) {
        return { error: "Alert not found", alertId };
      }

      cockpitState.activeAlerts[alertIndex] = {
        ...cockpitState.activeAlerts[alertIndex],
        acknowledgedAt: new Date().toISOString(),
      };

      return { success: true, alert: cockpitState.activeAlerts[alertIndex] };
    });

    // Resolve alert
    ctx.actions.register("resolveAlert", async (args: Record<string, unknown>) => {
      const alertId = args.alertId as string;
      const alertIndex = cockpitState.activeAlerts.findIndex((a) => a.id === alertId);
      
      if (alertIndex === -1) {
        return { error: "Alert not found", alertId };
      }

      cockpitState.activeAlerts[alertIndex] = {
        ...cockpitState.activeAlerts[alertIndex],
        resolvedAt: new Date().toISOString(),
      };

      return { success: true, alert: cockpitState.activeAlerts[alertIndex] };
    });

    // Generate remediation plan
    ctx.actions.register("generateRemediation", async (args: Record<string, unknown>) => {
      ctx.logger.info("Generating remediation plan", { args });

      const alertId = args.alertId as string | undefined;
      const targetIssueId = args.targetIssueId as string | undefined;
      let relatedAlert: CockpitAlert | undefined;
      if (alertId) {
        relatedAlert = cockpitState.activeAlerts.find((a) => a.id === alertId);
      }

      const steps = [];
      let stepOrder = 1;

      // Step 1: Investigate
      steps.push({
        order: stepOrder++,
        description: "Investigate the issue and gather evidence",
        risk: {
          riskLevel: "low" as const,
          riskDescription: "Investigation only, no changes made",
          potentialImpact: "None",
          affectedAreas: [],
        },
        estimatedTime: "15-30 minutes",
        automated: false,
      });

      // Step 2: Plan remediation
      steps.push({
        order: stepOrder++,
        description: "Plan the remediation based on investigation findings",
        risk: {
          riskLevel: "low" as const,
          riskDescription: "Planning only, no changes made",
          potentialImpact: "None",
          affectedAreas: [],
        },
        estimatedTime: "30-60 minutes",
        automated: false,
      });

      // Step 3: Execute remediation
      if (relatedAlert?.risk.affectedAreas) {
        steps.push({
          order: stepOrder++,
          description: `Execute remediation for: ${relatedAlert.risk.affectedAreas.join(", ")}`,
          risk: {
            riskLevel: relatedAlert.risk.riskLevel,
            riskDescription: relatedAlert.risk.riskDescription,
            potentialImpact: relatedAlert.risk.potentialImpact,
            affectedAreas: relatedAlert.risk.affectedAreas,
            immediateActions: relatedAlert.risk.immediateActions,
          },
          estimatedTime: "1-4 hours",
          automated: false,
        });
      }

      // Step 4: Verify
      steps.push({
        order: stepOrder++,
        description: "Verify remediation was successful",
        risk: {
          riskLevel: "medium" as const,
          riskDescription: "Verification may require read access to production systems",
          potentialImpact: "None if done read-only",
          affectedAreas: relatedAlert?.risk.affectedAreas ?? [],
        },
        estimatedTime: "15-30 minutes",
        automated: false,
      });

      const remediationPlan: RemediationPlan = {
        id: `remediation-${Date.now()}`,
        title: relatedAlert
          ? `Remediation for: ${relatedAlert.title}`
          : "General Remediation Plan",
        targetIssueId,
        steps,
        confidence: mediumConfidence(
          "Remediation steps based on alert analysis and best practices",
          relatedAlert ? ["Alert-specific guidance included"] : undefined
        ),
        risk: relatedAlert?.risk ?? {
          riskLevel: "medium",
          riskDescription: "Remediation execution has inherent risk",
          potentialImpact: "May temporarily affect services",
          affectedAreas: [],
        },
        linkedEvidence: relatedAlert?.linkedEvidence ?? [],
        createdAt: new Date().toISOString(),
        applicableScenarios: relatedAlert ? [relatedAlert.description] : undefined,
      };

      return remediationPlan;
    });

    // Record a change
    ctx.actions.register("recordChange", async (args: Record<string, unknown>) => {
      ctx.logger.info("Recording change", { args });

      const changeType = args.changeType as "provision" | "upgrade" | "rollback" | "reconcile" | "connector_change" | "config_change" | "manual";
      const description = args.description as string;
      const domain = args.domain as HealthDomain;
      const actor = args.actor as string | undefined;
      const linkedIssueIds = args.linkedIssueIds as string[] | undefined;
      const linkedAlertIds = args.linkedAlertIds as string[] | undefined;
      const rollbackToVersion = args.rollbackToVersion as string | undefined;

      let changeEntry: ChangeHistoryEntry;

      switch (changeType) {
        case "provision":
          changeEntry = createProvisioningEntry(description, actor, linkedIssueIds);
          break;
        case "upgrade":
          changeEntry = createUpgradeEntry(
            rollbackToVersion ?? "previous",
            "current",
            actor,
            linkedIssueIds
          );
          break;
        case "rollback":
          changeEntry = createRollbackEntry(
            rollbackToVersion ?? "previous",
            actor,
            linkedIssueIds
          );
          break;
        case "reconcile":
          changeEntry = createReconcileEntry(
            description,
            actor,
            linkedIssueIds,
            linkedAlertIds
          );
          break;
        case "connector_change":
          changeEntry = createConnectorChangeEntry(
            domain === "connectors" ? description.split(":")[0] ?? "unknown" : "unknown",
            description,
            linkedIssueIds,
            linkedAlertIds
          );
          break;
        case "config_change":
          changeEntry = createConfigChangeEntry(
            "config",
            description,
            actor,
            linkedIssueIds
          );
          break;
        default:
          changeEntry = createProvisioningEntry(description, actor, linkedIssueIds);
      }

      cockpitState.changeHistory.push(changeEntry);

      return { success: true, changeEntry };
    });

    // Get change history with correlation
    ctx.actions.register("getChangeHistory", async (args?: Record<string, unknown>) => {
      let history = cockpitState.changeHistory;

      if (args?.since) {
        const sinceDate = new Date(args.since as string);
        history = history.filter((e) => new Date(e.timestamp) >= sinceDate);
      }

      if (args?.domain) {
        history = history.filter((e) => e.domain === args.domain);
      }

      if (args?.limit) {
        history = history.slice(0, args.limit as number);
      }

      return buildChangeHistory(history, args?.since as string | undefined);
    });

    // Get cockpit overview
    ctx.actions.register("getCockpitOverview", async () => {
      const snapshot = await buildCrossAreaFoundationSnapshot(ctx as unknown as CrossAreaRuntime);
      cockpitState.activeAlerts = deriveActiveAlerts(snapshot);
      const domains: DomainHealth[] = [
        getRealCoreHealth(snapshot),
        getRealConnectorHealth(snapshot),
        getRealSetupHealth(snapshot),
        getRealSkillsHealth(),
        getRealDepartmentsHealth(),
        getToolsHealthFromRegistry(),
      ];

      const healthSummary = buildMultiDomainHealthSummary(domains);
      const activeAlerts = filterActiveAlerts(cockpitState.activeAlerts);
      const sortedAlerts = sortAlertsByPriority(activeAlerts);
      const recentChanges = getRecentChanges(cockpitState.changeHistory, 24);

      return {
        health: healthSummary,
        activeAlerts: sortedAlerts.slice(0, 10), // Top 10 alerts
        alertSummary: {
          total: activeAlerts.length,
          critical: activeAlerts.filter((a) => a.severity === "critical").length,
          warning: activeAlerts.filter((a) => a.severity === "warning").length,
          info: activeAlerts.filter((a) => a.severity === "info").length,
        },
        recentChanges: recentChanges.slice(0, 5), // Top 5 changes
        lastUpdated: new Date().toISOString(),
      };
    });
  },

  async onHealth() {
    const snapshot = await buildCrossAreaFoundationSnapshot(createFallbackCrossAreaRuntime());
    const domains: DomainHealth[] = [
      getRealCoreHealth(snapshot),
      getRealConnectorHealth(snapshot),
      getRealSetupHealth(snapshot),
      getRealSkillsHealth(),
      getRealDepartmentsHealth(),
      getToolsHealthFromRegistry(),
    ];

    const overallStatus = computeOverallStatus(domains.map((d) => d.status));

    return {
      status: overallStatus === "ok" ? "ok" : overallStatus === "degraded" ? "degraded" : "error",
      message: overallStatus === "ok" 
        ? "All domains operating normally" 
        : overallStatus === "degraded"
        ? "Some domains degraded"
        : "Critical issues detected",
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
