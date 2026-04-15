/**
 * Multi-Domain Health Summary Module
 * 
 * Aggregates health status from core lifecycle, connectors, and other foundation domains
 * to provide a unified cockpit health view.
 */

import type {
  HealthDomain,
  HealthStatus,
  DomainHealth,
  MultiDomainHealthSummary,
} from "./types.js";

/**
 * Get the overall health status from a list of domain statuses.
 * Critical dominates, then degraded, then unknown, then ok.
 */
export function computeOverallStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("degraded")) return "degraded";
  if (statuses.includes("unknown")) return "unknown";
  return "ok";
}

/**
 * Generate a human-readable summary for the multi-domain health.
 */
export function generateHealthSummary(domains: DomainHealth[]): string {
  const healthyDomains = domains.filter((d) => d.status === "ok").length;
  const degradedDomains = domains.filter((d) => d.status === "degraded");
  const errorDomains = domains.filter((d) => d.status === "error");
  const total = domains.length;

  if (errorDomains.length > 0) {
    return `${errorDomains.length} domain(s) in error state: ${errorDomains.map((d) => d.domain).join(", ")}. ${healthyDomains} domain(s) operating normally.`;
  }

  if (degradedDomains.length > 0) {
    return `${degradedDomains.length} domain(s) degraded: ${degradedDomains.map((d) => d.domain).join(", ")}. ${healthyDomains} domain(s) operating normally.`;
  }

  if (healthyDomains === total) {
    return `All ${total} domain(s) operating normally.`;
  }

  return `${healthyDomains} of ${total} domain(s) operating normally.`;
}

/**
 * Create a domain health entry with standard structure.
 */
export function createDomainHealth(
  domain: HealthDomain,
  status: HealthStatus,
  message?: string,
  metrics?: Record<string, string | number>
): DomainHealth {
  return {
    domain,
    status,
    checkedAt: new Date().toISOString(),
    message,
    metrics,
  };
}

/**
 * Aggregate health from core lifecycle domain.
 * This synthesizes health from provisioning, upgrade, rollback status.
 */
export function getCoreHealth(coreStatus: {
  provisioningHealthy: boolean;
  upgradeHealthy: boolean;
  lastProvisioningAt?: string;
  driftStatus?: "aligned" | "drifted";
}): DomainHealth {
  let status: HealthStatus = "ok";

  if (!coreStatus.provisioningHealthy || !coreStatus.upgradeHealthy) {
    status = "degraded";
  }
  if (coreStatus.driftStatus === "drifted") {
    status = "degraded";
  }

  const message = buildCoreHealthMessage(coreStatus);

  return createDomainHealth("core", status, message, {
    provisioningHealthy: coreStatus.provisioningHealthy ? 1 : 0,
    upgradeHealthy: coreStatus.upgradeHealthy ? 1 : 0,
    driftStatus: coreStatus.driftStatus === "drifted" ? 1 : 0,
  });
}

/**
 * Build a human-readable message for core health.
 */
function buildCoreHealthMessage(status: {
  provisioningHealthy: boolean;
  upgradeHealthy: boolean;
  lastProvisioningAt?: string;
  driftStatus?: "aligned" | "drifted";
}): string {
  if (!status.provisioningHealthy) {
    return "Core provisioning has issues. Review recent provisioning runs.";
  }
  if (!status.upgradeHealthy) {
    return "Upgrade path has issues. Check upgrade history.";
  }
  if (status.driftStatus === "drifted") {
    return "Active drift detected. Run reconciliation to restore alignment.";
  }
  if (status.lastProvisioningAt) {
    return `Last provisioning: ${status.lastProvisioningAt}`;
  }
  return "Core lifecycle operating normally.";
}

/**
 * Create connector domain health from connector plugin status.
 */
export function getConnectorHealth(connectorStatus: {
  certifiedConnectors: number;
  failedConnectors?: number;
  pendingConnectors?: number;
  lastHealthCheck?: string;
}): DomainHealth {
  let status: HealthStatus = "ok";

  if ((connectorStatus.failedConnectors ?? 0) > 0) {
    status = "degraded";
  }
  if ((connectorStatus.failedConnectors ?? 0) > (connectorStatus.certifiedConnectors || 1) / 2) {
    status = "error";
  }

  const message = buildConnectorHealthMessage(connectorStatus);

  return createDomainHealth("connectors", status, message, {
    certified: connectorStatus.certifiedConnectors,
    failed: connectorStatus.failedConnectors ?? 0,
    pending: connectorStatus.pendingConnectors ?? 0,
  });
}

/**
 * Build a human-readable message for connector health.
 */
function buildConnectorHealthMessage(status: {
  certifiedConnectors: number;
  failedConnectors?: number;
  pendingConnectors?: number;
}): string {
  if ((status.failedConnectors ?? 0) > 0) {
    return `${status.failedConnectors} connector(s) in failed state. ${status.certifiedConnectors} certified.`;
  }
  if ((status.pendingConnectors ?? 0) > 0) {
    return `${status.pendingConnectors} connector(s) pending certification. ${status.certifiedConnectors} certified.`;
  }
  return `${status.certifiedConnectors} certified connector(s) healthy.`;
}

/**
 * Create setup domain health.
 */
export function getSetupHealth(setupStatus: {
  lastSetupCompletedAt?: string;
  setupInProgress: boolean;
  contractMismatch?: boolean;
}): DomainHealth {
  let status: HealthStatus = "ok";

  if (setupStatus.contractMismatch) {
    status = "error";
  } else if (setupStatus.setupInProgress) {
    status = "degraded";
  }

  const message = buildSetupHealthMessage(setupStatus);

  return createDomainHealth("setup", status, message, {
    inProgress: setupStatus.setupInProgress ? 1 : 0,
    contractMismatch: setupStatus.contractMismatch ? 1 : 0,
  });
}

/**
 * Build a human-readable message for setup health.
 */
function buildSetupHealthMessage(status: {
  lastSetupCompletedAt?: string;
  setupInProgress: boolean;
  contractMismatch?: boolean;
}): string {
  if (status.contractMismatch) {
    return "Setup blocked by contract mismatch. Resolve before continuing.";
  }
  if (status.setupInProgress) {
    return "Setup currently in progress.";
  }
  if (status.lastSetupCompletedAt) {
    return `Last setup completed: ${status.lastSetupCompletedAt}`;
  }
  return "Setup surface healthy.";
}

/**
 * Create skills domain health.
 */
export function getSkillsHealth(skillsStatus: {
  catalogedSkills: number;
  extractedSkills: number;
  staleExtractions?: number;
}): DomainHealth {
  let status: HealthStatus = "ok";

  if ((skillsStatus.staleExtractions ?? 0) > 0) {
    status = "degraded";
  }

  const message = buildSkillsHealthMessage(skillsStatus);

  return createDomainHealth("skills", status, message, {
    cataloged: skillsStatus.catalogedSkills,
    extracted: skillsStatus.extractedSkills,
    stale: skillsStatus.staleExtractions ?? 0,
  });
}

/**
 * Build a human-readable message for skills health.
 */
function buildSkillsHealthMessage(status: {
  catalogedSkills: number;
  extractedSkills: number;
  staleExtractions?: number;
}): string {
  if ((status.staleExtractions ?? 0) > 0) {
    return `${status.staleExtractions} stale skill extraction(s) detected.`;
  }
  return `${status.catalogedSkills} cataloged skill(s), ${status.extractedSkills} extracted.`;
}

/**
 * Create departments domain health placeholder.
 */
export function getDepartmentsHealth(deptStatus: {
  activeWorkflows: number;
  degradedWorkflows?: number;
}): DomainHealth {
  let status: HealthStatus = "ok";

  if ((deptStatus.degradedWorkflows ?? 0) > 0) {
    status = "degraded";
  }

  const message = deptStatus.degradedWorkflows
    ? `${deptStatus.degradedWorkflows} department workflow(s) degraded.`
    : `${deptStatus.activeWorkflows} department workflow(s) active.`;

  return createDomainHealth("departments", status, message, {
    active: deptStatus.activeWorkflows,
    degraded: deptStatus.degradedWorkflows ?? 0,
  });
}

/**
 * Create tools domain health placeholder.
 */
export function getToolsHealth(toolsStatus: {
  registeredTools: number;
  failedTools?: number;
}): DomainHealth {
  let status: HealthStatus = "ok";

  if ((toolsStatus.failedTools ?? 0) > 0) {
    status = "degraded";
  }

  const message = toolsStatus.failedTools
    ? `${toolsStatus.failedTools} tool(s) in failed state.`
    : `${toolsStatus.registeredTools} tool(s) healthy.`;

  return createDomainHealth("tools", status, message, {
    registered: toolsStatus.registeredTools,
    failed: toolsStatus.failedTools ?? 0,
  });
}

/**
 * Build a complete multi-domain health summary.
 */
export function buildMultiDomainHealthSummary(domains: DomainHealth[]): MultiDomainHealthSummary {
  const statuses = domains.map((d) => d.status);
  const overallStatus = computeOverallStatus(statuses);

  return {
    overallStatus,
    checkedAt: new Date().toISOString(),
    domains,
    summary: generateHealthSummary(domains),
  };
}
