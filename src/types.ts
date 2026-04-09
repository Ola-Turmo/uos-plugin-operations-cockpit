/**
 * Operations Cockpit Type Definitions
 * 
 * Defines the core types for multi-domain health, evidence-backed reviews,
 * risk-framed alerts, change history, and confidence-labeled recommendations.
 */

// =============================================================================
// Health Domain Types
// =============================================================================

export type HealthStatus = "ok" | "degraded" | "error" | "unknown";

export type HealthDomain = "core" | "connectors" | "setup" | "skills" | "departments" | "tools";

export interface DomainHealth {
  domain: HealthDomain;
  status: HealthStatus;
  checkedAt: string;
  message?: string;
  metrics?: Record<string, string | number>;
}

export interface MultiDomainHealthSummary {
  overallStatus: HealthStatus;
  checkedAt: string;
  domains: DomainHealth[];
  summary: string;
}

// =============================================================================
// Alert Types with Risk Framing
// =============================================================================

export type AlertSeverity = "info" | "warning" | "critical";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskFraming {
  riskLevel: RiskLevel;
  riskDescription: string;
  potentialImpact: string;
  affectedAreas: string[];
  immediateActions?: string[];
}

export interface CockpitAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  domain: HealthDomain;
  risk: RiskFraming;
  linkedEvidence: EvidenceReference[];
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface EvidenceReference {
  type: "drift" | "failure" | "change" | "incident" | "review" | "metric";
  id: string;
  label: string;
  url?: string;
  timestamp?: string;
}

// =============================================================================
// Review Types with Evidence and Confidence
// =============================================================================

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceLabel {
  level: ConfidenceLevel;
  description: string;
  evidenceStrength: "strong" | "moderate" | "weak";
  caveats?: string[];
}

export interface RankedAction {
  id: string;
  description: string;
  priority: number;
  confidence: ConfidenceLabel;
  risk: RiskFraming;
  linkedEvidence: EvidenceReference[];
  estimatedEffort?: "low" | "medium" | "high";
  rollbackAvailable: boolean;
}

export interface ProbableCause {
  id: string;
  description: string;
  confidence: ConfidenceLabel;
  linkedEvidence: EvidenceReference[];
  likelihood: "confirmed" | "probable" | "possible";
}

export interface StateSummary {
  totalIssues: number;
  criticalIssues: number;
  openDriftItems: number;
  connectorIssues: number;
  recentChanges: number;
}

export interface EvidenceBackedReview {
  id: string;
  title: string;
  generatedAt: string;
  stateSummary: StateSummary;
  probableCauses: ProbableCause[];
  rankedActions: RankedAction[];
  linkedEvidence: EvidenceReference[];
  overallConfidence: ConfidenceLabel;
  nextScheduledReview?: string;
}

// =============================================================================
// Change History Types
// =============================================================================

export type ChangeType = "provision" | "upgrade" | "rollback" | "reconcile" | "connector_change" | "config_change" | "manual";

export interface ChangeHistoryEntry {
  id: string;
  changeType: ChangeType;
  description: string;
  domain: HealthDomain;
  timestamp: string;
  actor?: string;
  linkedIssueIds?: string[];
  linkedAlertIds?: string[];
  evidence: EvidenceReference[];
  rollbackAvailable: boolean;
  rollbackToVersion?: string;
}

export interface ChangeHistory {
  entries: ChangeHistoryEntry[];
  totalCount: number;
  since?: string;
}

// =============================================================================
// Remediation Types
// =============================================================================

export interface RemediationStep {
  order: number;
  description: string;
  risk: RiskFraming;
  estimatedTime?: string;
  automated: boolean;
}

export interface RemediationPlan {
  id: string;
  title: string;
  targetIssueId?: string;
  steps: RemediationStep[];
  confidence: ConfidenceLabel;
  risk: RiskFraming;
  linkedEvidence: EvidenceReference[];
  createdAt: string;
  applicableScenarios?: string[];
}

// =============================================================================
// Cockpit State Types
// =============================================================================

export interface CockpitState {
  health: MultiDomainHealthSummary;
  activeAlerts: CockpitAlert[];
  recentReviews: EvidenceBackedReview[];
  changeHistory: ChangeHistory;
  lastUpdated: string;
}
