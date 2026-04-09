import * as React from "react";
import { usePluginAction, usePluginData, type PluginWidgetProps } from "@paperclipai/plugin-sdk/ui";

// =============================================================================
// Type Definitions (must match worker.ts types)
// =============================================================================

type HealthStatus = "ok" | "degraded" | "error" | "unknown";
type HealthDomain = "core" | "connectors" | "setup" | "skills" | "departments" | "tools";
type AlertSeverity = "info" | "warning" | "critical";
type RiskLevel = "low" | "medium" | "high" | "critical";
type ConfidenceLevel = "high" | "medium" | "low";
type ChangeType = "provision" | "upgrade" | "rollback" | "reconcile" | "connector_change" | "config_change" | "manual";

interface DomainHealth {
  domain: HealthDomain;
  status: HealthStatus;
  checkedAt: string;
  message?: string;
  metrics?: Record<string, string | number>;
}

interface MultiDomainHealthSummary {
  overallStatus: HealthStatus;
  checkedAt: string;
  domains: DomainHealth[];
  summary: string;
}

interface RiskFraming {
  riskLevel: RiskLevel;
  riskDescription: string;
  potentialImpact: string;
  affectedAreas: string[];
  immediateActions?: string[];
}

interface EvidenceReference {
  type: "drift" | "failure" | "change" | "incident" | "review" | "metric";
  id: string;
  label: string;
  url?: string;
  timestamp?: string;
}

interface CockpitAlert {
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

interface ChangeHistoryEntry {
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

interface StateSummary {
  totalIssues: number;
  criticalIssues: number;
  openDriftItems: number;
  connectorIssues: number;
  recentChanges: number;
}

interface ConfidenceLabel {
  level: ConfidenceLevel;
  description: string;
  evidenceStrength: "strong" | "moderate" | "weak";
  caveats?: string[];
}

interface RankedAction {
  id: string;
  description: string;
  priority: number;
  confidence: ConfidenceLabel;
  risk: RiskFraming;
  linkedEvidence: EvidenceReference[];
  estimatedEffort?: "low" | "medium" | "high";
  rollbackAvailable: boolean;
}

interface ProbableCause {
  id: string;
  description: string;
  confidence: ConfidenceLabel;
  linkedEvidence: EvidenceReference[];
  likelihood: "confirmed" | "probable" | "possible";
}

interface EvidenceBackedReview {
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

interface CockpitOverview {
  health: MultiDomainHealthSummary;
  activeAlerts: CockpitAlert[];
  alertSummary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  recentChanges: ChangeHistoryEntry[];
  lastUpdated: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case "critical": return "#dc2626";
    case "warning": return "#f59e0b";
    case "info": return "#3b82f6";
    default: return "#6b7280";
  }
}

function getRiskColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case "critical": return "#dc2626";
    case "high": return "#f59e0b";
    case "medium": return "#eab308";
    case "low": return "#22c55e";
    default: return "#6b7280";
  }
}

function getStatusColor(status: HealthStatus): string {
  switch (status) {
    case "ok": return "#22c55e";
    case "degraded": return "#f59e0b";
    case "error": return "#dc2626";
    default: return "#6b7280";
  }
}

function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case "high": return "#22c55e";
    case "medium": return "#f59e0b";
    case "low": return "#dc2626";
    default: return "#6b7280";
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function getChangeTypeLabel(changeType: ChangeType): string {
  switch (changeType) {
    case "provision": return "Provisioning";
    case "upgrade": return "Upgrade";
    case "rollback": return "Rollback";
    case "reconcile": return "Reconciliation";
    case "connector_change": return "Connector Change";
    case "config_change": return "Configuration Change";
    case "manual": return "Manual";
    default: return "Unknown";
  }
}

function getDomainLabel(domain: HealthDomain): string {
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

// =============================================================================
// Component: Health Badge
// =============================================================================

function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: "bold",
        backgroundColor: getStatusColor(status),
        color: "white",
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}

// =============================================================================
// Component: Risk Badge
// =============================================================================

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "bold",
        backgroundColor: getRiskColor(level),
        color: "white",
      }}
    >
      {level.toUpperCase()} RISK
    </span>
  );
}

// =============================================================================
// Component: Confidence Badge
// =============================================================================

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "bold",
        backgroundColor: getConfidenceColor(level),
        color: "white",
      }}
    >
      {level.toUpperCase()} CONFIDENCE
    </span>
  );
}

// =============================================================================
// Component: Alert Card
// =============================================================================

function AlertCard({ alert, onAcknowledge, onResolve }: {
  alert: CockpitAlert;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}) {
  return (
    <div
      style={{
        border: `2px solid ${getSeverityColor(alert.severity)}`,
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "8px",
        backgroundColor: "#f9fafb",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <strong style={{ color: getSeverityColor(alert.severity) }}>
            {alert.title}
          </strong>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
            {getDomainLabel(alert.domain)} • {formatTimestamp(alert.createdAt)}
          </div>
        </div>
        <HealthBadge status={alert.severity === "critical" ? "error" : alert.severity === "warning" ? "degraded" : "ok"} />
      </div>

      <p style={{ margin: "8px 0", fontSize: "14px" }}>{alert.description}</p>

      <div style={{ marginBottom: "8px" }}>
        <RiskBadge level={alert.risk.riskLevel} />
        <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6b7280" }}>
          {alert.risk.riskDescription}
        </span>
      </div>

      {alert.risk.affectedAreas.length > 0 && (
        <div style={{ fontSize: "12px", marginBottom: "8px" }}>
          <strong>Affected Areas:</strong> {alert.risk.affectedAreas.join(", ")}
        </div>
      )}

      {alert.risk.immediateActions && alert.risk.immediateActions.length > 0 && (
        <div style={{ fontSize: "12px", marginBottom: "8px" }}>
          <strong>Immediate Actions:</strong>
          <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
            {alert.risk.immediateActions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {alert.linkedEvidence.length > 0 && (
        <div style={{ fontSize: "12px", marginBottom: "8px" }}>
          <strong>Evidence:</strong>
          <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
            {alert.linkedEvidence.map((e) => (
              <li key={e.id}>{e.label}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        {!alert.acknowledgedAt && onAcknowledge && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            Acknowledge
          </button>
        )}
        {!alert.resolvedAt && onResolve && (
          <button
            onClick={() => onResolve(alert.id)}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              borderRadius: "4px",
              border: "1px solid #22c55e",
              backgroundColor: "#22c55e",
              color: "white",
              cursor: "pointer",
            }}
          >
            Resolve
          </button>
        )}
        {alert.acknowledgedAt && !alert.resolvedAt && (
          <span style={{ fontSize: "11px", color: "#6b7280" }}>
            Acknowledged: {formatTimestamp(alert.acknowledgedAt)}
          </span>
        )}
        {alert.resolvedAt && (
          <span style={{ fontSize: "11px", color: "#22c55e" }}>
            Resolved: {formatTimestamp(alert.resolvedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Component: Change History Entry
// =============================================================================

function ChangeEntry({ change }: { change: ChangeHistoryEntry }) {
  return (
    <div
      style={{
        padding: "8px",
        borderBottom: "1px solid #e5e7eb",
        fontSize: "13px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: "bold" }}>{getChangeTypeLabel(change.changeType)}</span>
        <span style={{ fontSize: "11px", color: "#6b7280" }}>{formatTimestamp(change.timestamp)}</span>
      </div>
      <div style={{ marginTop: "4px" }}>{change.description}</div>
      {change.actor && (
        <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>Actor: {change.actor}</div>
      )}
    </div>
  );
}

// =============================================================================
// Component: Domain Health
// =============================================================================

function DomainHealthCard({ domain }: { domain: DomainHealth }) {
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "8px",
        backgroundColor: "#f3f4f6",
        border: `1px solid ${getStatusColor(domain.status)}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <strong>{getDomainLabel(domain.domain)}</strong>
        <HealthBadge status={domain.status} />
      </div>
      {domain.message && (
        <div style={{ fontSize: "12px", marginBottom: "8px" }}>{domain.message}</div>
      )}
      {domain.metrics && (
        <div style={{ fontSize: "11px", color: "#6b7280" }}>
          {Object.entries(domain.metrics).map(([key, value]) => (
            <div key={key}>{key}: {String(value)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Component: State Summary
// =============================================================================

function StateSummaryCard({ summary }: { summary: StateSummary }) {
  return (
    <div style={{ padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px", marginBottom: "12px" }}>
      <strong style={{ marginBottom: "8px", display: "block" }}>State Summary</strong>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", fontSize: "13px" }}>
        <div>
          <span style={{ color: "#6b7280" }}>Total Issues</span>
          <div style={{ fontSize: "18px", fontWeight: "bold" }}>{summary.totalIssues}</div>
        </div>
        <div>
          <span style={{ color: "#6b7280" }}>Critical</span>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: summary.criticalIssues > 0 ? "#dc2626" : "#22c55e" }}>
            {summary.criticalIssues}
          </div>
        </div>
        <div>
          <span style={{ color: "#6b7280" }}>Drift Items</span>
          <div style={{ fontSize: "18px", fontWeight: "bold" }}>{summary.openDriftItems}</div>
        </div>
        <div>
          <span style={{ color: "#6b7280" }}>Connector Issues</span>
          <div style={{ fontSize: "18px", fontWeight: "bold" }}>{summary.connectorIssues}</div>
        </div>
        <div>
          <span style={{ color: "#6b7280" }}>Recent Changes</span>
          <div style={{ fontSize: "18px", fontWeight: "bold" }}>{summary.recentChanges}</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Component: Ranked Action
// =============================================================================

function RankedActionItem({ action }: { action: RankedAction }) {
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "8px",
        backgroundColor: "#fff",
        border: "1px solid #e5e7eb",
        marginBottom: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-block",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "#3b82f6",
              color: "white",
              textAlign: "center",
              lineHeight: "24px",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {action.priority}
          </span>
          <strong>{action.description}</strong>
        </div>
        <ConfidenceBadge level={action.confidence.level} />
      </div>

      <div style={{ marginBottom: "8px" }}>
        <RiskBadge level={action.risk.riskLevel} />
      </div>

      <div style={{ fontSize: "12px", color: "#6b7280" }}>
        {action.confidence.description}
      </div>

      {action.estimatedEffort && (
        <div style={{ fontSize: "12px", marginTop: "4px" }}>
          <strong>Effort:</strong> {action.estimatedEffort}
        </div>
      )}

      <div style={{ fontSize: "12px", marginTop: "4px" }}>
        <strong>Impact:</strong> {action.risk.potentialImpact}
      </div>

      {action.rollbackAvailable && (
        <div style={{ fontSize: "11px", color: "#22c55e", marginTop: "4px" }}>
          ✓ Rollback available
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Component: Operating Review
// =============================================================================

function OperatingReviewCard({ review }: { review: EvidenceBackedReview }) {
  return (
    <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px", marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <strong style={{ fontSize: "16px" }}>{review.title}</strong>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            Generated: {formatTimestamp(review.generatedAt)}
          </div>
        </div>
        <ConfidenceBadge level={review.overallConfidence.level} />
      </div>

      <StateSummaryCard summary={review.stateSummary} />

      {review.probableCauses.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <strong style={{ marginBottom: "8px", display: "block" }}>Probable Causes</strong>
          {review.probableCauses.map((cause) => (
            <div
              key={cause.id}
              style={{
                padding: "8px",
                backgroundColor: "#fff",
                borderRadius: "4px",
                marginBottom: "4px",
                borderLeft: `3px solid ${getConfidenceColor(cause.confidence.level)}`,
              }}
            >
              <div style={{ fontSize: "13px" }}>{cause.description}</div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
                {cause.confidence.description} • Likelihood: {cause.likelihood}
              </div>
            </div>
          ))}
        </div>
      )}

      {review.rankedActions.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <strong style={{ marginBottom: "8px", display: "block" }}>Ranked Actions</strong>
          {review.rankedActions.slice(0, 5).map((action) => (
            <RankedActionItem key={action.id} action={action} />
          ))}
          {review.rankedActions.length > 5 && (
            <div style={{ fontSize: "12px", color: "#6b7280", textAlign: "center" }}>
              + {review.rankedActions.length - 5} more actions
            </div>
          )}
        </div>
      )}

      {review.nextScheduledReview && (
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          Next scheduled review: {formatTimestamp(review.nextScheduledReview)}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Dashboard Widget
// =============================================================================

export function DashboardWidget(_props: PluginWidgetProps) {
  const overviewData = usePluginData("cockpitOverview");
  const healthData = usePluginData("health");
  const ping = usePluginAction("ping");
  const generateReviewAction = usePluginAction("generateReview");
  const acknowledgeAlertAction = usePluginAction("acknowledgeAlert");
  const resolveAlertAction = usePluginAction("resolveAlert");

  const [showReview, setShowReview] = React.useState<EvidenceBackedReview | null>(null);
  const [activeTab, setActiveTab] = React.useState<"overview" | "alerts" | "review" | "changes">("overview");

  const loading = overviewData.loading || healthData.loading;
  const error = overviewData.error;
  const overview = overviewData.data as CockpitOverview | undefined;
  const health = healthData.data as MultiDomainHealthSummary | undefined;

  if (loading) {
    return <div>Loading Operations Cockpit...</div>;
  }

  if (error) {
    return <div style={{ color: "#dc2626" }}>Error loading cockpit: {error.message}</div>;
  }

  const effectiveOverview = overview ?? (health ? {
    health,
    activeAlerts: [] as CockpitAlert[],
    alertSummary: { total: 0, critical: 0, warning: 0, info: 0 },
    recentChanges: [] as ChangeHistoryEntry[],
    lastUpdated: new Date().toISOString()
  } : null);

  const handleAcknowledgeAlert = (alertId: string) => {
    if (acknowledgeAlertAction) {
      acknowledgeAlertAction({ alertId });
    }
  };

  const handleResolveAlert = (alertId: string) => {
    if (resolveAlertAction) {
      resolveAlertAction({ alertId });
    }
  };

  const handleGenerateReview = async () => {
    if (generateReviewAction) {
      const review = await generateReviewAction({ reviewId: `review-${Date.now()}` }) as EvidenceBackedReview;
      setShowReview(review);
    }
  };

  return (
    <div style={{ padding: "16px", maxWidth: "800px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <strong style={{ fontSize: "18px" }}>Operations Cockpit</strong>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {effectiveOverview && (
            <HealthBadge status={effectiveOverview.health.overallStatus} />
          )}
          <button
            onClick={() => ping && ping()}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            Ping
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
        {(["overview", "alerts", "review", "changes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              border: "none",
              backgroundColor: activeTab === tab ? "#3b82f6" : "transparent",
              color: activeTab === tab ? "white" : "#6b7280",
              cursor: "pointer",
              borderRadius: "4px 4px 0 0",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "alerts" && effectiveOverview && effectiveOverview.alertSummary.total > 0 && (
              <span style={{ marginLeft: "4px", fontSize: "11px" }}>
                ({effectiveOverview.alertSummary.total})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && effectiveOverview && (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
              Last updated: {formatTimestamp(effectiveOverview.lastUpdated)}
            </div>
            <div style={{ fontSize: "14px", marginBottom: "12px" }}>
              {effectiveOverview.health.summary}
            </div>
          </div>

          {/* Domain Health */}
          <div style={{ marginBottom: "16px" }}>
            <strong style={{ marginBottom: "8px", display: "block" }}>Domain Health</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
              {effectiveOverview.health.domains.map((domain) => (
                <DomainHealthCard key={domain.domain} domain={domain} />
              ))}
            </div>
          </div>

          {/* Alert Summary */}
          {effectiveOverview.alertSummary.total > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <strong style={{ marginBottom: "8px", display: "block" }}>Alert Summary</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                <div style={{ padding: "12px", backgroundColor: "#fee2e2", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc2626" }}>
                    {effectiveOverview.alertSummary.critical}
                  </div>
                  <div style={{ fontSize: "11px", color: "#991b1b" }}>Critical</div>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#fef3c7", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>
                    {effectiveOverview.alertSummary.warning}
                  </div>
                  <div style={{ fontSize: "11px", color: "#92400e" }}>Warning</div>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#dbeafe", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#3b82f6" }}>
                    {effectiveOverview.alertSummary.info}
                  </div>
                  <div style={{ fontSize: "11px", color: "#1e40af" }}>Info</div>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#374151" }}>
                    {effectiveOverview.alertSummary.total}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6b7280" }}>Total</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Changes */}
          {effectiveOverview.recentChanges.length > 0 && (
            <div>
              <strong style={{ marginBottom: "8px", display: "block" }}>Recent Changes (24h)</strong>
              <div style={{ backgroundColor: "#f9fafb", borderRadius: "8px", overflow: "hidden" }}>
                {effectiveOverview.recentChanges.slice(0, 3).map((change) => (
                  <ChangeEntry key={change.id} change={change} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && effectiveOverview && (
        <div>
          {effectiveOverview.activeAlerts.length > 0 ? (
            effectiveOverview.activeAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledgeAlert}
                onResolve={handleResolveAlert}
              />
            ))
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
              No active alerts. System is healthy.
            </div>
          )}
        </div>
      )}

      {/* Review Tab */}
      {activeTab === "review" && (
        <div>
          {!showReview ? (
            <div style={{ textAlign: "center", padding: "32px" }}>
              <p style={{ marginBottom: "16px", color: "#6b7280" }}>
                Generate an evidence-backed operating review with ranked actions and risk framing.
              </p>
              <button
                onClick={handleGenerateReview}
                style={{
                  padding: "12px 24px",
                  fontSize: "14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Generate Operating Review
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <button
                  onClick={() => setShowReview(null)}
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "white",
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
              </div>
              <OperatingReviewCard review={showReview} />
            </div>
          )}
        </div>
      )}

      {/* Changes Tab */}
      {activeTab === "changes" && effectiveOverview && (
        <div>
          <div style={{ marginBottom: "12px" }}>
            <strong>Change History</strong>
            <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6b7280" }}>
              ({effectiveOverview.recentChanges.length} recent)
            </span>
          </div>
          {effectiveOverview.recentChanges.length > 0 ? (
            <div style={{ backgroundColor: "#f9fafb", borderRadius: "8px", overflow: "hidden" }}>
              {effectiveOverview.recentChanges.map((change) => (
                <ChangeEntry key={change.id} change={change} />
              ))}
            </div>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
              No change history available yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
