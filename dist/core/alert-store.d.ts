import { Alert, AlertType, AlertSeverity, AlertStatus, AlertDetail } from '../types/alert';
export declare class AlertStore {
    private alerts;
    constructor();
    createAlert(input: {
        type: AlertType;
        severity: AlertSeverity;
        title: string;
        description: string;
        sourceToolId?: string;
        domain?: string;
        metadata?: Record<string, unknown>;
    }): Alert;
    getAlert(alertId: string): Alert | undefined;
    acknowledgeAlert(alertId: string, note?: string): Alert;
    resolveAlert(alertId: string, resolution?: string): Alert;
    listAlerts(filter?: {
        status?: AlertStatus;
        severity?: AlertSeverity;
        type?: AlertType;
        domain?: string;
    }): Alert[];
    getAlertDetail(alertId: string): AlertDetail;
}
