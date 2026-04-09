import { describe, expect, it } from "vitest";
import {
  buildChangeHistory,
  correlateAlertToChanges,
  createConfigChangeEntry,
  createConnectorChangeEntry,
  createProvisioningEntry,
  createReconcileEntry,
  createRollbackEntry,
  createUpgradeEntry,
  findChangesByDomain,
  findChangesByType,
  findChangesForAlert,
  findChangesForIssue,
  getChangeTypeLabel,
  getRecentChanges,
  linkChangeToAlert,
  linkChangeToIssue,
} from "./change-history.js";

describe("change-history module", () => {
  describe("createProvisioningEntry", () => {
    it("creates provisioning change entry", () => {
      const entry = createProvisioningEntry("Workspace created", "admin", ["issue-1"]);
      
      expect(entry.changeType).toBe("provision");
      expect(entry.description).toBe("Workspace created");
      expect(entry.actor).toBe("admin");
      expect(entry.linkedIssueIds).toContain("issue-1");
      expect(entry.rollbackAvailable).toBe(false);
    });
  });

  describe("createUpgradeEntry", () => {
    it("creates upgrade entry with rollback available", () => {
      const entry = createUpgradeEntry("1.0.0", "2.0.0", "admin", ["issue-2"]);
      
      expect(entry.changeType).toBe("upgrade");
      expect(entry.description).toContain("1.0.0");
      expect(entry.description).toContain("2.0.0");
      expect(entry.rollbackAvailable).toBe(true);
      expect(entry.rollbackToVersion).toBe("1.0.0");
    });
  });

  describe("createRollbackEntry", () => {
    it("creates rollback entry", () => {
      const entry = createRollbackEntry("1.0.0", "admin", ["issue-3"]);
      
      expect(entry.changeType).toBe("rollback");
      expect(entry.description).toContain("1.0.0");
      expect(entry.rollbackAvailable).toBe(true);
      expect(entry.rollbackToVersion).toBe("1.0.0");
    });
  });

  describe("createReconcileEntry", () => {
    it("creates reconcile entry with linked alerts", () => {
      const entry = createReconcileEntry(
        "Configuration reconciled",
        "system",
        ["issue-4"],
        ["alert-1"]
      );
      
      expect(entry.changeType).toBe("reconcile");
      expect(entry.linkedAlertIds).toContain("alert-1");
    });
  });

  describe("createConnectorChangeEntry", () => {
    it("creates connector change entry", () => {
      const entry = createConnectorChangeEntry(
        "slack",
        "Token refreshed",
        ["issue-5"],
        ["alert-2"]
      );
      
      expect(entry.changeType).toBe("connector_change");
      expect(entry.description).toContain("slack");
      expect(entry.domain).toBe("connectors");
    });
  });

  describe("createConfigChangeEntry", () => {
    it("creates config change entry", () => {
      const entry = createConfigChangeEntry(
        "database.connection_timeout",
        "Increased timeout to 30s",
        "admin",
        ["issue-6"]
      );
      
      expect(entry.changeType).toBe("config_change");
      expect(entry.description).toContain("database.connection_timeout");
      expect(entry.rollbackAvailable).toBe(true);
    });
  });

  describe("buildChangeHistory", () => {
    it("builds change history sorted by timestamp descending", () => {
      const entry1 = createProvisioningEntry("Entry 1");
      entry1.timestamp = new Date(Date.now() - 2000).toISOString(); // Oldest
      
      const entry2 = createUpgradeEntry("1.0.0", "2.0.0");
      entry2.timestamp = new Date(Date.now() - 1000).toISOString(); // Middle
      
      const entry3 = createReconcileEntry("Entry 3");
      entry3.timestamp = new Date().toISOString(); // Most recent

      const history = buildChangeHistory([entry1, entry2, entry3]);
      
      expect(history.totalCount).toBe(3);
      expect(history.entries[0].changeType).toBe("reconcile"); // Most recent
      expect(history.entries[2].changeType).toBe("provision"); // Oldest
    });

    it("filters by since date", () => {
      const oldEntry = createProvisioningEntry("Old entry");
      oldEntry.timestamp = new Date(Date.now() - 100000).toISOString();
      
      const newEntry = createProvisioningEntry("New entry");
      newEntry.timestamp = new Date().toISOString();

      const history = buildChangeHistory(
        [oldEntry, newEntry],
        new Date(Date.now() - 50000).toISOString()
      );

      expect(history.totalCount).toBe(1);
      expect(history.entries[0].description).toBe("New entry");
    });
  });

  describe("findChangesForIssue", () => {
    it("finds changes linked to issue", () => {
      const entry = createProvisioningEntry("Test", "admin", ["issue-x"]);
      const other = createProvisioningEntry("Other");

      const found = findChangesForIssue("issue-x", [entry, other]);
      expect(found).toHaveLength(1);
      expect(found[0].description).toBe("Test");
    });
  });

  describe("findChangesForAlert", () => {
    it("finds changes linked to alert", () => {
      const entry = createReconcileEntry("Test", "admin", [], ["alert-x"]);
      const other = createProvisioningEntry("Other");

      const found = findChangesForAlert("alert-x", [entry, other]);
      expect(found).toHaveLength(1);
    });
  });

  describe("findChangesByDomain", () => {
    it("filters by domain", () => {
      const coreEntry = createProvisioningEntry("Core change");
      const connectorEntry = createConnectorChangeEntry("slack", "Token refresh");

      const core = findChangesByDomain("core", [coreEntry, connectorEntry]);
      expect(core).toHaveLength(1);
      expect(core[0].domain).toBe("core");
    });
  });

  describe("findChangesByType", () => {
    it("filters by change type", () => {
      const upgrade = createUpgradeEntry("1.0.0", "2.0.0");
      const provision = createProvisioningEntry("Provision");

      const upgrades = findChangesByType("upgrade", [upgrade, provision]);
      expect(upgrades).toHaveLength(1);
      expect(upgrades[0].changeType).toBe("upgrade");
    });
  });

  describe("getRecentChanges", () => {
    it("filters changes within time window", () => {
      const recent = createProvisioningEntry("Recent");
      const old = createProvisioningEntry("Old");
      old.timestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48h ago

      const recentChanges = getRecentChanges([recent, old], 24);
      expect(recentChanges).toHaveLength(1);
      expect(recentChanges[0].description).toBe("Recent");
    });
  });

  describe("correlateAlertToChanges", () => {
    it("finds changes that occurred before alert in time window", () => {
      const oldChange = createUpgradeEntry("1.0.0", "2.0.0");
      oldChange.timestamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h ago

      const recentChange = createProvisioningEntry("Recent provision");
      recentChange.timestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago

      const alertTime = new Date().toISOString();

      const correlated = correlateAlertToChanges(alertTime, [oldChange, recentChange], 48);
      expect(correlated).toHaveLength(2);
      // Should be sorted by most recent first
      expect(correlated[0].description).toBe("Recent provision");
    });
  });

  describe("linkChangeToIssue", () => {
    it("adds issue link to entry", () => {
      const entry = createProvisioningEntry("Test");
      const linked = linkChangeToIssue(entry, "issue-new");

      expect(linked.linkedIssueIds).toContain("issue-new");
    });

    it("preserves existing issue links", () => {
      const entry = createProvisioningEntry("Test", "admin", ["issue-old"]);
      const linked = linkChangeToIssue(entry, "issue-new");

      expect(linked.linkedIssueIds).toContain("issue-old");
      expect(linked.linkedIssueIds).toContain("issue-new");
    });
  });

  describe("linkChangeToAlert", () => {
    it("adds alert link to entry", () => {
      const entry = createReconcileEntry("Test");
      const linked = linkChangeToAlert(entry, "alert-new");

      expect(linked.linkedAlertIds).toContain("alert-new");
    });
  });

  describe("getChangeTypeLabel", () => {
    it("returns human-readable labels", () => {
      expect(getChangeTypeLabel("provision")).toBe("Provisioning");
      expect(getChangeTypeLabel("upgrade")).toBe("Upgrade");
      expect(getChangeTypeLabel("rollback")).toBe("Rollback");
      expect(getChangeTypeLabel("reconcile")).toBe("Reconciliation");
      expect(getChangeTypeLabel("connector_change")).toBe("Connector Change");
      expect(getChangeTypeLabel("config_change")).toBe("Configuration Change");
      expect(getChangeTypeLabel("manual")).toBe("Manual");
    });
  });
});
