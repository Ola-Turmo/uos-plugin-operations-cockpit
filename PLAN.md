# Plan: uos-plugin-operations-cockpit — Mission Control for UOS

## Context
The existing plugin at `/root/work/Ola-Turmo/uos-plugin-operations-cockpit` provides a solid foundation with:
- 6 health domains (core, connectors, setup, skills, departments, tools)
- Risk-framed alerts with acknowledge/resolve
- Evidence-backed reviews with ranked actions
- Change history tracking
- Basic dashboard widget UI

The PRD describes 5 innovation layers to add on top of this foundation.

## What's Being Built

### Phase 1: Incident Commander
- **src/incident/commander.ts** — Incident lifecycle state machine (triggered → acknowledged → investigating → war-room → resolved → postmortem)
- **src/incident/timeline.ts** — Timeline builder: chronological events with types (alert, action, escalation, communication)
- **src/incident/roles.ts** — Role assignments during incidents (incident commander, scribe, comms lead, SME)
- **src/incident/postmortem.ts** — Post-incident review generator from incident timeline and evidence

### Phase 2: Auto-Remediation Engine
- **src/remediation/runbook-linker.ts** — Links CockpitAlert/incident to RemediationPlan runbooks by domain/pattern
- **src/remediation/executor.ts** — Auto-executes low-risk steps (risk.level === "low"); gates high-risk for human approval
- **src/remediation/tracker.ts** — Tracks remediation success/failure rates, updates confidence labels

### Phase 3: Predictive Health + Dependency Map
- **src/health/predictor.ts** — Predictive failure: sliding-window trend on health scores, alerts generated when degradation trajectory detected
- **src/health/dependency-graph.ts** — Service dependency graph across UOS plugins with blast-radius calculation
- **src/health/seasonal.ts** — Seasonal pattern detection on health metrics (day-of-week, hour-of-day patterns)

### Phase 4: Cockpit UI Enhancement
- **src/ui/tabs/IncidentTab.tsx** — Incident Commander tab: incident cards, timeline view, role assignment UI, war-room mode
- **src/ui/tabs/PredictiveTab.tsx** — Predictive health tab: trend charts, predictive alerts, seasonal patterns
- **src/ui/tabs/DependencyTab.tsx** — Dependency map tab: graph visualization, blast radius display
- **src/ui/CommandPalette.tsx** — Ctrl+K command palette for quick actions (acknowledge, resolve, escalate, run remediation)
- **src/ui/RemediationDialog.tsx** — Remediation approval dialog for high-risk auto-remediation steps

## Implementation Tasks

### Task 1: Phase 1 — Incident Commander (backend)
Implement `src/incident/commander.ts`, `src/incident/timeline.ts`, `src/incident/roles.ts`, `src/incident/postmortem.ts`.

Key types:
- `IncidentStatus`: triggered | acknowledged | investigating | war-room | resolved | closed
- `Incident`: id, title, description, status, severity, domain, createdAt, acknowledgedAt, warRoomStartedAt, resolvedAt, closedAt, commanderId, timeline[], roles, linkedAlertIds, postmortemId
- `TimelineEvent`: id, incidentId, timestamp, type (alert | action | escalation | communication | resolution), actor, description, metadata?
- `IncidentRole`: commander | scribe | comms_lead | sme
- `Postmortem`: id, incidentId, summary, rootCause, contributingFactors, lessonsLearned, actionItems, generatedAt

### Task 2: Phase 2 — Auto-Remediation Engine (backend)
Implement `src/remediation/runbook-linker.ts`, `src/remediation/executor.ts`, `src/remediation/tracker.ts`.

Key types:
- `Runbook`: id, name, description, domain, triggerPatterns[], steps[], riskLevel, successRate, lastRunAt
- `RemediationExecution`: id, runbookId, incidentId, status (pending | approved | running | succeeded | failed | skipped), executedBy, startedAt, completedAt, stepResults[]
- `RemediationStepResult`: stepOrder, status, output, error?, durationMs

Auto-execute rule: `risk.riskLevel === "low" && remediationPlan.steps.every(s => s.risk.riskLevel !== "high" && s.risk.riskLevel !== "critical")`

### Task 3: Phase 3 — Predictive Health (backend)
Implement `src/health/predictor.ts`, `src/health/dependency-graph.ts`, `src/health/seasonal.ts`.

Key types:
- `HealthTrend`: domain, direction (improving | stable | degrading), velocity (score/hour), confidence, predictedFailureAt?
- `DependencyEdge`: fromPlugin, toPlugin, dependencyType (hard | soft | event), healthImpact propagation factor
- `BlastRadius`: epicenterPlugin, affectedPlugins[], severityByPlugin[], totalImpactScore
- `SeasonalPattern`: domain, metric, dayOfWeek distribution, hourOfDay distribution, detectedAt

Predictive alert rule: `velocity < -0.5 && predictedFailureAt < now + 2h && confidence > 0.7`

### Task 4: Phase 4 — Cockpit UI Enhancement
Implement enhanced UI tabs. Extend `src/ui/index.tsx` to add 3 new tabs: Incidents, Predictive, Dependencies.

Each tab should:
- Show relevant data from the new modules
- Be interactive (click to expand, acknowledge, resolve)
- Follow existing UI style (Tailwind-ish inline styles, same color system)

### Task 5: Worker Integration
Update `src/worker.ts` to:
- Register new actions: `incident.*`, `remediation.*`, `health.predict`, `dependency.map`, `cockpit.overview`
- Call new modules in the main plugin loop
- Update CockpitOverview type to include incidents, predictiveHealth, dependencyMap

### Task 6: Build Verification
- Run: `cd /root/.hermes/paperclip-worktrees/instances/e9f6fc04 && npm run plugin:typecheck 2>&1`
- Fix any TypeScript errors
- Run: `npm run plugin:build 2>&1`
- Verify dist/ output exists

## File Layout (final)
```
src/
  manifest.ts
  types.ts                     ← add Incident, Runbook, HealthTrend, DependencyEdge types
  worker.ts                    ← register new actions
  health-summary.ts
  review-generation.ts
  alert-generation.ts
  change-history.ts
  incident/
    commander.ts               ← incident lifecycle state machine
    timeline.ts                ← timeline event builder
    roles.ts                   ← role assignment
    postmortem.ts              ← postmortem generator
  remediation/
    runbook-linker.ts          ← alert → runbook mapping
    executor.ts                ← auto-execute low-risk
    tracker.ts                 ← remediation success tracking
  health/
    predictor.ts               ← trend analysis + predictive alerts
    dependency-graph.ts        ← service dependency graph + blast radius
    seasonal.ts                ← seasonal pattern detection
  ui/
    index.tsx                  ← extend with Incidents/Predictive/Dependencies tabs
    CommandPalette.tsx         ← Ctrl+K palette
    RemediationDialog.tsx      ← approval dialog
    tabs/
      IncidentTab.tsx
      PredictiveTab.tsx
      DependencyTab.tsx
```
