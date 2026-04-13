import { z } from 'zod';
import { HealthDomain, } from './types/health';
import { AlertType, AlertSeverity, AlertStatus, } from './types/alert';
import { IncidentStatus, IncidentRole, } from './types/incident';
import { RemediationRisk, RemediationStatus, } from './types/remediation';
// Health Schemas
export const HealthDomainSchema = z.nativeEnum(HealthDomain);
export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'critical', 'unknown']);
export const ToolHealthRecordSchema = z.object({
    toolId: z.string(),
    domain: HealthDomainSchema,
    status: HealthStatusSchema,
    lastChecked: z.string(),
    metrics: z.record(z.union([z.number(), z.string()])),
    consecutiveFailures: z.number(),
});
export const HealthReportSchema = z.object({
    generatedAt: z.string(),
    period: z.string(),
    domain: HealthDomainSchema.optional(),
    summary: z.string(),
    metrics: z.record(z.number()),
    trend: z.enum(['improving', 'stable', 'degrading']),
});
// Alert Schemas
export const AlertTypeSchema = z.nativeEnum(AlertType);
export const AlertSeveritySchema = z.nativeEnum(AlertSeverity);
export const AlertStatusSchema = z.nativeEnum(AlertStatus);
export const AlertTimelineEntrySchema = z.object({
    timestamp: z.string(),
    action: z.string(),
    actor: z.string(),
    note: z.string().optional(),
});
export const AlertSchema = z.object({
    alertId: z.string(),
    type: AlertTypeSchema,
    severity: AlertSeveritySchema,
    status: AlertStatusSchema,
    title: z.string(),
    description: z.string(),
    createdAt: z.string(),
    acknowledgedAt: z.string().optional(),
    resolvedAt: z.string().optional(),
    acknowledgedBy: z.string().optional(),
    resolvedBy: z.string().optional(),
    sourceToolId: z.string(),
    domain: z.string(),
    metadata: z.record(z.unknown()),
});
export const AlertDetailSchema = z.object({
    alert: AlertSchema,
    timeline: z.array(AlertTimelineEntrySchema),
    relatedAlerts: z.array(z.string()),
    suggestedRemediation: z.string().optional(),
});
// Incident Schemas
export const IncidentStatusSchema = z.nativeEnum(IncidentStatus);
export const IncidentRoleSchema = z.nativeEnum(IncidentRole);
export const IncidentRoleAssignmentSchema = z.object({
    role: IncidentRoleSchema,
    actorId: z.string(),
    assignedAt: z.string(),
});
export const IncidentTimelineEntrySchema = z.object({
    timestamp: z.string(),
    event: z.string(),
    actor: z.string(),
    details: z.string().optional(),
});
export const IncidentSchema = z.object({
    incidentId: z.string(),
    title: z.string(),
    description: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    status: IncidentStatusSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    closedAt: z.string().optional(),
    commander: z.string().optional(),
    responders: z.array(IncidentRoleAssignmentSchema),
    alertIds: z.array(z.string()),
    rootCause: z.string().optional(),
    resolution: z.string().optional(),
    postmortem: z.string().optional(),
});
// Remediation Schemas
export const RemediationRiskSchema = z.nativeEnum(RemediationRisk);
export const RemediationStatusSchema = z.nativeEnum(RemediationStatus);
export const RunbookStepSchema = z.object({
    order: z.number(),
    action: z.string(),
    description: z.string(),
    estimatedDuration: z.number(),
});
export const RunbookSchema = z.object({
    runbookId: z.string(),
    name: z.string(),
    description: z.string(),
    steps: z.array(RunbookStepSchema),
    risk: RemediationRiskSchema,
    autoExecutable: z.boolean(),
});
export const RemediationSchema = z.object({
    remediationId: z.string(),
    alertId: z.string(),
    title: z.string(),
    description: z.string(),
    risk: RemediationRiskSchema,
    status: RemediationStatusSchema,
    runbookId: z.string().optional(),
    approvedBy: z.string().optional(),
    executedAt: z.string().optional(),
    completedAt: z.string().optional(),
    result: z.string().optional(),
    success: z.boolean().optional(),
});
export const ApprovalGateSchema = z.object({
    remediationId: z.string(),
    requiredRisk: RemediationRiskSchema,
    requestedAt: z.string(),
    approvedBy: z.string().optional(),
    rejectedBy: z.string().optional(),
    decision: z.enum(['approved', 'rejected']).optional(),
});
// Cockpit Schemas
export const DependencyNodeSchema = z.object({
    pluginId: z.string(),
    name: z.string(),
    domain: z.string(),
    healthStatus: z.string(),
});
export const DependencyEdgeSchema = z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(['depends_on', 'triggers', 'monitored_by']),
});
export const DependencyGraphSchema = z.object({
    nodes: z.array(DependencyNodeSchema),
    edges: z.array(DependencyEdgeSchema),
    generatedAt: z.string(),
});
export const HealthTrendSchema = z.object({
    domain: z.string(),
    window: z.string(),
    direction: z.enum(['improving', 'stable', 'degrading']),
    confidence: z.number().min(0).max(1),
    predictedFailureProbability: z.number().optional(),
});
export const ChangeRecordSchema = z.object({
    changeId: z.string(),
    changeType: z.string(),
    description: z.string(),
    metadata: z.record(z.unknown()),
    recordedAt: z.string(),
    actorId: z.string().optional(),
});
export const CockpitOverviewSchema = z.object({
    generatedAt: z.string(),
    totalAlerts: z.number(),
    activeAlerts: z.number(),
    acknowledgedAlerts: z.number(),
    resolvedAlerts: z.number(),
    criticalAlerts: z.number(),
    openIncidents: z.number(),
    healthSummary: z.record(z.object({
        status: z.string(),
        healthy: z.number(),
        degraded: z.number(),
        critical: z.number(),
    })),
    recentChanges: z.number(),
    autoRemediationRate: z.number(),
    meanTimeToResolution: z.number(),
});
