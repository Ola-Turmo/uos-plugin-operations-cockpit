export declare enum IncidentStatus {
    Open = "open",
    Investigating = "investigating",
    Escalated = "escalated",
    Mitigated = "mitigated",
    Closed = "closed"
}
export declare enum IncidentRole {
    Commander = "commander",
    Responder = "responder",
    Observer = "observer"
}
export interface Incident {
    incidentId: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: IncidentStatus;
    createdAt: string;
    updatedAt: string;
    closedAt?: string;
    commander?: string;
    responders: IncidentRoleAssignment[];
    alertIds: string[];
    rootCause?: string;
    resolution?: string;
    postmortem?: string;
}
export interface IncidentRoleAssignment {
    role: IncidentRole;
    actorId: string;
    assignedAt: string;
}
export interface IncidentTimelineEntry {
    timestamp: string;
    event: string;
    actor: string;
    details?: string;
}
