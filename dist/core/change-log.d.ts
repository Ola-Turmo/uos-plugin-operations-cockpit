import { ChangeRecord } from '../types/cockpit';
export declare class ChangeLog {
    private changes;
    constructor();
    record(changeType: string, description: string, metadata?: object, actorId?: string): ChangeRecord;
    getHistory(limit?: number): ChangeRecord[];
}
