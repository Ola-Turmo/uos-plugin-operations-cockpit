export declare enum RemediationRisk {
    Low = "low",
    Medium = "medium",
    High = "high"
}
export declare enum RemediationStatus {
    Proposed = "proposed",
    Approved = "approved",
    Executing = "executing",
    Succeeded = "succeeded",
    Failed = "failed",
    Rejected = "rejected"
}
export interface Remediation {
    remediationId: string;
    alertId: string;
    title: string;
    description: string;
    risk: RemediationRisk;
    status: RemediationStatus;
    runbookId?: string;
    approvedBy?: string;
    executedAt?: string;
    completedAt?: string;
    result?: string;
    success?: boolean;
}
export interface Runbook {
    runbookId: string;
    name: string;
    description: string;
    steps: RunbookStep[];
    risk: RemediationRisk;
    autoExecutable: boolean;
}
export interface RunbookStep {
    order: number;
    action: string;
    description: string;
    estimatedDuration: number;
}
export interface ApprovalGate {
    remediationId: string;
    requiredRisk: RemediationRisk;
    requestedAt: string;
    approvedBy?: string;
    rejectedBy?: string;
    decision?: 'approved' | 'rejected';
}
