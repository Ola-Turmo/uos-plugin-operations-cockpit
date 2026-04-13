import { IncidentSeverity, IncidentStatus } from '../types/incident';
import { HealthRegistry } from './health-registry';
import { AlertStore } from './alert-store';
import { ChangeLog } from './change-log';
export class CockpitState {
    alerts;
    incidents;
    healthRecords;
    changes;
    healthRegistry;
    alertStore;
    changeLog;
    constructor() {
        this.alerts = new Map();
        this.incidents = new Map();
        this.healthRecords = new Map();
        this.changes = [];
        this.healthRegistry = new HealthRegistry();
        this.alertStore = new AlertStore();
        this.changeLog = new ChangeLog();
    }
    getOverview() {
        const allAlerts = Array.from(this.alerts.values());
        const allIncidents = Array.from(this.incidents.values());
        const allHealth = Array.from(this.healthRecords.values());
        const recentChanges = this.changes.slice(-10);
        return {
            totalAlerts: allAlerts.length,
            activeAlerts: allAlerts.filter(a => a.status === 'active').length,
            criticalAlerts: allAlerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length,
            totalIncidents: allIncidents.length,
            openIncidents: allIncidents.filter(i => i.status === IncidentStatus.OPEN ||
                i.status === IncidentStatus.INVESTIGATING).length,
            criticalIncidents: allIncidents.filter(i => i.severity === IncidentSeverity.P1 &&
                i.status !== IncidentStatus.RESOLVED &&
                i.status !== IncidentStatus.CLOSED).length,
            healthyTools: allHealth.filter(h => h.status === 'healthy').length,
            degradedTools: allHealth.filter(h => h.status === 'degraded').length,
            criticalTools: allHealth.filter(h => h.status === 'critical').length,
            recentChanges: recentChanges.length,
            lastUpdated: Date.now()
        };
    }
    recordAlert(alert) {
        this.alerts.set(alert.id, alert);
    }
    getAlert(alertId) {
        return this.alerts.get(alertId);
    }
    listAlerts(filter) {
        let result = Array.from(this.alerts.values());
        if (filter) {
            if (filter.status) {
                result = result.filter(a => a.status === filter.status);
            }
            if (filter.severity) {
                result = result.filter(a => a.severity === filter.severity);
            }
            if (filter.domain) {
                result = result.filter(a => a.domain === filter.domain);
            }
        }
        return result.sort((a, b) => b.createdAt - a.createdAt);
    }
    upsertIncident(incident) {
        this.incidents.set(incident.id, incident);
    }
    getIncident(id) {
        return this.incidents.get(id);
    }
    listIncidents() {
        return Array.from(this.incidents.values()).sort((a, b) => b.createdAt - a.createdAt);
    }
    recordHealth(record) {
        this.healthRecords.set(`${record.domain}:${record.toolId}`, record);
        this.healthRegistry.registerHealth(record.toolId, record.domain, record.status, record.metrics);
    }
    getHealthRegistry(domain) {
        return this.healthRegistry.getRegistry(domain);
    }
    recordChange(change) {
        this.changes.push(change);
    }
    getChangeHistory(limit) {
        const sorted = [...this.changes].sort((a, b) => b.timestamp - a.timestamp);
        return limit ? sorted.slice(0, limit) : sorted;
    }
    computeMetrics() {
        const allAlerts = Array.from(this.alerts.values());
        const allIncidents = Array.from(this.incidents.values());
        const allHealth = Array.from(this.healthRecords.values());
        const now = Date.now();
        const oneHourAgo = now - 3600000;
        // Alert rates (last hour)
        const recentAlerts = allAlerts.filter(a => a.createdAt >= oneHourAgo);
        const alertRates = {
            critical: recentAlerts.filter(a => a.severity === 'critical').length,
            high: recentAlerts.filter(a => a.severity === 'high').length,
            medium: recentAlerts.filter(a => a.severity === 'medium').length,
            low: recentAlerts.filter(a => a.severity === 'low').length
        };
        // Health summary
        const healthSummary = {
            healthy: allHealth.filter(h => h.status === 'healthy').length,
            degraded: allHealth.filter(h => h.status === 'degraded').length,
            critical: allHealth.filter(h => h.status === 'critical').length
        };
        // MTTD - Mean Time To Detect (avg time from alert created to acknowledged/resolved)
        const resolvedAlerts = allAlerts.filter(a => a.acknowledgedAt || a.resolvedAt);
        let mttd = 0;
        if (resolvedAlerts.length > 0) {
            const totalDetectionTime = resolvedAlerts.reduce((sum, a) => {
                const detectionTime = (a.acknowledgedAt || a.resolvedAt) - a.createdAt;
                return sum + detectionTime;
            }, 0);
            mttd = totalDetectionTime / resolvedAlerts.length;
        }
        // MTR - Mean Time To Resolve (for resolved incidents)
        const resolvedIncidents = allIncidents.filter(i => i.resolution);
        let mtr = 0;
        if (resolvedIncidents.length > 0) {
            const totalResolutionTime = resolvedIncidents.reduce((sum, i) => {
                return sum + (i.updatedAt - i.createdAt);
            }, 0);
            mtr = totalResolutionTime / resolvedIncidents.length;
        }
        return {
            alertRates,
            healthSummary,
            mttd,
            mtr
        };
    }
}
