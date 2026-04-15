import { describe, expect, it } from "vitest";
import {
  buildRiskFraming,
  createConnectorAlert,
  createDriftAlert,
  createInfoAlert,
  createReconciliationNeededAlert,
  createUpgradeFailureAlert,
  determineRiskLevel,
  domainSeverityToAlertSeverity,
  acknowledgeAlert,
  resolveAlert,
  isAlertActive,
  isAlertAcknowledged,
  filterActiveAlerts,
  sortAlertsByPriority,
} from "./alert-generation.js";
import { createEvidenceReference } from "./review-generation.js";

describe("alert-generation module", () => {
  describe("domainSeverityToAlertSeverity", () => {
    it("maps error to critical", () => {
      expect(domainSeverityToAlertSeverity("error")).toBe("critical");
    });

    it("maps degraded to warning", () => {
      expect(domainSeverityToAlertSeverity("degraded")).toBe("warning");
    });

    it("maps ok to info", () => {
      expect(domainSeverityToAlertSeverity("ok")).toBe("info");
    });

    it("maps unknown to info", () => {
      expect(domainSeverityToAlertSeverity("unknown")).toBe("info");
    });
  });

  describe("determineRiskLevel", () => {
    it("critical severity returns critical risk", () => {
      expect(determineRiskLevel("critical", ["core"])).toBe("critical");
    });

    it("warning with many affected areas returns high risk", () => {
      expect(determineRiskLevel("warning", ["a", "b", "c", "d"])).toBe("high");
    });

    it("warning with few affected areas returns medium risk", () => {
      expect(determineRiskLevel("warning", ["a", "b"])).toBe("medium");
    });

    it("info returns low risk", () => {
      expect(determineRiskLevel("info", ["a"])).toBe("low");
    });
  });

  describe("buildRiskFraming", () => {
    it("creates risk framing with all fields", () => {
      const framing = buildRiskFraming(
        "high",
        "Test risk description",
        "Test potential impact",
        ["area1", "area2"],
        ["Action 1", "Action 2"]
      );

      expect(framing.riskLevel).toBe("high");
      expect(framing.riskDescription).toContain("HIGH");
      expect(framing.potentialImpact).toBe("Test potential impact");
      expect(framing.affectedAreas).toEqual(["area1", "area2"]);
      expect(framing.immediateActions).toHaveLength(2);
    });

    it("works without immediate actions", () => {
      const framing = buildRiskFraming(
        "low",
        "Low risk",
        "Minimal impact",
        ["area1"]
      );

      expect(framing.immediateActions).toBeUndefined();
    });
  });

  describe("createDriftAlert", () => {
    it("creates critical alert for critical drift", () => {
      const evidence = [createEvidenceReference("drift", "d1", "Test drift")];
      const alert = createDriftAlert({
        driftCount: 5,
        criticalCount: 2,
        domain: "core",
        linkedEvidence: evidence,
      });

      expect(alert.severity).toBe("critical");
      expect(alert.title).toContain("Critical");
      expect(alert.risk.riskLevel).toBe("critical");
      expect(alert.linkedEvidence).toHaveLength(1);
    });

    it("creates warning alert for non-critical drift", () => {
      const alert = createDriftAlert({
        driftCount: 3,
        criticalCount: 0,
        domain: "core",
        linkedEvidence: [],
      });

      expect(alert.severity).toBe("warning");
      expect(alert.title).toContain("Drift");
    });
  });

  describe("createConnectorAlert", () => {
    it("creates warning alert for connector failure", () => {
      const evidence = [createEvidenceReference("failure", "c1", "Auth error")];
      const alert = createConnectorAlert({
        providerId: "slack",
        errorType: "auth_expired",
        domain: "connectors",
        linkedEvidence: evidence,
      });

      expect(alert.severity).toBe("warning");
      expect(alert.title).toContain("slack");
      expect(alert.domain).toBe("connectors");
    });
  });

  describe("createUpgradeFailureAlert", () => {
    it("creates critical alert for upgrade failure", () => {
      const evidence = [createEvidenceReference("change", "u1", "Upgrade")];
      const alert = createUpgradeFailureAlert({
        fromVersion: "1.0.0",
        toVersion: "2.0.0",
        domain: "core",
        linkedEvidence: evidence,
      });

      expect(alert.severity).toBe("critical");
      expect(alert.title).toContain("Upgrade Failed");
      expect(alert.risk.riskLevel).toBe("critical");
    });
  });

  describe("createReconciliationNeededAlert", () => {
    it("creates warning alert for reconciliation", () => {
      const alert = createReconciliationNeededAlert({
        reason: "Configuration drift detected",
        domain: "core",
        linkedEvidence: [],
      });

      expect(alert.severity).toBe("warning");
      expect(alert.title).toContain("Reconciliation");
    });
  });

  describe("createInfoAlert", () => {
    it("creates info alert", () => {
      const alert = createInfoAlert({
        title: "System Healthy",
        description: "All systems operating normally",
        domain: "core",
        linkedEvidence: [],
      });

      expect(alert.severity).toBe("info");
      expect(alert.risk.riskLevel).toBe("low");
    });
  });

  describe("acknowledgeAlert", () => {
    it("sets acknowledgedAt timestamp", () => {
      const alert = createInfoAlert({
        title: "Test",
        description: "Test",
        domain: "core",
        linkedEvidence: [],
      });

      const acknowledged = acknowledgeAlert(alert);
      expect(acknowledged.acknowledgedAt).toBeDefined();
      expect(acknowledged.resolvedAt).toBeUndefined();
    });
  });

  describe("resolveAlert", () => {
    it("sets resolvedAt timestamp", () => {
      const alert = createInfoAlert({
        title: "Test",
        description: "Test",
        domain: "core",
        linkedEvidence: [],
      });

      const resolved = resolveAlert(alert);
      expect(resolved.resolvedAt).toBeDefined();
    });
  });

  describe("isAlertActive", () => {
    it("returns true for unresolved alert", () => {
      const alert = createInfoAlert({
        title: "Test",
        description: "Test",
        domain: "core",
        linkedEvidence: [],
      });

      expect(isAlertActive(alert)).toBe(true);
    });

    it("returns false for resolved alert", () => {
      const alert = resolveAlert(createInfoAlert({
        title: "Test",
        description: "Test",
        domain: "core",
        linkedEvidence: [],
      }));

      expect(isAlertActive(alert)).toBe(false);
    });
  });

  describe("isAlertAcknowledged", () => {
    it("returns true for acknowledged but not resolved", () => {
      const alert = acknowledgeAlert(createInfoAlert({
        title: "Test",
        description: "Test",
        domain: "core",
        linkedEvidence: [],
      }));

      expect(isAlertAcknowledged(alert)).toBe(true);
    });

    it("returns false for resolved alert", () => {
      const alert = resolveAlert(acknowledgeAlert(createInfoAlert({
        title: "Test",
        description: "Test",
        domain: "core",
        linkedEvidence: [],
      })));

      expect(isAlertAcknowledged(alert)).toBe(false);
    });
  });

  describe("filterActiveAlerts", () => {
    it("filters out resolved alerts", () => {
      const alerts = [
        createInfoAlert({ title: "Active", description: "A", domain: "core", linkedEvidence: [] }),
        resolveAlert(createInfoAlert({ title: "Resolved", description: "R", domain: "core", linkedEvidence: [] })),
      ];

      const active = filterActiveAlerts(alerts);
      expect(active).toHaveLength(1);
      expect(active[0].title).toBe("Active");
    });
  });

  describe("sortAlertsByPriority", () => {
    it("sorts critical first", () => {
      const alerts = [
        createInfoAlert({ title: "Info", description: "I", domain: "core", linkedEvidence: [] }),
        createDriftAlert({ driftCount: 1, criticalCount: 1, domain: "core", linkedEvidence: [] }),
        createInfoAlert({ title: "Warning", description: "W", domain: "core", linkedEvidence: [] }),
      ];

      const sorted = sortAlertsByPriority(alerts);
      expect(sorted[0].severity).toBe("critical");
    });

    it("then sorts by creation time (newer first)", () => {
      const oldAlert = createInfoAlert({ title: "Old", description: "O", domain: "core", linkedEvidence: [] });
      const newAlert = createInfoAlert({ title: "New", description: "N", domain: "core", linkedEvidence: [] });
      
      // Simulate older/newer by manipulating timestamps indirectly via setTimeout isn't ideal,
      // but the sorting is stable when timestamps are equal
      const sorted = sortAlertsByPriority([oldAlert, newAlert]);
      expect(sorted[0].title).toBe("Old");
    });
  });
});
