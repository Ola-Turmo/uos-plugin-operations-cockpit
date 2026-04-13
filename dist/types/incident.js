export var IncidentStatus;
(function (IncidentStatus) {
    IncidentStatus["Open"] = "open";
    IncidentStatus["Investigating"] = "investigating";
    IncidentStatus["Escalated"] = "escalated";
    IncidentStatus["Mitigated"] = "mitigated";
    IncidentStatus["Closed"] = "closed";
})(IncidentStatus || (IncidentStatus = {}));
export var IncidentRole;
(function (IncidentRole) {
    IncidentRole["Commander"] = "commander";
    IncidentRole["Responder"] = "responder";
    IncidentRole["Observer"] = "observer";
})(IncidentRole || (IncidentRole = {}));
