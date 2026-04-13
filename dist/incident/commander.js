import crypto from 'crypto';
export class IncidentCommander {
    incidents = new Map();
    alertStore;
    constructor(opts) {
        this.alertStore = opts.alertStore;
    }
    // Create incident from an alert
    createIncident(input) {
        const incident = {
            incidentId: crypto.randomUUID(),
            title: input.title,
            description: input.description ?? '',
            severity: input.severity ?? 'medium',
            status: 'open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            responders: [],
            alertIds: input.alertId ? [input.alertId] : [],
        };
        if (input.commanderId) {
            incident.commander = input.commanderId;
            incident.responders.push({
                role: 'commander',
                actorId: input.commanderId,
                assignedAt: incident.createdAt,
            });
        }
        this.incidents.set(incident.incidentId, incident);
        return incident;
    }
    getIncident(incidentId) {
        return this.incidents.get(incidentId);
    }
    listIncidents(filter) {
        let list = [...this.incidents.values()];
        if (filter?.status)
            list = list.filter(i => i.status === filter.status);
        return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    updateIncident(incidentId, updates) {
        const incident = this.incidents.get(incidentId);
        if (!incident)
            throw new Error(`Incident ${incidentId} not found`);
        Object.assign(incident, updates, { updatedAt: new Date().toISOString() });
        return incident;
    }
    assignRole(incidentId, role, actorId) {
        const incident = this.incidents.get(incidentId);
        if (!incident)
            throw new Error(`Incident ${incidentId} not found`);
        // Remove existing role assignment for this role
        incident.responders = incident.responders.filter(r => r.role !== role);
        incident.responders.push({ role, actorId, assignedAt: new Date().toISOString() });
        incident.updatedAt = new Date().toISOString();
        return incident;
    }
    escalate(incidentId) {
        return this.updateIncident(incidentId, { status: 'escalated' });
    }
    close(incidentId, resolution, postmortem) {
        return this.updateIncident(incidentId, {
            status: 'closed',
            resolution,
            postmortem,
            closedAt: new Date().toISOString(),
        });
    }
    addAlertToIncident(incidentId, alertId) {
        const incident = this.incidents.get(incidentId);
        if (!incident)
            throw new Error(`Incident ${incidentId} not found`);
        if (!incident.alertIds.includes(alertId)) {
            incident.alertIds.push(alertId);
            incident.updatedAt = new Date().toISOString();
        }
        return incident;
    }
    generateTimeline(incidentId) {
        const incident = this.incidents.get(incidentId);
        if (!incident)
            return [];
        const entries = [
            { timestamp: incident.createdAt, event: 'incident_created', actor: incident.commander ?? 'system' },
        ];
        if (incident.status === 'investigating') {
            entries.push({ timestamp: incident.updatedAt, event: 'investigation_started', actor: incident.commander ?? 'system' });
        }
        if (incident.status === 'escalated') {
            entries.push({ timestamp: incident.updatedAt, event: 'incident_escalated', actor: incident.commander ?? 'system' });
        }
        if (incident.closedAt) {
            entries.push({ timestamp: incident.closedAt, event: 'incident_closed', actor: incident.commander ?? 'system', details: incident.resolution });
        }
        // Add alert acknowledgment/resolve events
        for (const alertId of incident.alertIds) {
            const alert = this.alertStore.getAlert(alertId);
            if (alert?.acknowledgedAt) {
                entries.push({ timestamp: alert.acknowledgedAt, event: 'alert_acknowledged', actor: alert.acknowledgedBy ?? 'unknown' });
            }
            if (alert?.resolvedAt) {
                entries.push({ timestamp: alert.resolvedAt, event: 'alert_resolved', actor: alert.resolvedBy ?? 'unknown' });
            }
        }
        return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
    generatePostmortem(incidentId) {
        const incident = this.incidents.get(incidentId);
        if (!incident)
            return '';
        const duration = incident.closedAt
            ? Math.round((new Date(incident.closedAt).getTime() - new Date(incident.createdAt).getTime()) / 1000)
            : 'ongoing';
        return `## Postmortem: ${incident.title}\n\n**Severity:** ${incident.severity}\n**Duration:** ${duration}s\n**Status:** ${incident.status}\n\n### Timeline\n${this.generateTimeline(incidentId).map(e => `- ${e.timestamp} — ${e.event} (${e.actor})`).join('\n')}\n\n### Root Cause\n${incident.rootCause ?? 'Under investigation'}\n\n### Resolution\n${incident.resolution ?? 'None'}\n\n### Lessons Learned\n${incident.postmortem ?? 'None recorded.'}`;
    }
}
