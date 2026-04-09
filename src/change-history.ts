/**
 * Change History Tracking Module
 * 
 * Provides change history tracking with correlation to issues and alerts,
 * enabling operators to trace issues back to recent changes.
 */

import type {
  ChangeHistory,
  ChangeHistoryEntry,
  ChangeType,
  EvidenceReference,
  HealthDomain,
} from "./types.js";

/**
 * Create a change history entry.
 */
export function createChangeEntry(params: {
  changeType: ChangeType;
  description: string;
  domain: HealthDomain;
  actor?: string;
  linkedIssueIds?: string[];
  linkedAlertIds?: string[];
  evidence?: EvidenceReference[];
  rollbackAvailable?: boolean;
  rollbackToVersion?: string;
}): ChangeHistoryEntry {
  return {
    id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    changeType: params.changeType,
    description: params.description,
    domain: params.domain,
    timestamp: new Date().toISOString(),
    actor: params.actor,
    linkedIssueIds: params.linkedIssueIds,
    linkedAlertIds: params.linkedAlertIds,
    evidence: params.evidence ?? [],
    rollbackAvailable: params.rollbackAvailable ?? false,
    rollbackToVersion: params.rollbackToVersion,
  };
}

/**
 * Create a provisioning change entry.
 */
export function createProvisioningEntry(
  description: string,
  actor?: string,
  linkedIssueIds?: string[]
): ChangeHistoryEntry {
  return createChangeEntry({
    changeType: "provision",
    description,
    domain: "core",
    actor,
    linkedIssueIds,
    rollbackAvailable: false,
  });
}

/**
 * Create an upgrade change entry.
 */
export function createUpgradeEntry(
  fromVersion: string,
  toVersion: string,
  actor?: string,
  linkedIssueIds?: string[]
): ChangeHistoryEntry {
  return createChangeEntry({
    changeType: "upgrade",
    description: `Upgraded from ${fromVersion} to ${toVersion}`,
    domain: "core",
    actor,
    linkedIssueIds,
    rollbackAvailable: true,
    rollbackToVersion: fromVersion,
  });
}

/**
 * Create a rollback change entry.
 */
export function createRollbackEntry(
  targetVersion: string,
  actor?: string,
  linkedIssueIds?: string[]
): ChangeHistoryEntry {
  return createChangeEntry({
    changeType: "rollback",
    description: `Rolled back to ${targetVersion}`,
    domain: "core",
    actor,
    linkedIssueIds,
    rollbackAvailable: true,
    rollbackToVersion: targetVersion,
  });
}

/**
 * Create a reconciliation change entry.
 */
export function createReconcileEntry(
  description: string,
  actor?: string,
  linkedIssueIds?: string[],
  linkedAlertIds?: string[]
): ChangeHistoryEntry {
  return createChangeEntry({
    changeType: "reconcile",
    description,
    domain: "core",
    actor,
    linkedIssueIds,
    linkedAlertIds,
    rollbackAvailable: false,
  });
}

/**
 * Create a connector change entry.
 */
export function createConnectorChangeEntry(
  providerId: string,
  changeDescription: string,
  linkedIssueIds?: string[],
  linkedAlertIds?: string[]
): ChangeHistoryEntry {
  return createChangeEntry({
    changeType: "connector_change",
    description: `${providerId}: ${changeDescription}`,
    domain: "connectors",
    linkedIssueIds,
    linkedAlertIds,
    rollbackAvailable: false,
  });
}

/**
 * Create a configuration change entry.
 */
export function createConfigChangeEntry(
  configPath: string,
  changeDescription: string,
  actor?: string,
  linkedIssueIds?: string[]
): ChangeHistoryEntry {
  return createChangeEntry({
    changeType: "config_change",
    description: `${configPath}: ${changeDescription}`,
    domain: "core",
    actor,
    linkedIssueIds,
    rollbackAvailable: true,
  });
}

/**
 * Create a manual change entry.
 */
export function createManualChangeEntry(
  description: string,
  actor: string,
  linkedIssueIds?: string[],
  linkedAlertIds?: string[]
): ChangeHistoryEntry {
  return createChangeEntry({
    changeType: "manual",
    description,
    domain: "core",
    actor,
    linkedIssueIds,
    linkedAlertIds,
    rollbackAvailable: false,
  });
}

/**
 * Build a change history from entries.
 */
export function buildChangeHistory(
  entries: ChangeHistoryEntry[],
  since?: string
): ChangeHistory {
  let filteredEntries = entries;

  if (since) {
    const sinceDate = new Date(since);
    filteredEntries = entries.filter(
      (e) => new Date(e.timestamp) >= sinceDate
    );
  }

  return {
    entries: [...filteredEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
    totalCount: filteredEntries.length,
    since,
  };
}

/**
 * Find changes related to a specific alert.
 */
export function findChangesForAlert(
  alertId: string,
  entries: ChangeHistoryEntry[]
): ChangeHistoryEntry[] {
  return entries.filter((e) => e.linkedAlertIds?.includes(alertId));
}

/**
 * Find changes related to a specific issue.
 */
export function findChangesForIssue(
  issueId: string,
  entries: ChangeHistoryEntry[]
): ChangeHistoryEntry[] {
  return entries.filter((e) => e.linkedIssueIds?.includes(issueId));
}

/**
 * Find changes by domain.
 */
export function findChangesByDomain(
  domain: HealthDomain,
  entries: ChangeHistoryEntry[]
): ChangeHistoryEntry[] {
  return entries.filter((e) => e.domain === domain);
}

/**
 * Find changes by type.
 */
export function findChangesByType(
  changeType: ChangeType,
  entries: ChangeHistoryEntry[]
): ChangeHistoryEntry[] {
  return entries.filter((e) => e.changeType === changeType);
}

/**
 * Get recent changes within a time window.
 */
export function getRecentChanges(
  entries: ChangeHistoryEntry[],
  windowHours: number = 24
): ChangeHistoryEntry[] {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - windowHours);
  return entries.filter((e) => new Date(e.timestamp) >= cutoff);
}

/**
 * Correlate an issue to potential cause changes.
 * Returns changes that occurred before the issue and could be related.
 */
export function correlateIssueToChanges(
  issueTimestamp: string,
  changes: ChangeHistoryEntry[],
  windowHours: number = 48
): ChangeHistoryEntry[] {
  const issueDate = new Date(issueTimestamp);
  const windowStart = new Date(issueDate);
  windowStart.setHours(windowStart.getHours() - windowHours);

  return changes
    .filter((c) => {
      const changeDate = new Date(c.timestamp);
      return changeDate >= windowStart && changeDate <= issueDate;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Correlate an alert to recent changes.
 * Returns changes that occurred before the alert and might have caused it.
 */
export function correlateAlertToChanges(
  alertTimestamp: string,
  changes: ChangeHistoryEntry[],
  windowHours: number = 48
): ChangeHistoryEntry[] {
  return correlateIssueToChanges(alertTimestamp, changes, windowHours);
}

/**
 * Link a change entry to an issue.
 */
export function linkChangeToIssue(
  entry: ChangeHistoryEntry,
  issueId: string
): ChangeHistoryEntry {
  const linkedIssueIds = [...(entry.linkedIssueIds ?? []), issueId];
  return { ...entry, linkedIssueIds };
}

/**
 * Link a change entry to an alert.
 */
export function linkChangeToAlert(
  entry: ChangeHistoryEntry,
  alertId: string
): ChangeHistoryEntry {
  const linkedAlertIds = [...(entry.linkedAlertIds ?? []), alertId];
  return { ...entry, linkedAlertIds };
}

/**
 * Get change type label for display.
 */
export function getChangeTypeLabel(changeType: ChangeType): string {
  switch (changeType) {
    case "provision":
      return "Provisioning";
    case "upgrade":
      return "Upgrade";
    case "rollback":
      return "Rollback";
    case "reconcile":
      return "Reconciliation";
    case "connector_change":
      return "Connector Change";
    case "config_change":
      return "Configuration Change";
    case "manual":
      return "Manual";
    default:
      return "Unknown";
  }
}
