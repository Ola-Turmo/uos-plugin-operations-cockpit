// src/ui/index.tsx
import * as React from "react";
import { usePluginAction, usePluginData } from "@paperclipai/plugin-sdk/ui";
function getSeverityColor(severity) {
  switch (severity) {
    case "critical":
      return "#dc2626";
    case "warning":
      return "#f59e0b";
    case "info":
      return "#3b82f6";
    default:
      return "#6b7280";
  }
}
function getRiskColor(riskLevel) {
  switch (riskLevel) {
    case "critical":
      return "#dc2626";
    case "high":
      return "#f59e0b";
    case "medium":
      return "#eab308";
    case "low":
      return "#22c55e";
    default:
      return "#6b7280";
  }
}
function getStatusColor(status) {
  switch (status) {
    case "ok":
      return "#22c55e";
    case "degraded":
      return "#f59e0b";
    case "error":
      return "#dc2626";
    default:
      return "#6b7280";
  }
}
function getConfidenceColor(level) {
  switch (level) {
    case "high":
      return "#22c55e";
    case "medium":
      return "#f59e0b";
    case "low":
      return "#dc2626";
    default:
      return "#6b7280";
  }
}
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}
function getChangeTypeLabel(changeType) {
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
function getDomainLabel(domain) {
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}
function HealthBadge({ status }) {
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      style: {
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: "bold",
        backgroundColor: getStatusColor(status),
        color: "white"
      }
    },
    status.toUpperCase()
  );
}
function RiskBadge({ level }) {
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      style: {
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "bold",
        backgroundColor: getRiskColor(level),
        color: "white"
      }
    },
    level.toUpperCase(),
    " RISK"
  );
}
function ConfidenceBadge({ level }) {
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      style: {
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: "bold",
        backgroundColor: getConfidenceColor(level),
        color: "white"
      }
    },
    level.toUpperCase(),
    " CONFIDENCE"
  );
}
function AlertCard({ alert, onAcknowledge, onResolve }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        border: `2px solid ${getSeverityColor(alert.severity)}`,
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "8px",
        backgroundColor: "#f9fafb"
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", { style: { color: getSeverityColor(alert.severity) } }, alert.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#6b7280", marginTop: "2px" } }, getDomainLabel(alert.domain), " \u2022 ", formatTimestamp(alert.createdAt))), /* @__PURE__ */ React.createElement(HealthBadge, { status: alert.severity === "critical" ? "error" : alert.severity === "warning" ? "degraded" : "ok" })),
    /* @__PURE__ */ React.createElement("p", { style: { margin: "8px 0", fontSize: "14px" } }, alert.description),
    /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "8px" } }, /* @__PURE__ */ React.createElement(RiskBadge, { level: alert.risk.riskLevel }), /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "8px", fontSize: "12px", color: "#6b7280" } }, alert.risk.riskDescription)),
    alert.risk.affectedAreas.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement("strong", null, "Affected Areas:"), " ", alert.risk.affectedAreas.join(", ")),
    alert.risk.immediateActions && alert.risk.immediateActions.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement("strong", null, "Immediate Actions:"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0", paddingLeft: "20px" } }, alert.risk.immediateActions.map((action, i) => /* @__PURE__ */ React.createElement("li", { key: i }, action)))),
    alert.linkedEvidence.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement("strong", null, "Evidence:"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "4px 0", paddingLeft: "20px" } }, alert.linkedEvidence.map((e) => /* @__PURE__ */ React.createElement("li", { key: e.id }, e.label)))),
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", marginTop: "8px" } }, !alert.acknowledgedAt && onAcknowledge && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onAcknowledge(alert.id),
        style: {
          padding: "4px 12px",
          fontSize: "12px",
          borderRadius: "4px",
          border: "1px solid #d1d5db",
          backgroundColor: "white",
          cursor: "pointer"
        }
      },
      "Acknowledge"
    ), !alert.resolvedAt && onResolve && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onResolve(alert.id),
        style: {
          padding: "4px 12px",
          fontSize: "12px",
          borderRadius: "4px",
          border: "1px solid #22c55e",
          backgroundColor: "#22c55e",
          color: "white",
          cursor: "pointer"
        }
      },
      "Resolve"
    ), alert.acknowledgedAt && !alert.resolvedAt && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#6b7280" } }, "Acknowledged: ", formatTimestamp(alert.acknowledgedAt)), alert.resolvedAt && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#22c55e" } }, "Resolved: ", formatTimestamp(alert.resolvedAt)))
  );
}
function ChangeEntry({ change }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        padding: "8px",
        borderBottom: "1px solid #e5e7eb",
        fontSize: "13px"
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: "bold" } }, getChangeTypeLabel(change.changeType)), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#6b7280" } }, formatTimestamp(change.timestamp))),
    /* @__PURE__ */ React.createElement("div", { style: { marginTop: "4px" } }, change.description),
    change.actor && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#6b7280", marginTop: "2px" } }, "Actor: ", change.actor)
  );
}
function DomainHealthCard({ domain }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        padding: "12px",
        borderRadius: "8px",
        backgroundColor: "#f3f4f6",
        border: `1px solid ${getStatusColor(domain.status)}`
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement("strong", null, getDomainLabel(domain.domain)), /* @__PURE__ */ React.createElement(HealthBadge, { status: domain.status })),
    domain.message && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", marginBottom: "8px" } }, domain.message),
    domain.metrics && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#6b7280" } }, Object.entries(domain.metrics).map(([key, value]) => /* @__PURE__ */ React.createElement("div", { key }, key, ": ", String(value))))
  );
}
function StateSummaryCard({ summary }) {
  return /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px", marginBottom: "12px" } }, /* @__PURE__ */ React.createElement("strong", { style: { marginBottom: "8px", display: "block" } }, "State Summary"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", fontSize: "13px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280" } }, "Total Issues"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "18px", fontWeight: "bold" } }, summary.totalIssues)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280" } }, "Critical"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "18px", fontWeight: "bold", color: summary.criticalIssues > 0 ? "#dc2626" : "#22c55e" } }, summary.criticalIssues)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280" } }, "Drift Items"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "18px", fontWeight: "bold" } }, summary.openDriftItems)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280" } }, "Connector Issues"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "18px", fontWeight: "bold" } }, summary.connectorIssues)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280" } }, "Recent Changes"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "18px", fontWeight: "bold" } }, summary.recentChanges))));
}
function RankedActionItem({ action }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        padding: "12px",
        borderRadius: "8px",
        backgroundColor: "#fff",
        border: "1px solid #e5e7eb",
        marginBottom: "8px"
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
          display: "inline-block",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: "#3b82f6",
          color: "white",
          textAlign: "center",
          lineHeight: "24px",
          fontSize: "12px",
          fontWeight: "bold"
        }
      },
      action.priority
    ), /* @__PURE__ */ React.createElement("strong", null, action.description)), /* @__PURE__ */ React.createElement(ConfidenceBadge, { level: action.confidence.level })),
    /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "8px" } }, /* @__PURE__ */ React.createElement(RiskBadge, { level: action.risk.riskLevel })),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#6b7280" } }, action.confidence.description),
    action.estimatedEffort && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", marginTop: "4px" } }, /* @__PURE__ */ React.createElement("strong", null, "Effort:"), " ", action.estimatedEffort),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", marginTop: "4px" } }, /* @__PURE__ */ React.createElement("strong", null, "Impact:"), " ", action.risk.potentialImpact),
    action.rollbackAvailable && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#22c55e", marginTop: "4px" } }, "\u2713 Rollback available")
  );
}
function OperatingReviewCard({ review }) {
  return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px", marginBottom: "12px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "16px" } }, review.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#6b7280", marginTop: "4px" } }, "Generated: ", formatTimestamp(review.generatedAt))), /* @__PURE__ */ React.createElement(ConfidenceBadge, { level: review.overallConfidence.level })), /* @__PURE__ */ React.createElement(StateSummaryCard, { summary: review.stateSummary }), review.probableCauses.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "12px" } }, /* @__PURE__ */ React.createElement("strong", { style: { marginBottom: "8px", display: "block" } }, "Probable Causes"), review.probableCauses.map((cause) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: cause.id,
      style: {
        padding: "8px",
        backgroundColor: "#fff",
        borderRadius: "4px",
        marginBottom: "4px",
        borderLeft: `3px solid ${getConfidenceColor(cause.confidence.level)}`
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px" } }, cause.description),
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#6b7280", marginTop: "4px" } }, cause.confidence.description, " \u2022 Likelihood: ", cause.likelihood)
  ))), review.rankedActions.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "12px" } }, /* @__PURE__ */ React.createElement("strong", { style: { marginBottom: "8px", display: "block" } }, "Ranked Actions"), review.rankedActions.slice(0, 5).map((action) => /* @__PURE__ */ React.createElement(RankedActionItem, { key: action.id, action })), review.rankedActions.length > 5 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#6b7280", textAlign: "center" } }, "+ ", review.rankedActions.length - 5, " more actions")), review.nextScheduledReview && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#6b7280" } }, "Next scheduled review: ", formatTimestamp(review.nextScheduledReview)));
}
function DashboardWidget(_props) {
  const overviewData = usePluginData("cockpitOverview");
  const healthData = usePluginData("health");
  const ping = usePluginAction("ping");
  const generateReviewAction = usePluginAction("generateReview");
  const acknowledgeAlertAction = usePluginAction("acknowledgeAlert");
  const resolveAlertAction = usePluginAction("resolveAlert");
  const [showReview, setShowReview] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("overview");
  const loading = overviewData.loading || healthData.loading;
  const error = overviewData.error;
  const overview = overviewData.data;
  const health = healthData.data;
  if (loading) {
    return /* @__PURE__ */ React.createElement("div", null, "Loading Operations Cockpit...");
  }
  if (error) {
    return /* @__PURE__ */ React.createElement("div", { style: { color: "#dc2626" } }, "Error loading cockpit: ", error.message);
  }
  const effectiveOverview = overview ?? (health ? {
    health,
    activeAlerts: [],
    alertSummary: { total: 0, critical: 0, warning: 0, info: 0 },
    recentChanges: [],
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  } : null);
  const handleAcknowledgeAlert = (alertId) => {
    if (acknowledgeAlertAction) {
      acknowledgeAlertAction({ alertId });
    }
  };
  const handleResolveAlert = (alertId) => {
    if (resolveAlertAction) {
      resolveAlertAction({ alertId });
    }
  };
  const handleGenerateReview = async () => {
    if (generateReviewAction) {
      const review = await generateReviewAction({ reviewId: `review-${Date.now()}` });
      setShowReview(review);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px", maxWidth: "800px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "18px" } }, "Operations Cockpit"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, effectiveOverview && /* @__PURE__ */ React.createElement(HealthBadge, { status: effectiveOverview.health.overallStatus }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => ping && ping(),
      style: {
        padding: "4px 12px",
        fontSize: "12px",
        borderRadius: "4px",
        border: "1px solid #d1d5db",
        backgroundColor: "white",
        cursor: "pointer"
      }
    },
    "Ping"
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "4px", marginBottom: "16px", borderBottom: "1px solid #e5e7eb" } }, ["overview", "alerts", "review", "changes"].map((tab) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: tab,
      onClick: () => setActiveTab(tab),
      style: {
        padding: "8px 16px",
        fontSize: "13px",
        border: "none",
        backgroundColor: activeTab === tab ? "#3b82f6" : "transparent",
        color: activeTab === tab ? "white" : "#6b7280",
        cursor: "pointer",
        borderRadius: "4px 4px 0 0"
      }
    },
    tab.charAt(0).toUpperCase() + tab.slice(1),
    tab === "alerts" && effectiveOverview && effectiveOverview.alertSummary.total > 0 && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "4px", fontSize: "11px" } }, "(", effectiveOverview.alertSummary.total, ")")
  ))), activeTab === "overview" && effectiveOverview && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "16px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px", color: "#6b7280", marginBottom: "8px" } }, "Last updated: ", formatTimestamp(effectiveOverview.lastUpdated)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "14px", marginBottom: "12px" } }, effectiveOverview.health.summary)), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "16px" } }, /* @__PURE__ */ React.createElement("strong", { style: { marginBottom: "8px", display: "block" } }, "Domain Health"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" } }, effectiveOverview.health.domains.map((domain) => /* @__PURE__ */ React.createElement(DomainHealthCard, { key: domain.domain, domain })))), effectiveOverview.alertSummary.total > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "16px" } }, /* @__PURE__ */ React.createElement("strong", { style: { marginBottom: "8px", display: "block" } }, "Alert Summary"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", backgroundColor: "#fee2e2", borderRadius: "8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "24px", fontWeight: "bold", color: "#dc2626" } }, effectiveOverview.alertSummary.critical), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#991b1b" } }, "Critical")), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", backgroundColor: "#fef3c7", borderRadius: "8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "24px", fontWeight: "bold", color: "#f59e0b" } }, effectiveOverview.alertSummary.warning), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#92400e" } }, "Warning")), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", backgroundColor: "#dbeafe", borderRadius: "8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "24px", fontWeight: "bold", color: "#3b82f6" } }, effectiveOverview.alertSummary.info), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#1e40af" } }, "Info")), /* @__PURE__ */ React.createElement("div", { style: { padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "24px", fontWeight: "bold", color: "#374151" } }, effectiveOverview.alertSummary.total), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#6b7280" } }, "Total")))), effectiveOverview.recentChanges.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", { style: { marginBottom: "8px", display: "block" } }, "Recent Changes (24h)"), /* @__PURE__ */ React.createElement("div", { style: { backgroundColor: "#f9fafb", borderRadius: "8px", overflow: "hidden" } }, effectiveOverview.recentChanges.slice(0, 3).map((change) => /* @__PURE__ */ React.createElement(ChangeEntry, { key: change.id, change }))))), activeTab === "alerts" && effectiveOverview && /* @__PURE__ */ React.createElement("div", null, effectiveOverview.activeAlerts.length > 0 ? effectiveOverview.activeAlerts.map((alert) => /* @__PURE__ */ React.createElement(
    AlertCard,
    {
      key: alert.id,
      alert,
      onAcknowledge: handleAcknowledgeAlert,
      onResolve: handleResolveAlert
    }
  )) : /* @__PURE__ */ React.createElement("div", { style: { padding: "32px", textAlign: "center", color: "#6b7280" } }, "No active alerts. System is healthy.")), activeTab === "review" && /* @__PURE__ */ React.createElement("div", null, !showReview ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "32px" } }, /* @__PURE__ */ React.createElement("p", { style: { marginBottom: "16px", color: "#6b7280" } }, "Generate an evidence-backed operating review with ranked actions and risk framing."), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleGenerateReview,
      style: {
        padding: "12px 24px",
        fontSize: "14px",
        borderRadius: "8px",
        border: "none",
        backgroundColor: "#3b82f6",
        color: "white",
        cursor: "pointer"
      }
    },
    "Generate Operating Review"
  )) : /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "16px" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowReview(null),
      style: {
        padding: "4px 12px",
        fontSize: "12px",
        borderRadius: "4px",
        border: "1px solid #d1d5db",
        backgroundColor: "white",
        cursor: "pointer"
      }
    },
    "\u2190 Back"
  )), /* @__PURE__ */ React.createElement(OperatingReviewCard, { review: showReview }))), activeTab === "changes" && effectiveOverview && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: "12px" } }, /* @__PURE__ */ React.createElement("strong", null, "Change History"), /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "8px", fontSize: "12px", color: "#6b7280" } }, "(", effectiveOverview.recentChanges.length, " recent)")), effectiveOverview.recentChanges.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { backgroundColor: "#f9fafb", borderRadius: "8px", overflow: "hidden" } }, effectiveOverview.recentChanges.map((change) => /* @__PURE__ */ React.createElement(ChangeEntry, { key: change.id, change }))) : /* @__PURE__ */ React.createElement("div", { style: { padding: "32px", textAlign: "center", color: "#6b7280" } }, "No change history available yet.")));
}
export {
  DashboardWidget
};
//# sourceMappingURL=index.js.map
