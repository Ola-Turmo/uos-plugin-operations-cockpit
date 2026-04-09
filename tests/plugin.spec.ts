import { describe, expect, it } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk/testing";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

describe("plugin scaffold", () => {
  it("registers data, actions, and event handling", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    await harness.emit("issue.created", { issueId: "iss_1" }, { entityId: "iss_1", entityType: "issue" });
    expect(harness.getState({ scopeKind: "issue", scopeId: "iss_1", stateKey: "seen" })).toBe(true);

    const data = await harness.getData<{ status: string; checkedAt: string }>("health");
    expect(["ok", "degraded", "error"]).toContain(data.status);

    const action = await harness.performAction<{ pong: boolean; at: string }>("ping");
    expect(action.pong).toBe(true);
  });

  it("registers multi-domain health data", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const health = await harness.getData<{
      overallStatus: string;
      domains: Array<{ domain: string; status: string }>;
      summary: string;
    }>("health");

    expect(health.overallStatus).toBeDefined();
    expect(health.domains).toBeDefined();
    expect(health.domains.length).toBeGreaterThan(0);
    expect(health.summary).toBeDefined();
  });

  it("registers domain-specific health endpoints", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const coreHealth = await harness.getData<{ domain: string; status: string }>("health:core");
    expect(coreHealth.domain).toBe("core");

    const connectorHealth = await harness.getData<{ domain: string; status: string }>("health:connectors");
    expect(connectorHealth.domain).toBe("connectors");
  });

  it("registers alerts data endpoint", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const alertsData = await harness.getData<{
      alerts: unknown[];
      totalCount: number;
      criticalCount: number;
      warningCount: number;
    }>("alerts");

    expect(alertsData.alerts).toBeDefined();
    expect(alertsData.totalCount).toBeGreaterThan(0);
    expect(alertsData.alerts.some((alert: any) => alert.domain === "connectors")).toBe(true);
    expect(typeof alertsData.totalCount).toBe("number");
    expect(typeof alertsData.criticalCount).toBe("number");
    expect(typeof alertsData.warningCount).toBe("number");
  });

  it("registers change history data endpoint", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const history = await harness.getData<{
      entries: unknown[];
      totalCount: number;
    }>("changeHistory");

    expect(history.entries).toBeDefined();
    expect(typeof history.totalCount).toBe("number");
  });

  it("registers generateReview action", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const review = await harness.performAction<{
      id: string;
      title: string;
      stateSummary: {
        totalIssues: number;
        criticalIssues: number;
        openDriftItems: number;
        connectorIssues: number;
      };
      probableCauses: unknown[];
      rankedActions: unknown[];
      overallConfidence: { level: string };
      linkedEvidence: Array<{ title: string; description?: string }>;
    }>("generateReview", { reviewId: "test-review" });

    expect(review.id).toBe("test-review");
    expect(review.title).toContain("Operating Review");
    expect(review.stateSummary).toBeDefined();
    expect(review.probableCauses).toBeDefined();
    expect(review.rankedActions).toBeDefined();
    expect(["high", "medium", "low"]).toContain(review.overallConfidence.level);
    expect(review.stateSummary.openDriftItems).toBeGreaterThan(0);
    expect(review.stateSummary.connectorIssues).toBeGreaterThan(0);
    expect(review.linkedEvidence.length).toBeGreaterThan(0);
    expect(review.linkedEvidence.some((e: any) => e.label?.includes("slack:callback_mismatch"))).toBe(true);
    expect(review.linkedEvidence.some((e: any) => e.label?.includes("slack:callback_mismatch"))).toBe(true);
    expect(review.linkedEvidence.some((e: any) => e.label?.includes("Connector reconciliation"))).toBe(true);
  });

  it("registers getCockpitOverview action", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const overview = await harness.performAction<{
      health: { overallStatus: string; domains: Array<{ domain: string; status: string; message?: string }> };
      activeAlerts: unknown[];
      alertSummary: { total: number; critical: number; warning: number; info: number };
      recentChanges: unknown[];
      lastUpdated: string;
    }>("getCockpitOverview");

    expect(overview.health).toBeDefined();
    expect(overview.health.overallStatus).toBeDefined();
    expect(overview.activeAlerts).toBeDefined();
    expect(overview.alertSummary).toBeDefined();
    expect(overview.alertSummary.total).toBeGreaterThanOrEqual(0);
    expect(overview.recentChanges).toBeDefined();
    expect(overview.lastUpdated).toBeDefined();
    expect(overview.health.domains.some((domain: any) => domain.domain === "setup" && domain.message?.includes("Last setup completed"))).toBe(true);
    expect(overview.health.domains.some((domain: any) => domain.domain === "connectors" && domain.status !== "ok")).toBe(true);
    expect(overview.health.domains.some((domain: any) => domain.domain === "setup" && domain.message?.includes("contract"))).toBe(false);
    expect(overview.activeAlerts.length).toBeGreaterThan(0);
    expect(overview.recentChanges.length).toBeGreaterThanOrEqual(0);
  });

  it("produces evidence-backed cross-area review data rather than empty mock output", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const review = await harness.performAction<any>("generateReview", { reviewId: "cross-area-review" });
    const overview = await harness.performAction<any>("getCockpitOverview");

    expect(review.stateSummary.openDriftItems).toBeGreaterThan(0);
    expect(review.stateSummary.connectorIssues).toBeGreaterThan(0);
    expect(review.linkedEvidence.some((e: any) => e.label?.includes("slack:callback_mismatch"))).toBe(true);
    expect(review.linkedEvidence.some((e: any) => e.label?.includes("Connector reconciliation"))).toBe(true);
    expect(overview.health.domains.some((domain: any) => domain.domain === "setup")).toBe(true);
    expect(overview.health.domains.some((domain: any) => domain.domain === "connectors" && ["degraded", "error"].includes(domain.status))).toBe(true);
    expect(overview.activeAlerts.length).toBeGreaterThan(0);
  });

  it("consumes upstream setup, compat, and connector producer outputs for cross-area state", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const review = await harness.performAction<any>("generateReview", { reviewId: "producer-consumption-review" });
    const overview = await harness.performAction<any>("getCockpitOverview");

    expect(overview.health.domains.some((domain: any) => domain.domain === "setup" && domain.message?.includes("Last setup completed"))).toBe(true);
    expect(review.linkedEvidence.some((e: any) => e.label?.includes("Connector reconciliation"))).toBe(true);
    expect(review.linkedEvidence.some((e: any) => e.label?.includes("slack:callback_mismatch"))).toBe(true);
    expect(review.stateSummary.openDriftItems).toBeGreaterThan(0);
    expect(review.stateSummary.connectorIssues).toBeGreaterThan(0);
  });


  it("consumes producer data through harness surfaces without sibling source imports", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const review = await harness.performAction<any>("generateReview", { reviewId: "runtime-wiring-review" });
    const overview = await harness.performAction<any>("getCockpitOverview");

    expect(review.linkedEvidence.some((entry: any) => entry.label?.includes("slack:callback_mismatch"))).toBe(true);
    expect(review.linkedEvidence.some((entry: any) => entry.label?.includes("Connector reconciliation"))).toBe(true);
    expect(overview.health.domains.some((domain: any) => domain.domain === "setup" && domain.message?.includes("Last setup completed"))).toBe(true);
    expect(overview.health.domains.some((domain: any) => domain.domain === "connectors" && ["degraded", "error"].includes(domain.status))).toBe(true);
    expect(review.stateSummary.openDriftItems).toBeGreaterThan(0);
  });

  it("produces non-empty real alerts from connector failures and reconciliation drift", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const alertsData = await harness.getData<any>("alerts");
    const overview = await harness.performAction<any>("getCockpitOverview");

    expect(alertsData.totalCount).toBeGreaterThan(0);
    expect(alertsData.alerts.some((alert: any) => alert.title.includes("Connector Issue"))).toBe(true);
    expect(alertsData.alerts.some((alert: any) => alert.title.includes("Drift"))).toBe(true);
    expect(overview.alertSummary.total).toBeGreaterThan(0);
  });

  it("produces lifecycle-backed alerts when setup handoff is degraded", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    (harness.ctx as any).getData = async (key: string) => {
      if (key === "setup.handoff") {
        return {
          setupId: "setup_degraded",
          workspaceId: "workspace_degraded",
          cockpitUrl: "http://localhost:3102/cockpit/workspace_degraded",
          status: "degraded",
          healthSummary: { core: "error", connectors: "error", setup: "degraded" },
          evidence: {
            provisioningOutput: {
              setupId: "setup_degraded",
              completedAt: "2026-04-04T00:00:00.000Z",
              stages: [{ id: "upgrade", name: "Upgrade", status: "failed", duration: 45 }],
            },
            completedStages: ["preflight", "upgrade"],
            contractValidation: [
              {
                contractId: "core.lifecycle",
                expectedVersion: "2.0.0",
                actualVersion: "1.9.0",
                severity: "blocking",
                affectedSurface: "cockpit",
                remediation: "Rollback to supported lifecycle version.",
              },
            ],
          },
        };
      }

      if (key === "compat:summary") {
        return {
          overallStatus: "unsupported",
          consumers: [],
          supportedConsumers: [],
          degradedConsumers: [],
          blockedConsumers: ["uos-plugin-operations-cockpit"],
        };
      }

      if (key === "classifyFailure") {
        return {
          failure: {
            id: "failure-low",
            category: "auth_expired",
            severity: "medium",
            providerId: "slack",
            detectedAt: "2026-04-04T00:05:00.000Z",
            retryable: false,
            maxRetries: 0,
            displayMessage: "Auth expired",
            evidence: [],
          },
        };
      }

      if (key === "reconcileCallbacks") {
        return {
          result: {
            id: "reconcile-none",
            providerId: "slack",
            status: "idle",
            startedAt: "2026-04-04T00:05:00.000Z",
            detectedGaps: [],
            totalReplayed: 0,
            totalUnresolved: 0,
            stateConsistent: true,
            summary: "No reconciliation needed.",
          },
        };
      }

      throw new Error(`Unexpected key: ${key}`);
    };

    const alertsData = await harness.getData<any>("alerts");
    expect(alertsData.alerts.some((alert: any) => alert.title === "Upgrade Failed" && alert.domain === "core")).toBe(true);
  });

  it("registers acknowledgeAlert action", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    // First get an alert to acknowledge - since there are none initially, this tests the error path
    const alertsData = await harness.getData<{ alerts: Array<{ id: string }> }>("alerts");
    if (alertsData.alerts.length > 0) {
      const alertId = alertsData.alerts[0].id;
      const result = await harness.performAction<{ success: boolean; alert: { acknowledgedAt: string } }>("acknowledgeAlert", { alertId });
      expect(result.success).toBe(true);
      expect(result.alert.acknowledgedAt).toBeDefined();
    } else {
      // Test error path when alert not found
      const result = await harness.performAction<{ error: string }>("acknowledgeAlert", { alertId: "nonexistent" });
      expect(result.error).toBe("Alert not found");
    }
  });

  it("registers resolveAlert action", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    // First get an alert to resolve - since there are none initially, this tests the error path
    const alertsData = await harness.getData<{ alerts: Array<{ id: string }> }>("alerts");
    if (alertsData.alerts.length > 0) {
      const alertId = alertsData.alerts[0].id;
      const result = await harness.performAction<{ success: boolean; alert: { resolvedAt: string } }>("resolveAlert", { alertId });
      expect(result.success).toBe(true);
      expect(result.alert.resolvedAt).toBeDefined();
    } else {
      // Test error path when alert not found
      const result = await harness.performAction<{ error: string }>("resolveAlert", { alertId: "nonexistent" });
      expect(result.error).toBe("Alert not found");
    }
  });

  it("registers generateRemediation action", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const remediation = await harness.performAction<{
      id: string;
      title: string;
      steps: Array<{
        order: number;
        description: string;
        risk: { riskLevel: string };
      }>;
      confidence: { level: string };
      risk: { riskLevel: string };
    }>("generateRemediation", { alertId: "test-alert" });

    expect(remediation.id).toBeDefined();
    expect(remediation.title).toContain("Remediation");
    expect(remediation.steps).toBeDefined();
    expect(remediation.steps.length).toBeGreaterThan(0);
    expect(remediation.steps[0].order).toBe(1);
    expect(["high", "medium", "low", "critical"]).toContain(remediation.risk.riskLevel);
  });

  it("registers recordChange action", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const result = await harness.performAction<{ success: boolean; changeEntry: { id: string } }>("recordChange", {
      changeType: "manual",
      description: "Test manual change",
      domain: "core",
      actor: "test-user",
    });

    expect(result.success).toBe(true);
    expect(result.changeEntry.id).toBeDefined();
  });

  it("registers getChangeHistory action", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const history = await harness.performAction<{
      entries: unknown[];
      totalCount: number;
    }>("getChangeHistory", { limit: 10 });

    expect(history.entries).toBeDefined();
    expect(typeof history.totalCount).toBe("number");
  });

  it("onHealth reflects overall system status", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    const health = await plugin.definition.onHealth?.();
    if (health) {
      expect(["ok", "degraded", "error"]).toContain(health.status);
      expect(health.message).toBeDefined();
    }
  });

  it("registers reportToolHealth action", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    // Use unique tool ID with timestamp to avoid state conflict with other tests
    const toolId = `test-tool-action-${Date.now()}`;
    const result = await harness.performAction<{ success: boolean; report: { toolId: string; status: string } }>("reportToolHealth", {
      toolId,
      toolName: "Test Tool",
      status: "ok",
    });

    expect(result.success).toBe(true);
    expect(result.report.toolId).toBe(toolId);
    expect(result.report.status).toBe("ok");
  });

  it("registers getToolHealthRegistry action", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    // First register a tool health with unique ID
    const toolId = `test-tool-registry-${Date.now()}`;
    await harness.performAction("reportToolHealth", {
      toolId,
      toolName: "Test Tool Registry",
      status: "ok",
    });

    const result = await harness.performAction<{
      tools: Array<{ toolId: string; status: string }>;
      totalCount: number;
      healthyCount: number;
      lastUpdate: string;
    }>("getToolHealthRegistry");

    expect(result.totalCount).toBeGreaterThanOrEqual(1);
    expect(result.healthyCount).toBeGreaterThanOrEqual(1);
    expect(result.tools.length).toBeGreaterThanOrEqual(1);
    expect(result.lastUpdate).toBeDefined();
  });

  it("registers tool-health-registry data endpoint", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    // Register a tool health first with unique ID
    const toolId = `test-tool-reg-${Date.now()}`;
    await harness.performAction("reportToolHealth", {
      toolId,
      toolName: "Test Tool Registry Data",
      status: "degraded",
      message: "Running low on memory",
    });

    const result = await harness.getData<{
      tools: Array<{ toolId: string; status: string; message?: string }>;
      totalCount: number;
      degradedCount: number;
      lastUpdate: string;
    }>("tool-health-registry");

    expect(result.totalCount).toBeGreaterThanOrEqual(1);
    expect(result.degradedCount).toBeGreaterThanOrEqual(1);
    expect(result.tools.some((t: any) => t.toolId === toolId)).toBe(true);
  });

  it("health:tools reflects registered tool health", async () => {
    const harness = createTestHarness({ manifest, capabilities: [...manifest.capabilities, "events.emit"] });
    await plugin.definition.setup(harness.ctx);

    // Register a tool health with unique ID and ok status
    const toolId = `test-tool-health-${Date.now()}`;
    await harness.performAction("reportToolHealth", {
      toolId,
      toolName: "Test Tool Health",
      status: "ok",
    });

    const result = await harness.getData<{
      domain: string;
      status: string;
      metrics?: { registered: number; failed: number };
    }>("health:tools");

    expect(result.domain).toBe("tools");
    // Status could be ok or degraded depending on other tests' state, so check metrics
    expect(result.metrics?.registered).toBeGreaterThanOrEqual(1);
  });
});
