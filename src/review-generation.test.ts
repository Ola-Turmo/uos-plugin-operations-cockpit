import { describe, expect, it } from "vitest";
import {
  createConfidenceLabel,
  createEvidenceReference,
  createProbableCause,
  createRankedAction,
  generateOperatingReview,
  generateProbableCauses,
  generateRankedActions,
  highConfidence,
  mediumConfidence,
  lowConfidence,
  rankActions,
  computeOverallConfidence,
} from "./review-generation.js";

describe("review-generation module", () => {
  describe("createConfidenceLabel", () => {
    it("creates confidence label with all fields", () => {
      const label = createConfidenceLabel("high", "Strong evidence", "strong", ["Caveat 1"]);
      
      expect(label.level).toBe("high");
      expect(label.description).toBe("Strong evidence");
      expect(label.evidenceStrength).toBe("strong");
      expect(label.caveats).toHaveLength(1);
    });

    it("works without caveats", () => {
      const label = createConfidenceLabel("medium", "Moderate evidence", "moderate");
      expect(label.caveats).toBeUndefined();
    });
  });

  describe("highConfidence", () => {
    it("creates high confidence label with strong evidence", () => {
      const label = highConfidence("Test description", ["Caveat"]);
      
      expect(label.level).toBe("high");
      expect(label.evidenceStrength).toBe("strong");
      expect(label.description).toBe("Test description");
      expect(label.caveats).toContain("Caveat");
    });
  });

  describe("mediumConfidence", () => {
    it("creates medium confidence label with moderate evidence", () => {
      const label = mediumConfidence("Test description");
      
      expect(label.level).toBe("medium");
      expect(label.evidenceStrength).toBe("moderate");
    });
  });

  describe("lowConfidence", () => {
    it("creates low confidence label with weak evidence", () => {
      const label = lowConfidence("Test description");
      
      expect(label.level).toBe("low");
      expect(label.evidenceStrength).toBe("weak");
    });
  });

  describe("createEvidenceReference", () => {
    it("creates evidence reference with required fields", () => {
      const ref = createEvidenceReference("drift", "id1", "Label");
      
      expect(ref.type).toBe("drift");
      expect(ref.id).toBe("id1");
      expect(ref.label).toBe("Label");
    });

    it("includes optional url and timestamp", () => {
      const ref = createEvidenceReference("failure", "id2", "Failure", "http://example.com", "2024-01-01");
      
      expect(ref.url).toBe("http://example.com");
      expect(ref.timestamp).toBe("2024-01-01");
    });
  });

  describe("createProbableCause", () => {
    it("creates probable cause with all fields", () => {
      const cause = createProbableCause(
        "cause-1",
        "Test cause description",
        highConfidence("Evidence strong"),
        "confirmed",
        [createEvidenceReference("drift", "d1", "Drift evidence")]
      );

      expect(cause.id).toBe("cause-1");
      expect(cause.description).toBe("Test cause description");
      expect(cause.confidence.level).toBe("high");
      expect(cause.likelihood).toBe("confirmed");
      expect(cause.linkedEvidence).toHaveLength(1);
    });
  });

  describe("createRankedAction", () => {
    it("creates ranked action with all fields", () => {
      const action = createRankedAction(
        "action-1",
        "Test action description",
        1,
        highConfidence("Strong evidence"),
        {
          riskLevel: "medium",
          riskDescription: "Medium risk",
          potentialImpact: "Some impact",
          affectedAreas: ["area1"],
        },
        [createEvidenceReference("drift", "d1", "Drift")],
        "low",
        true
      );

      expect(action.id).toBe("action-1");
      expect(action.description).toBe("Test action description");
      expect(action.priority).toBe(1);
      expect(action.confidence.level).toBe("high");
      expect(action.risk.riskLevel).toBe("medium");
      expect(action.estimatedEffort).toBe("low");
      expect(action.rollbackAvailable).toBe(true);
    });
  });

  describe("generateProbableCauses", () => {
    it("generates causes from critical drift", () => {
      const causes = generateProbableCauses({
        driftItems: [
          { category: "agents", severity: "critical", description: "Critical drift" },
        ],
      });

      expect(causes.length).toBeGreaterThan(0);
      const driftCause = causes.find((c) => c.id === "drift-critical");
      expect(driftCause).toBeDefined();
      expect(driftCause?.likelihood).toBe("confirmed");
    });

    it("generates causes from connector failures", () => {
      const causes = generateProbableCauses({
        driftItems: [],
        connectorFailures: [
          { providerId: "slack", errorType: "auth_expired" },
        ],
      });

      const connectorCause = causes.find((c) => c.id === "connector-failures");
      expect(connectorCause).toBeDefined();
      expect(connectorCause?.description).toContain("slack");
    });

    it("generates causes from recent changes", () => {
      const causes = generateProbableCauses({
        driftItems: [],
        recentChanges: [
          { changeType: "upgrade", timestamp: new Date().toISOString() },
        ],
      });

      const changeCause = causes.find((c) => c.id === "recent-changes");
      expect(changeCause).toBeDefined();
    });
  });

  describe("generateRankedActions", () => {
    it("generates reconciliation action for critical drift", () => {
      const actions = generateRankedActions({
        driftItems: [
          { category: "agents", severity: "critical", description: "Critical" },
        ],
      });

      const reconcileAction = actions.find((a) => a.id === "action-reconcile-critical");
      expect(reconcileAction).toBeDefined();
      expect(reconcileAction?.priority).toBe(1);
      expect(reconcileAction?.risk.riskLevel).toBe("high");
      expect(reconcileAction?.rollbackAvailable).toBe(true);
    });

    it("generates reconnection action for connector issues", () => {
      const actions = generateRankedActions({
        driftItems: [],
        connectorIssues: [
          { providerId: "slack", issue: "Auth expired" },
        ],
      });

      const reconnectAction = actions.find((a) => a.id === "action-reconnect");
      expect(reconnectAction).toBeDefined();
      expect(reconnectAction?.description).toContain("slack");
    });

    it("prioritizes critical alerts", () => {
      const actions = generateRankedActions({
        driftItems: [],
        alerts: [
          { title: "Critical Alert", severity: "critical", domain: "core" },
        ],
      });

      const alertAction = actions.find((a) => a.id === "action-critical-alerts");
      expect(alertAction).toBeDefined();
      expect(alertAction?.priority).toBe(1);
    });
  });

  describe("rankActions", () => {
    it("sorts by priority first", () => {
      const actions = [
        createRankedAction("a", "Priority 2", 2, mediumConfidence(""), { riskLevel: "low", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
        createRankedAction("b", "Priority 1", 1, mediumConfidence(""), { riskLevel: "low", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
        createRankedAction("c", "Priority 3", 3, mediumConfidence(""), { riskLevel: "low", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
      ];

      const ranked = rankActions(actions);
      expect(ranked[0].priority).toBe(1);
      expect(ranked[1].priority).toBe(2);
      expect(ranked[2].priority).toBe(3);
    });

    it("then sorts by confidence (high before medium before low)", () => {
      const actions = [
        createRankedAction("a", "Low conf", 1, lowConfidence(""), { riskLevel: "low", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
        createRankedAction("b", "High conf", 1, highConfidence(""), { riskLevel: "low", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
        createRankedAction("c", "Med conf", 1, mediumConfidence(""), { riskLevel: "low", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
      ];

      const ranked = rankActions(actions);
      expect(ranked[0].description).toBe("High conf");
      expect(ranked[1].description).toBe("Med conf");
      expect(ranked[2].description).toBe("Low conf");
    });

    it("then sorts by risk (low before medium before high before critical)", () => {
      const actions = [
        createRankedAction("a", "High risk", 1, highConfidence(""), { riskLevel: "high", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
        createRankedAction("b", "Low risk", 1, highConfidence(""), { riskLevel: "low", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
        createRankedAction("c", "Med risk", 1, highConfidence(""), { riskLevel: "medium", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
      ];

      const ranked = rankActions(actions);
      expect(ranked[0].description).toBe("Low risk");
      expect(ranked[1].description).toBe("Med risk");
      expect(ranked[2].description).toBe("High risk");
    });
  });

  describe("computeOverallConfidence", () => {
    it("returns high for strong evidence base", () => {
      const causes = [
        createProbableCause("c1", "Cause 1", highConfidence(""), "confirmed", []),
        createProbableCause("c2", "Cause 2", highConfidence(""), "confirmed", []),
      ];
      const actions = [
        createRankedAction("a1", "Action 1", 1, highConfidence(""), { riskLevel: "low", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
      ];

      const confidence = computeOverallConfidence(causes, actions);
      expect(confidence.level).toBe("high");
    });

    it("returns medium for mixed evidence", () => {
      const causes = [
        createProbableCause("c1", "Cause 1", mediumConfidence(""), "probable", []),
      ];
      const actions = [
        createRankedAction("a1", "Action 1", 1, mediumConfidence(""), { riskLevel: "low", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
      ];

      const confidence = computeOverallConfidence(causes, actions);
      expect(confidence.level).toBe("medium");
    });

    it("returns low for weak evidence", () => {
      const causes = [
        createProbableCause("c1", "Cause 1", lowConfidence(""), "possible", []),
      ];
      const actions = [
        createRankedAction("a1", "Action 1", 1, lowConfidence(""), { riskLevel: "low", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
      ];

      const confidence = computeOverallConfidence(causes, actions);
      expect(confidence.level).toBe("low");
    });
  });

  describe("generateOperatingReview", () => {
    it("generates complete operating review", () => {
      const causes = [
        createProbableCause("c1", "Critical drift detected", highConfidence(""), "confirmed", []),
      ];
      const actions = [
        createRankedAction("a1", "Reconcile drift", 1, highConfidence(""), { riskLevel: "high", riskDescription: "", potentialImpact: "", affectedAreas: [] }),
      ];
      const evidence = [createEvidenceReference("drift", "d1", "Drift evidence")];

      const review = generateOperatingReview({
        reviewId: "review-1",
        stateSummary: {
          totalIssues: 5,
          criticalIssues: 2,
          openDriftItems: 3,
          connectorIssues: 0,
          recentChanges: 1,
        },
        probableCauses: causes,
        rankedActions: actions,
        linkedEvidence: evidence,
        nextScheduledReview: "2024-01-02T00:00:00Z",
      });

      expect(review.id).toBe("review-1");
      expect(review.title).toContain("Operating Review");
      expect(review.stateSummary.criticalIssues).toBe(2);
      expect(review.probableCauses).toHaveLength(1);
      expect(review.rankedActions).toHaveLength(1);
      expect(review.overallConfidence.level).toBe("high");
      expect(review.nextScheduledReview).toBeDefined();
    });
  });
});
