export enum HealthDomain {
  System = 'system',
  Network = 'network',
  Data = 'data',
  Security = 'security',
  Compute = 'compute',
  Storage = 'storage',
}

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface ToolHealthRecord {
  toolId: string;
  domain: HealthDomain;
  status: HealthStatus;
  lastChecked: string;
  metrics: Record<string, number | string>;
  consecutiveFailures: number;
}

export interface HealthReport {
  generatedAt: string;
  period: string;
  domain?: HealthDomain;
  summary: string;
  metrics: Record<string, number>;
  trend: 'improving' | 'stable' | 'degrading';
}
