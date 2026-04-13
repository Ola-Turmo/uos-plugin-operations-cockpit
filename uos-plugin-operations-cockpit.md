# PRD: uos-plugin-operations-cockpit — Mission Control for UOS

## Context
Operations cockpit plugin — central monitoring hub for all UOS plugins. Actions: ping, reportToolHealth, getToolHealthRegistry, generateReview, getAlertDetail, acknowledgeAlert, resolveAlert, generateRemediation, recordChange, getChangeHistory, getCockpitOverview. 6 health domains, 4 alert types.

## Vision (April 2026 — World-Class)
The operations cockpit should be **mission control for the entire UOS ecosystem** — a real-time command center that doesn't just display health but actively orchestrates responses, predicts failures, and provides one-click incident resolution.

## What's Missing / Innovation Opportunities

### 1. Incident Commander Mode
Currently: Alert cards with acknowledge/resolve.
**Add**: Full incident lifecycle management. Incident timeline builder. Role assignments during incident. Post-incident review generator. War room mode.

### 2. Auto-Remediation Engine
Currently: Manual remediation plan generation.
**Add**: Connect remediation to executable runbooks. Auto-execute low-risk remediations. Human approval for high-risk. Remediation success tracking.

### 3. Predictive Health Analytics
Currently: Reactive health reporting.
**Add**: Trend analysis on all health metrics. Predictive failure alerts (health degrading toward critical). Seasonal pattern detection.

### 4. Cross-Plugin Dependency Map
Currently: Independent domain health.
**Add**: Service dependency graph across all plugins. Cascading failure visualization. Blast radius prediction.

### 5. Cockpit UI Enhancement
Currently: 4 tabs, alert cards.
**Add**: Real-time updating dashboard. Drag-and-drop incident management. Health timeline scrubber. Command palette (Ctrl+K) for quick actions.

## Implementation Phases

### Phase 1: Incident Commander
- Incident manager (`src/incident/commander.ts`)
- Timeline builder
- Role assignment

### Phase 2: Auto-Remediation
- Runbook linker (`src/remediation/runbook-linker.ts`)
- Auto-executor for low-risk
- Approval gates

### Phase 3: Predictive + Dependency Map
- Health predictor (`src/health/predictor.ts`)
- Dependency graph (`src/health/dependency-map.ts`)
- Advanced UI enhancements

## Technical Approach
- TypeScript + Zod
- `@paperclipai/plugin-sdk`
- WebSocket-style updates (via SDK data registration)
- Dependency graph data structure

## Success Metrics
- Mean time to resolution: 60% reduction
- Auto-remediation rate: > 50% of known issues
- Predictive alert accuracy: > 80%
- Incident response time: < 5 minutes to first action
