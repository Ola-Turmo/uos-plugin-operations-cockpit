export var AlertType;
(function (AlertType) {
    AlertType["HealthCheck"] = "health_check";
    AlertType["ErrorRate"] = "error_rate";
    AlertType["Latency"] = "latency";
    AlertType["Security"] = "security";
})(AlertType || (AlertType = {}));
export var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["Critical"] = "critical";
    AlertSeverity["High"] = "high";
    AlertSeverity["Medium"] = "medium";
    AlertSeverity["Low"] = "low";
})(AlertSeverity || (AlertSeverity = {}));
export var AlertStatus;
(function (AlertStatus) {
    AlertStatus["Active"] = "active";
    AlertStatus["Acknowledged"] = "acknowledged";
    AlertStatus["Resolved"] = "resolved";
})(AlertStatus || (AlertStatus = {}));
