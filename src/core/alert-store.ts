import { randomUUID } from 'crypto';
import { 
  Alert, 
  AlertType, 
  AlertSeverity, 
  AlertStatus, 
  AlertDetail,
  AlertHistoryEntry 
} from '../types/alert';

export class AlertStore {
  private alerts: Map<string, Alert>;

  constructor() {
    this.alerts = new Map();
  }

  createAlert(input: {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
    sourceToolId?: string;
    domain?: string;
    metadata?: Record<string, unknown>;
  }): Alert {
    const now = Date.now();
    const alert: Alert = {
      id: randomUUID(),
      type: input.type,
      severity: input.severity,
      status: AlertStatus.ACTIVE,
      title: input.title,
      description: input.description,
      sourceToolId: input.sourceToolId,
      domain: input.domain,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  acknowledgeAlert(alertId: string, note?: string): Alert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    const now = Date.now();
    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = now;
    alert.acknowledgedNote = note;
    alert.updatedAt = now;

    return alert;
  }

  resolveAlert(alertId: string, resolution?: string): Alert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    const now = Date.now();
    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = now;
    alert.resolution = resolution;
    alert.updatedAt = now;

    return alert;
  }

  listAlerts(filter?: {
    status?: AlertStatus;
    severity?: AlertSeverity;
    type?: AlertType;
    domain?: string;
  }): Alert[] {
    let result = Array.from(this.alerts.values());

    if (filter) {
      if (filter.status) {
        result = result.filter(a => a.status === filter.status);
      }
      if (filter.severity) {
        result = result.filter(a => a.severity === filter.severity);
      }
      if (filter.type) {
        result = result.filter(a => a.type === filter.type);
      }
      if (filter.domain) {
        result = result.filter(a => a.domain === filter.domain);
      }
    }

    // Sort by createdAt descending
    result.sort((a, b) => b.createdAt - a.createdAt);
    return result;
  }

  getAlertDetail(alertId: string): AlertDetail {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    const history: AlertHistoryEntry[] = [
      { timestamp: alert.createdAt, action: 'created' }
    ];

    if (alert.acknowledgedAt) {
      history.push({
        timestamp: alert.acknowledgedAt,
        action: 'acknowledged',
        note: alert.acknowledgedNote
      });
    }

    if (alert.resolvedAt) {
      history.push({
        timestamp: alert.resolvedAt,
        action: 'resolved',
        note: alert.resolution
      });
    }

    // Sort history by timestamp
    history.sort((a, b) => a.timestamp - b.timestamp);

    return {
      ...alert,
      history
    };
  }
}
