export interface CockpitOverview {
  generatedAt: string;
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  openIncidents: number;
  healthSummary: Record<string, {status: string, healthy: number, degraded: number, critical: number}>;
  recentChanges: number;
  autoRemediationRate: number;
  meanTimeToResolution: number; // seconds
}

export interface ChangeRecord {
  changeId: string;
  changeType: string;
  description: string;
  metadata: Record<string, unknown>;
  recordedAt: string;
  actorId?: string;
}

export interface DependencyNode {
  pluginId: string;
  name: string;
  domain: string;
  healthStatus: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'depends_on' | 'triggers' | 'monitored_by';
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  generatedAt: string;
}

export interface HealthTrend {
  domain: string;
  window: string; // e.g., '7d', '30d'
  direction: 'improving' | 'stable' | 'degrading';
  confidence: number; // 0-1
  predictedFailureProbability?: number;
}
