import { randomUUID } from 'crypto';
import { ChangeRecord } from '../types/cockpit';

export class ChangeLog {
  private changes: ChangeRecord[];

  constructor() {
    this.changes = [];
  }

  record(
    changeType: string, 
    description: string, 
    metadata?: object, 
    actorId?: string
  ): ChangeRecord {
    const record: ChangeRecord = {
      id: randomUUID(),
      changeType,
      description,
      timestamp: Date.now(),
      actorId,
      metadata: metadata as Record<string, unknown> | undefined
    };

    this.changes.push(record);
    return record;
  }

  getHistory(limit?: number): ChangeRecord[] {
    const sorted = [...this.changes].sort((a, b) => b.timestamp - a.timestamp);
    if (limit !== undefined && limit > 0) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }
}
