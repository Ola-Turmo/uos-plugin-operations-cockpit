import { ToolHealthRecord, HealthTrend } from '../types/health';
interface DomainHealth {
    healthy: number;
    degraded: number;
    critical: number;
}
export declare class HealthRegistry {
    private registry;
    constructor();
    registerHealth(toolId: string, domain: string, status: string, metrics?: object): ToolHealthRecord;
    getRegistry(domain?: string): ToolHealthRecord[];
    getDomainHealth(domain: string): DomainHealth;
    checkHealthTrend(toolId: string, windowSize?: number): HealthTrend | null;
}
export {};
