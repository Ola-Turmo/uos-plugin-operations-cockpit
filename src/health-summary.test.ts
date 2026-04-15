import { describe, expect, it } from "vitest";
import {
  computeOverallStatus,
  createDomainHealth,
  generateHealthSummary,
  getConnectorHealth,
  getCoreHealth,
  getDepartmentsHealth,
  getSetupHealth,
  getSkillsHealth,
  getToolsHealth,
  buildMultiDomainHealthSummary,
} from "./health-summary.js";

describe("health-summary module", () => {
  describe("computeOverallStatus", () => {
    it("returns ok when all statuses are ok", () => {
      expect(computeOverallStatus(["ok", "ok", "ok"])).toBe("ok");
    });

    it("returns error if any status is error", () => {
      expect(computeOverallStatus(["ok", "error", "ok"])).toBe("error");
    });

    it("returns degraded if no error but some degraded", () => {
      expect(computeOverallStatus(["ok", "degraded", "ok"])).toBe("degraded");
    });

    it("returns unknown if no error or degraded but some unknown", () => {
      expect(computeOverallStatus(["ok", "unknown", "ok"])).toBe("unknown");
    });
  });

  describe("createDomainHealth", () => {
    it("creates a domain health entry with required fields", () => {
      const health = createDomainHealth("core", "ok");
      expect(health.domain).toBe("core");
      expect(health.status).toBe("ok");
      expect(health.checkedAt).toBeDefined();
    });

    it("includes optional message and metrics", () => {
      const health = createDomainHealth("connectors", "degraded", "Test message", { count: 5 });
      expect(health.message).toBe("Test message");
      expect(health.metrics?.count).toBe(5);
    });
  });

  describe("generateHealthSummary", () => {
    it("reports all domains healthy", () => {
      const domains = [
        createDomainHealth("core", "ok"),
        createDomainHealth("connectors", "ok"),
      ];
      expect(generateHealthSummary(domains)).toContain("All 2 domain(s) operating normally");
    });

    it("reports error domains", () => {
      const domains = [
        createDomainHealth("core", "error"),
        createDomainHealth("connectors", "ok"),
      ];
      expect(generateHealthSummary(domains)).toContain("1 domain(s) in error state");
    });

    it("reports degraded domains", () => {
      const domains = [
        createDomainHealth("core", "degraded"),
        createDomainHealth("connectors", "ok"),
      ];
      expect(generateHealthSummary(domains)).toContain("1 domain(s) degraded");
    });
  });

  describe("getCoreHealth", () => {
    it("returns ok when all systems healthy", () => {
      const health = getCoreHealth({
        provisioningHealthy: true,
        upgradeHealthy: true,
        driftStatus: "aligned",
      });
      expect(health.status).toBe("ok");
      expect(health.domain).toBe("core");
    });

    it("returns degraded when provisioning unhealthy", () => {
      const health = getCoreHealth({
        provisioningHealthy: false,
        upgradeHealthy: true,
      });
      expect(health.status).toBe("degraded");
    });

    it("returns degraded when drift detected", () => {
      const health = getCoreHealth({
        provisioningHealthy: true,
        upgradeHealthy: true,
        driftStatus: "drifted",
      });
      expect(health.status).toBe("degraded");
    });
  });

  describe("getConnectorHealth", () => {
    it("returns ok with healthy connectors", () => {
      const health = getConnectorHealth({
        certifiedConnectors: 5,
        failedConnectors: 0,
      });
      expect(health.status).toBe("ok");
      expect(health.metrics?.certified).toBe(5);
    });

    it("returns degraded when some connectors failed", () => {
      const health = getConnectorHealth({
        certifiedConnectors: 5,
        failedConnectors: 2,
      });
      expect(health.status).toBe("degraded");
    });

    it("returns error when most connectors failed", () => {
      const health = getConnectorHealth({
        certifiedConnectors: 2,
        failedConnectors: 3,
      });
      expect(health.status).toBe("error");
    });
  });

  describe("getSetupHealth", () => {
    it("returns ok when setup complete", () => {
      const health = getSetupHealth({
        lastSetupCompletedAt: "2024-01-01T00:00:00Z",
        setupInProgress: false,
      });
      expect(health.status).toBe("ok");
    });

    it("returns degraded when setup in progress", () => {
      const health = getSetupHealth({
        setupInProgress: true,
      });
      expect(health.status).toBe("degraded");
    });

    it("returns error on contract mismatch", () => {
      const health = getSetupHealth({
        setupInProgress: false,
        contractMismatch: true,
      });
      expect(health.status).toBe("error");
    });
  });

  describe("getSkillsHealth", () => {
    it("returns ok when no stale extractions", () => {
      const health = getSkillsHealth({
        catalogedSkills: 10,
        extractedSkills: 5,
        staleExtractions: 0,
      });
      expect(health.status).toBe("ok");
    });

    it("returns degraded when stale extractions exist", () => {
      const health = getSkillsHealth({
        catalogedSkills: 10,
        extractedSkills: 5,
        staleExtractions: 2,
      });
      expect(health.status).toBe("degraded");
    });
  });

  describe("getDepartmentsHealth", () => {
    it("returns ok when all workflows healthy", () => {
      const health = getDepartmentsHealth({
        activeWorkflows: 5,
        degradedWorkflows: 0,
      });
      expect(health.status).toBe("ok");
    });

    it("returns degraded when degraded workflows exist", () => {
      const health = getDepartmentsHealth({
        activeWorkflows: 5,
        degradedWorkflows: 2,
      });
      expect(health.status).toBe("degraded");
    });
  });

  describe("getToolsHealth", () => {
    it("returns ok when all tools healthy", () => {
      const health = getToolsHealth({
        registeredTools: 6,
        failedTools: 0,
      });
      expect(health.status).toBe("ok");
    });

    it("returns degraded when some tools failed", () => {
      const health = getToolsHealth({
        registeredTools: 6,
        failedTools: 2,
      });
      expect(health.status).toBe("degraded");
    });
  });

  describe("buildMultiDomainHealthSummary", () => {
    it("builds complete health summary", () => {
      const domains = [
        getCoreHealth({ provisioningHealthy: true, upgradeHealthy: true }),
        getConnectorHealth({ certifiedConnectors: 5, failedConnectors: 0 }),
      ];
      const summary = buildMultiDomainHealthSummary(domains);
      
      expect(summary.overallStatus).toBe("ok");
      expect(summary.domains).toHaveLength(2);
      expect(summary.checkedAt).toBeDefined();
      expect(summary.summary).toBeDefined();
    });
  });
});
