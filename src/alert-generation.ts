/**
 * Alert Generation with Risk Framing Module
 * 
 * Creates cockpit alerts with explicit risk framing, linked evidence,
 * and actionable guidance.
 */

import type {
  AlertSeverity,
  CockpitAlert,
  EvidenceReference,
  HealthDomain,
  RiskFraming,
  RiskLevel,
} from "./types.js";

/**
 * Map domain-specific severity to alert severity.
 */
export function domainSeverityToAlertSeverity(
  domainSeverity: "ok" | "degraded" | "error" | "unknown"
): AlertSeverity {
  switch (domainSeverity) {
    case "error":
      return "critical";
    case "degraded":
      return "warning";
    case "ok":
      return "info";
    default:
      return "info";
  }
}

/**
 * Determine risk level from severity and affected areas.
 */
export function determineRiskLevel(
  severity: AlertSeverity,
  affectedAreas: string[]
): RiskLevel {
  if (severity === "critical") return "critical";
  if (severity === "warning") {
    return affectedAreas.length > 2 ? "high" : "medium";
  }
  return "low";
}

/**
 * Build a standard risk framing for an alert.
 */
export function buildRiskFraming(
  riskLevel: RiskLevel,
  description: string,
  potentialImpact: string,
  affectedAreas: string[],
  immediateActions?: string[]
): RiskFraming {
  return {
    riskLevel,
    riskDescription: `${riskLevel.toUpperCase()} risk: ${description}`,
    potentialImpact,
    affectedAreas,
    immediateActions,
  };
}

/**
 * Create a drift-based alert with risk framing.
 */
export function createDriftAlert(params: {
  driftCount: number;
  criticalCount: number;
  domain: HealthDomain;
  linkedEvidence: EvidenceReference[];
}): CockpitAlert {
  const severity: AlertSeverity = params.criticalCount > 0 ? "critical" : "warning";
  const riskLevel = determineRiskLevel(severity, ["core", "configuration"]);

  return {
    id: `alert-drift-${Date.now()}`,
    severity,
    title: params.criticalCount > 0 ? "Critical Drift Detected" : "Drift Detected",
    description: `${params.driftCount} drift item(s) detected, ${params.criticalCount} critical. Reconciliation recommended.`,
    domain: params.domain,
    risk: buildRiskFraming(
      riskLevel,
      params.criticalCount > 0
        ? "Critical configuration drift may cause system misalignment and degraded behavior"
        : "Configuration drift detected that may accumulate if not addressed",
      params.criticalCount > 0
        ? "Services relying on drifted configuration may exhibit incorrect behavior"
        : "Gradual deviation from desired state",
      ["core", "configuration", ...(params.criticalCount > 0 ? ["data integrity"] : [])],
      params.criticalCount > 0 ? ["Run reconciliation immediately", "Review drift causes", "Verify affected services"] : undefined
    ),
    linkedEvidence: params.linkedEvidence,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a connector failure alert with risk framing.
 */
export function createConnectorAlert(params: {
  providerId: string;
  errorType: string;
  domain: HealthDomain;
  linkedEvidence: EvidenceReference[];
}): CockpitAlert {
  const severity: AlertSeverity = "warning";
  const riskLevel = determineRiskLevel(severity, [`connector-${params.providerId}`]);

  return {
    id: `alert-connector-${params.providerId}-${Date.now()}`,
    severity,
    title: `Connector Issue: ${params.providerId}`,
    description: `Connector "${params.providerId}" reported ${params.errorType}. Downstream workflows may be affected.`,
    domain: params.domain,
    risk: buildRiskFraming(
      riskLevel,
      `Connector failure for ${params.providerId} may interrupt dependent workflows`,
      `Workflows relying on ${params.providerId} will fail or degrade until reconnection`,
      [`connectors`, `connector-${params.providerId}`],
      ["Check connector credentials", "Verify provider status", "Review reconnect flow"]
    ),
    linkedEvidence: params.linkedEvidence,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create an upgrade failure alert with risk framing.
 */
export function createUpgradeFailureAlert(params: {
  fromVersion: string;
  toVersion: string;
  domain: HealthDomain;
  linkedEvidence: EvidenceReference[];
}): CockpitAlert {
  const severity: AlertSeverity = "critical";
  const riskLevel = determineRiskLevel(severity, ["core", "lifecycle"]);

  return {
    id: `alert-upgrade-failure-${Date.now()}`,
    severity,
    title: "Upgrade Failed",
    description: `Upgrade from ${params.fromVersion} to ${params.toVersion} failed. Rollback may be required.`,
    domain: params.domain,
    risk: buildRiskFraming(
      riskLevel,
      "Failed upgrade may leave system in inconsistent state",
      "System may be running mixed versions or have partial changes applied",
      ["core", "lifecycle", "all services"],
      ["Do not attempt further upgrades", "Check rollback path", "Contact support if rollback fails"]
    ),
    linkedEvidence: params.linkedEvidence,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a reconciliation needed alert with risk framing.
 */
export function createReconciliationNeededAlert(params: {
  reason: string;
  domain: HealthDomain;
  linkedEvidence: EvidenceReference[];
}): CockpitAlert {
  const severity: AlertSeverity = "warning";
  const riskLevel = determineRiskLevel(severity, ["core", "configuration"]);

  return {
    id: `alert-reconcile-${Date.now()}`,
    severity,
    title: "Reconciliation Needed",
    description: params.reason,
    domain: params.domain,
    risk: buildRiskFraming(
      riskLevel,
      "System state has diverged from desired configuration",
      "Accumulated drift may cause unexpected behavior or failed deployments",
      ["core", "configuration"],
      ["Review drift items", "Plan reconciliation window", "Notify stakeholders"]
    ),
    linkedEvidence: params.linkedEvidence,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a general info alert with minimal risk framing.
 */
export function createInfoAlert(params: {
  title: string;
  description: string;
  domain: HealthDomain;
  linkedEvidence: EvidenceReference[];
}): CockpitAlert {
  return {
    id: `alert-info-${Date.now()}`,
    severity: "info",
    title: params.title,
    description: params.description,
    domain: params.domain,
    risk: buildRiskFraming(
      "low",
      "Informational notice, no immediate action required",
      "No negative impact expected",
      [params.domain]
    ),
    linkedEvidence: params.linkedEvidence,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Acknowledge an alert.
 */
export function acknowledgeAlert(alert: CockpitAlert): CockpitAlert {
  return {
    ...alert,
    acknowledgedAt: new Date().toISOString(),
  };
}

/**
 * Resolve an alert.
 */
export function resolveAlert(alert: CockpitAlert): CockpitAlert {
  return {
    ...alert,
    resolvedAt: new Date().toISOString(),
  };
}

/**
 * Check if an alert is still active (not resolved).
 */
export function isAlertActive(alert: CockpitAlert): boolean {
  return !alert.resolvedAt;
}

/**
 * Check if an alert is acknowledged but not yet resolved.
 */
export function isAlertAcknowledged(alert: CockpitAlert): boolean {
  return !!alert.acknowledgedAt && !alert.resolvedAt;
}

/**
 * Filter to only active alerts.
 */
export function filterActiveAlerts(alerts: CockpitAlert[]): CockpitAlert[] {
  return alerts.filter(isAlertActive);
}

/**
 * Sort alerts by severity (critical first) then by creation time.
 */
export function sortAlertsByPriority(alerts: CockpitAlert[]): CockpitAlert[] {
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return [...alerts].sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
