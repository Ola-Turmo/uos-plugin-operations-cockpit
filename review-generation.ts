/**
 * Evidence-Backed Review Generation Module
 * 
 * Generates operating reviews with state summaries, probable causes,
 * ranked actions, and confidence labels.
 */

import type {
  ConfidenceLabel,
  ConfidenceLevel,
  EvidenceBackedReview,
  EvidenceReference,
  ProbableCause,
  RankedAction,
  RiskFraming,
  StateSummary,
} from "./types.js";

/**
 * Create a confidence label for a recommendation or cause.
 */
export function createConfidenceLabel(
  level: ConfidenceLevel,
  description: string,
  evidenceStrength: "strong" | "moderate" | "weak",
  caveats?: string[]
): ConfidenceLabel {
  return {
    level,
    description,
    evidenceStrength,
    caveats,
  };
}

/**
 * High-confidence label when evidence is strong and consistent.
 */
export function highConfidence(description: string, caveats?: string[]): ConfidenceLabel {
  return createConfidenceLabel("high", description, "strong", caveats);
}

/**
 * Medium-confidence label when evidence is mixed or incomplete.
 */
export function mediumConfidence(description: string, caveats?: string[]): ConfidenceLabel {
  return createConfidenceLabel("medium", description, "moderate", caveats);
}

/**
 * Low-confidence label when evidence is weak or sparse.
 */
export function lowConfidence(description: string, caveats?: string[]): ConfidenceLabel {
  return createConfidenceLabel("low", description, "weak", caveats);
}

/**
 * Build a state summary from cockpit data.
 */
export function buildStateSummary(params: {
  totalIssues: number;
  criticalIssues: number;
  openDriftItems: number;
  connectorIssues: number;
  recentChanges: number;
}): StateSummary {
  return { ...params };
}

/**
 * Create a probable cause entry.
 */
export function createProbableCause(
  id: string,
  description: string,
  confidence: ConfidenceLabel,
  likelihood: "confirmed" | "probable" | "possible",
  linkedEvidence: EvidenceReference[] = []
): ProbableCause {
  return {
    id,
    description,
    confidence,
    linkedEvidence,
    likelihood,
  };
}

/**
 * Create an evidence reference.
 */
export function createEvidenceReference(
  type: EvidenceReference["type"],
  id: string,
  label: string,
  url?: string,
  timestamp?: string
): EvidenceReference {
  return { type, id, label, url, timestamp };
}

/**
 * Create a ranked action with full metadata.
 */
export function createRankedAction(
  id: string,
  description: string,
  priority: number,
  confidence: ConfidenceLabel,
  risk: RiskFraming,
  linkedEvidence: EvidenceReference[] = [],
  estimatedEffort?: "low" | "medium" | "high",
  rollbackAvailable = false
): RankedAction {
  return {
    id,
    description,
    priority,
    confidence,
    risk,
    linkedEvidence,
    estimatedEffort,
    rollbackAvailable,
  };
}

/**
 * Generate probable causes from drift items and alerts.
 */
export function generateProbableCauses(params: {
  driftItems: Array<{ category: string; severity: string; description: string }>;
  connectorFailures?: Array<{ providerId: string; errorType: string }>;
  recentChanges?: Array<{ changeType: string; timestamp: string }>;
}): ProbableCause[] {
  const causes: ProbableCause[] = [];

  // Drift-based causes
  const criticalDrift = params.driftItems.filter((d) => d.severity === "critical");
  if (criticalDrift.length > 0) {
    causes.push(
      createProbableCause(
        "drift-critical",
        "Critical configuration drift detected affecting system alignment",
        highConfidence("Drift items confirmed by live state comparison"),
        "confirmed",
        [
          createEvidenceReference(
            "drift",
            "current-drift-report",
            `${criticalDrift.length} critical drift item(s)`,
            undefined,
            new Date().toISOString()
          ),
        ]
      )
    );
  }

  // Connector-based causes
  if (params.connectorFailures && params.connectorFailures.length > 0) {
    const failedProviders = params.connectorFailures.map((f) => f.providerId).join(", ");
    causes.push(
      createProbableCause(
        "connector-failures",
        `Connector failures detected for: ${failedProviders}`,
        mediumConfidence("Connector health checks show failures"),
        "confirmed",
        params.connectorFailures.map((f) =>
          createEvidenceReference(
            "failure",
            `connector-${f.providerId}`,
            `${f.providerId}: ${f.errorType}`,
            undefined,
            new Date().toISOString()
          )
        )
      )
    );
  }

  // Change-based causes (correlation)
  if (params.recentChanges && params.recentChanges.length > 0) {
    const changeTypes = [...new Set(params.recentChanges.map((c) => c.changeType))];
    causes.push(
      createProbableCause(
        "recent-changes",
        `Recent changes detected: ${changeTypes.join(", ")}`,
        mediumConfidence("Change history available for correlation"),
        "probable",
        params.recentChanges.slice(0, 3).map((c, i) =>
          createEvidenceReference(
            "change",
            `change-${i}`,
            `${c.changeType} at ${c.timestamp}`,
            undefined,
            c.timestamp
          )
        )
      )
    );
  }

  return causes;
}

/**
 * Rank actions by priority, confidence, and risk.
 * Priority: lower number = higher priority.
 */
export function rankActions(actions: RankedAction[]): RankedAction[] {
  return [...actions].sort((a, b) => {
    // First sort by priority
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Then by confidence level (high > medium > low)
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confidenceOrder[a.confidence.level] - confidenceOrder[b.confidence.level];
    if (confDiff !== 0) return confDiff;
    // Then by risk level (lower risk preferred)
    const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    return riskOrder[a.risk.riskLevel] - riskOrder[b.risk.riskLevel];
  });
}

/**
 * Generate ranked actions from drift, alerts, and other inputs.
 */
export function generateRankedActions(params: {
  driftItems: Array<{ category: string; description: string; severity: string }>;
  alerts?: Array<{ title: string; severity: string; domain: string }>;
  connectorIssues?: Array<{ providerId: string; issue: string }>;
}): RankedAction[] {
  const actions: RankedAction[] = [];

  // Generate reconciliation action for drift
  if (params.driftItems.length > 0) {
    const criticalDrift = params.driftItems.filter((d) => d.severity === "critical");
    const majorDrift = params.driftItems.filter((d) => d.severity === "major");

    if (criticalDrift.length > 0) {
      actions.push(
        createRankedAction(
          "action-reconcile-critical",
          `Reconcile ${criticalDrift.length} critical drift item(s) immediately`,
          1, // Highest priority
          highConfidence("Drift confirmed by state comparison"),
          {
            riskLevel: "high",
            riskDescription: "Reconciliation may cause temporary unavailability for affected services",
            potentialImpact: "Restores alignment but may trigger cascading updates",
            affectedAreas: criticalDrift.map((d) => d.category),
            immediateActions: ["Backup current state", "Notify affected stakeholders"],
          },
          [
            createEvidenceReference(
              "drift",
              "critical-drift-report",
              `${criticalDrift.length} critical drift item(s)`,
              undefined,
              new Date().toISOString()
            ),
          ],
          "medium",
          true // rollback available
        )
      );
    }

    if (majorDrift.length > 0) {
      actions.push(
        createRankedAction(
          "action-reconcile-major",
          `Review and reconcile ${majorDrift.length} major drift item(s)`,
          2,
          mediumConfidence("Drift confirmed, priority based on severity"),
          {
            riskLevel: "medium",
            riskDescription: "Reconciliation will update configurations to match desired state",
            potentialImpact: "Affected services may experience brief config refresh",
            affectedAreas: majorDrift.map((d) => d.category),
          },
          [
            createEvidenceReference(
              "drift",
              "major-drift-report",
              `${majorDrift.length} major drift item(s)`,
              undefined,
              new Date().toISOString()
            ),
          ],
          "low",
          true
        )
      );
    }
  }

  // Generate connector remediation actions
  if (params.connectorIssues && params.connectorIssues.length > 0) {
    actions.push(
      createRankedAction(
        "action-reconnect",
        `Re-authenticate failed connector(s): ${params.connectorIssues.map((c) => c.providerId).join(", ")}`,
        params.driftItems.length > 0 ? 3 : 1,
        highConfidence("Connector failures confirmed by health checks"),
        {
          riskLevel: "medium",
          riskDescription: "Re-authentication may temporarily interrupt connector-dependent workflows",
          potentialImpact: "Restores connector functionality; dependent workflows resume",
          affectedAreas: ["connectors", ...params.connectorIssues.map((c) => `connector-${c.providerId}`)],
        },
        params.connectorIssues.map((c) =>
          createEvidenceReference(
            "failure",
            `connector-${c.providerId}`,
            c.issue,
            undefined,
            new Date().toISOString()
          )
        ),
        "low",
        false
      )
    );
  }

  // Generate alert-based actions
  if (params.alerts) {
    const criticalAlerts = params.alerts.filter((a) => a.severity === "critical");
    if (criticalAlerts.length > 0) {
      actions.push(
        createRankedAction(
          "action-critical-alerts",
          `Investigate ${criticalAlerts.length} critical alert(s)`,
          1,
          highConfidence("Critical alerts require immediate attention"),
          {
            riskLevel: "critical",
            riskDescription: "Unaddressed critical alerts may lead to service degradation or outage",
            potentialImpact: "Potential data loss or service interruption if unresolved",
            affectedAreas: criticalAlerts.map((a) => a.domain),
            immediateActions: ["Acknowledge alerts", "Begin investigation", "Prepare incident response"],
          },
          criticalAlerts.map((a, i) =>
            createEvidenceReference(
              "incident",
              `alert-${i}`,
              a.title,
              undefined,
              new Date().toISOString()
            )
          ),
          "high",
          false
        )
      );
    }
  }

  return rankActions(actions);
}

/**
 * Compute overall review confidence based on evidence available.
 */
export function computeOverallConfidence(
  probableCauses: ProbableCause[],
  rankedActions: RankedAction[]
): ConfidenceLabel {
  const causeConfidenceValues = probableCauses.map((c) =>
    c.confidence.level === "high" ? 3 : c.confidence.level === "medium" ? 2 : 1
  );
  const actionConfidenceValues = rankedActions.map((a) =>
    a.confidence.level === "high" ? 3 : a.confidence.level === "medium" ? 2 : 1
  );

  const allValues = [...causeConfidenceValues, ...actionConfidenceValues];
  const avgValue = allValues.reduce((a, b) => a + b, 0) / allValues.length;

  if (avgValue >= 2.5) {
    return highConfidence(
      "Strong evidence base supports review conclusions",
      probableCauses.length > 0 ? [`${probableCauses.length} probable cause(s) identified`] : undefined
    );
  } else if (avgValue >= 1.5) {
    return mediumConfidence(
      "Moderate evidence supports review conclusions",
      [`${probableCauses.length} probable cause(s), ${rankedActions.length} action(s) proposed`]
    );
  } else {
    return lowConfidence(
      "Limited evidence available; review conclusions are preliminary",
      ["Additional investigation may be needed to confirm root causes"]
    );
  }
}

/**
 * Generate a complete evidence-backed operating review.
 */
export function generateOperatingReview(params: {
  reviewId: string;
  stateSummary: StateSummary;
  probableCauses: ProbableCause[];
  rankedActions: RankedAction[];
  linkedEvidence: EvidenceReference[];
  nextScheduledReview?: string;
}): EvidenceBackedReview {
  const overallConfidence = computeOverallConfidence(params.probableCauses, params.rankedActions);

  return {
    id: params.reviewId,
    title: `Operating Review - ${new Date().toLocaleDateString()}`,
    generatedAt: new Date().toISOString(),
    stateSummary: params.stateSummary,
    probableCauses: params.probableCauses,
    rankedActions: params.rankedActions,
    linkedEvidence: params.linkedEvidence,
    overallConfidence,
    nextScheduledReview: params.nextScheduledReview,
  };
}
