import { HealthDomain } from '../types/health';
export class HealthRegistry {
    registry;
    constructor() {
        this.registry = new Map();
        // Initialize all 6 HealthDomain values
        Object.values(HealthDomain).forEach(domain => {
            this.registry.set(domain, new Map());
        });
    }
    registerHealth(toolId, domain, status, metrics) {
        const domainMap = this.registry.get(domain);
        if (!domainMap) {
            throw new Error(`Unknown health domain: ${domain}`);
        }
        const now = Date.now();
        const existing = domainMap.get(toolId);
        const record = {
            toolId,
            domain,
            status: status,
            timestamp: now,
            metrics: metrics,
            history: existing?.history || []
        };
        // Add to history if status changed or every 5 minutes
        if (existing) {
            const lastSnapshot = existing.history?.[existing.history.length - 1];
            if (!lastSnapshot || lastSnapshot.status !== status ||
                (now - lastSnapshot.timestamp) > 300000) {
                record.history = [
                    ...(existing.history || []),
                    { timestamp: now, status, metrics: metrics }
                ];
            }
            else {
                record.history = existing.history;
            }
        }
        else {
            record.history = [{ timestamp: now, status, metrics: metrics }];
        }
        domainMap.set(toolId, record);
        return record;
    }
    getRegistry(domain) {
        if (domain) {
            const domainMap = this.registry.get(domain);
            return domainMap ? Array.from(domainMap.values()) : [];
        }
        const all = [];
        this.registry.forEach(domainMap => {
            domainMap.forEach(record => all.push(record));
        });
        return all;
    }
    getDomainHealth(domain) {
        const domainMap = this.registry.get(domain);
        if (!domainMap) {
            return { healthy: 0, degraded: 0, critical: 0 };
        }
        const result = { healthy: 0, degraded: 0, critical: 0 };
        domainMap.forEach(record => {
            if (record.status === 'healthy')
                result.healthy++;
            else if (record.status === 'degraded')
                result.degraded++;
            else if (record.status === 'critical')
                result.critical++;
        });
        return result;
    }
    checkHealthTrend(toolId, windowSize = 10) {
        for (const domainMap of this.registry.values()) {
            const record = domainMap.get(toolId);
            if (record && record.history && record.history.length > 0) {
                const samples = record.history.slice(-windowSize);
                const snapshots = samples;
                // Determine trend direction
                const firstHalf = snapshots.slice(0, Math.floor(snapshots.length / 2));
                const secondHalf = snapshots.slice(Math.floor(snapshots.length / 2));
                const statusWeight = (s) => {
                    if (s.status === 'healthy')
                        return 0;
                    if (s.status === 'degraded')
                        return 1;
                    return 2;
                };
                const firstAvg = firstHalf.reduce((sum, s) => sum + statusWeight(s), 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((sum, s) => sum + statusWeight(s), 0) / secondHalf.length;
                let direction;
                if (secondAvg < firstAvg - 0.1)
                    direction = 'improving';
                else if (secondAvg > firstAvg + 0.1)
                    direction = 'degrading';
                else
                    direction = 'stable';
                return {
                    toolId,
                    direction,
                    samples: snapshots.length,
                    snapshot: snapshots
                };
            }
        }
        return null;
    }
}
