import { randomUUID } from 'crypto';
export class ChangeLog {
    changes;
    constructor() {
        this.changes = [];
    }
    record(changeType, description, metadata, actorId) {
        const record = {
            id: randomUUID(),
            changeType,
            description,
            timestamp: Date.now(),
            actorId,
            metadata: metadata
        };
        this.changes.push(record);
        return record;
    }
    getHistory(limit) {
        const sorted = [...this.changes].sort((a, b) => b.timestamp - a.timestamp);
        if (limit !== undefined && limit > 0) {
            return sorted.slice(0, limit);
        }
        return sorted;
    }
}
