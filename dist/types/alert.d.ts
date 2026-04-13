export declare enum AlertType {
    HealthCheck = "health_check",
    ErrorRate = "error_rate",
    Latency = "latency",
    Security = "security"
}
export declare enum AlertSeverity {
    Critical = "critical",
    High = "high",
    Medium = "medium",
    Low = "low"
}
export declare enum AlertStatus {
    Active = "active",
    Acknowledged = "acknowledged",
    Resolved = "resolved"
}
export interface Alert {
    alertId: string;
    type: AlertType;
    severity: AlertSeverity;
    status: AlertStatus;
    title: string;
    description: string;
    createdAt: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
    acknowledgedBy?: string;
    resolvedBy?: string;
    sourceToolId: string;
    domain: string;
    metadata: Record<string, unknown>;
}
export interface AlertDetail {
    alert: Alert;
    timeline: AlertTimelineEntry[];
    relatedAlerts: string[];
    suggestedRemediation?: string;
}
export interface AlertTimelineEntry {
    timestamp: string;
    action: string;
    actor: string;
    note?: string;
}
