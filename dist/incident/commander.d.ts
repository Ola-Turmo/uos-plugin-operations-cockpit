import type { Incident, IncidentStatus, IncidentRole, IncidentTimelineEntry } from '../types/incident';
import type { AlertStore } from '../core/alert-store';
export interface IncidentCommanderOptions {
    alertStore: AlertStore;
}
export declare class IncidentCommander {
    private incidents;
    private alertStore;
    constructor(opts: IncidentCommanderOptions);
    createIncident(input: {
        title: string;
        description?: string;
        severity?: Incident['severity'];
        alertId?: string;
        commanderId?: string;
    }): Incident;
    getIncident(incidentId: string): Incident | undefined;
    listIncidents(filter?: {
        status?: IncidentStatus;
    }): Incident[];
    updateIncident(incidentId: string, updates: Partial<Pick<Incident, 'status' | 'commander' | 'rootCause' | 'resolution' | 'postmortem'>>): Incident;
    assignRole(incidentId: string, role: IncidentRole, actorId: string): Incident;
    escalate(incidentId: string): Incident;
    close(incidentId: string, resolution?: string, postmortem?: string): Incident;
    addAlertToIncident(incidentId: string, alertId: string): Incident;
    generateTimeline(incidentId: string): IncidentTimelineEntry[];
    generatePostmortem(incidentId: string): string;
}
