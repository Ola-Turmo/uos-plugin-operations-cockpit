# PLAN: uos-plugin-operations-cockpit

## Project Overview
- **Plugin**: @uos/plugin-operations-cockpit — Mission Control for UOS
- **Type**: NEW | **Priority**: normal
- **Stack**: TypeScript + Zod, @paperclipai/plugin-sdk
- **Repo**: split-repo under universal-operating-system-paperclip-plugin
- **Worktree**: /root/.hermes/paperclip-worktrees/instances/fa6b6ca2

## Actions (from PRD context)
ping, reportToolHealth, getToolHealthRegistry, generateReview, getAlertDetail, acknowledgeAlert, resolveAlert, generateRemediation, recordChange, getChangeHistory, getCockpitOverview. 6 health domains, 4 alert types.

## Phases & Tasks

### Phase 1: Foundation — Plugin Core

**Task 1: Manifest + SDK Integration**
- Create `src/manifest.ts` — PluginManifestV1 with tools (ping, reportToolHealth, getToolHealthRegistry, generateReview, getAlertDetail, acknowledgeAlert, resolveAlert, generateRemediation, recordChange, getChangeHistory, getCockpitOverview), 3 phases
- Create `src/plugin.ts` — definePlugin() entry using plugin-sdk
- Create `src/sdk-types.ts` — re-export SDK types from vendor/paperclip-plugin-sdk
- Copy `src/index.mjs` as re-export of plugin

**Task 2: Domain Types + Zod Schemas**
- Create `src/types/health.ts` — HealthDomain enum (6 domains), HealthStatus, ToolHealthRecord, HealthReport
- Create `src/types/alert.ts` — AlertType enum (4 types), AlertSeverity, Alert, AlertDetail
- Create `src/types/incident.ts` — Incident, IncidentTimelineEntry, IncidentRole, IncidentStatus
- Create `src/types/remediation.ts` — Remediation, RemediationRisk, Runbook, ApprovalGate
- Create `src/types/cockpit.ts` — CockpitOverview, ChangeRecord, DependencyGraph, HealthTrend
- Create `src/schemas.ts` — Zod schemas for all domain types

**Task 3: Core Service — Cockpit State + Health Registry**
- Create `src/core/cockpit-state.ts` — CockpitState class managing in-memory state + plugin state persistence
- Create `src/core/health-registry.ts` — HealthRegistry managing tool health across 6 domains
- Create `src/core/alert-store.ts` — AlertStore managing active/window/resolved alerts
- Create `src/core/change-log.ts` — ChangeLog for recording and retrieving change history

### Phase 2: Incident Commander

**Task 4: Incident Commander**
- Create `src/incident/commander.ts` — IncidentCommander class managing full incident lifecycle (trigger, assign, escalate, close)
- Implement `getIncident()`, `listIncidents()`, `createIncident()`, `updateIncident()` actions
- Implement `acknowledgeAlert()` and `resolveAlert()` via incident commander
- Implement role assignment: incident commander, responder, observer

**Task 5: Timeline Builder**
- Create `src/incident/timeline.ts` — TimelineBuilder for building structured incident timelines
- Add timeline entries for: alert received, acknowledged, investigated, escalated, remediated, resolved
- Include post-incident review generation

### Phase 3: Auto-Remediation + Predictive

**Task 6: Auto-Remediation Engine**
- Create `src/remediation/runbook-linker.ts` — RunbookLinker mapping alerts to runbooks
- Create `src/remediation/executor.ts` — RemediationExecutor with risk assessment (low/medium/high)
- Low-risk: auto-execute. Medium: human approval gate. High: requires explicit approval
- Track remediation success/failure rates

**Task 7: Predictive Health Analytics**
- Create `src/health/predictor.ts` — HealthPredictor using moving averages + trend detection
- Generate predictive failure alerts when health metrics degrade toward critical
- Implement `generateReview()` for periodic health reports

**Task 8: Dependency Graph**
- Create `src/health/dependency-map.ts` — DependencyGraph for cross-plugin dependency mapping
- Implement blast radius prediction: given a failing plugin, predict affected plugins
- Cascading failure visualization data structure

### Phase 4: Integration + UI Tools

**Task 9: Tool Handlers + Smoke Test**
- Wire all 11 tool handlers in `src/index.mjs`
- Verify `npm test` passes
- Commit with Lore Commit Protocol
