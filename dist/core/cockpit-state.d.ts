import { Alert } from '../types/alert';
import { Incident } from '../types/incident';
import { ToolHealthRecord } from '../types/health';
import { ChangeRecord, CockpitOverview, CockpitMetrics } from '../types/cockpit';
export declare class CockpitState {
    private alerts;
    private incidents;
    private healthRecords;
    private changes;
    private healthRegistry;
    private alertStore;
    private changeLog;
    constructor();
    getOverview(): CockpitOverview;
    recordAlert(alert: Alert): void;
    getAlert(alertId: string): Alert | undefined;
    listAlerts(filter?: {
        status?: string;
        severity?: string;
        domain?: string;
    }): Alert[];
    upsertIncident(incident: Incident): void;
    getIncident(id: string): Incident | undefined;
    listIncidents(): Incident[];
    recordHealth(record: ToolHealthRecord): void;
    getHealthRegistry(domain?: string): ToolHealthRecord[];
    recordChange(change: ChangeRecord): void;
    getChangeHistory(limit?: number): ChangeRecord[];
    computeMetrics(): CockpitMetrics;
}
