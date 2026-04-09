---
repo: "uos-plugin-operations-cockpit"
display_name: "@uos/plugin-operations-cockpit"
package_name: "@uos/plugin-operations-cockpit"
lane: "plugin"
artifact_class: "TypeScript package / monitoring and review surface"
maturity: "extracted operational surface"
generated_on: "2026-04-03"
assumptions: "Grounded in the current split-repo contents, package metadata, README/PRD alignment pass, and the Paperclip plugin scaffold presence where applicable; deeper module-level inspection should refine implementation detail as the code evolves."
autonomy_mode: "maximum-capability autonomous work with deep research and explicit learning loops"
---

# PRD: @uos/plugin-operations-cockpit

## 1. Product Intent

**Package / repo:** `@uos/plugin-operations-cockpit`  
**Lane:** plugin  
**Artifact class:** TypeScript package / monitoring and review surface  
**Current maturity:** extracted operational surface  
**Source-of-truth assumption:** Monitoring/review/dashboard package in the split workspace.
**Runtime form:** Split repo with package code as the source of truth and a Paperclip plugin scaffold available for worker, manifest, UI, and validation surfaces when the repo needs runtime or operator-facing behavior.

@uos/plugin-operations-cockpit is the monitoring, review, and dashboard surface for UOS. It should make system state explainable, actionable, and trustworthy for humans and autonomous operators alike.

## 2. Problem Statement

Operations tooling often overwhelms with dashboards yet still fails to explain what matters. Cockpit must turn raw state and events into operator confidence: what changed, why it matters, what to do next, and how risky the action is.

## 3. Target Users and Jobs to Be Done

- Operators responsible for ongoing system health and reviews.
- Platform teams investigating incidents or drift.
- Leadership consumers of operating reviews and health status.
- Autonomous agents that need safe, explainable recommendations.

## 4. Outcome Thesis

**North star:** Operators can quickly detect issues, understand root cause candidates, and act with confidence because the cockpit privileges signal, context, and explainability over dashboard sprawl.

### 12-month KPI targets
- The cockpit detects >= 95% of seeded health degradations in the maintained benchmark scenarios.
- Evidence-backed operating review generation completes in <= 10 minutes from a fresh system snapshot.
- Critical alert false-positive rate stays < 15% on maintained health domains.
- 100% of critical alerts and recommended remediations include linked evidence and explicit risk framing.
- Change-to-incident correlation is available for >= 90% of benchmark regressions and failed actions.

### Acceptance thresholds for the next implementation wave
- The first wave of platform, connector, and department health domains is instrumented consistently.
- Review outputs include state summary, anomaly evidence, probable causes, and ranked next actions.
- Operators can move from an alert to the underlying change, issue, or connector state without manual spelunking.
- History views preserve enough fidelity to compare current degradation against prior incidents.

## 5. In Scope

- Health dashboards, operating reviews, and alert/context surfaces.
- Drill-downs from summary state into causal evidence.
- Recommendation generation with risk framing and actionability.
- Cross-repo and cross-plugin status synthesis.
- Historical analysis and operator workflow instrumentation.

## 6. Explicit Non-Goals

- Becoming an unstructured data dumping ground.
- Owning low-level telemetry collection that belongs elsewhere.
- Making automated changes without explicit trust and guardrails.

## 7. Maximum Tool and Connection Surface

- This repo should assume it may use any connection, API, browser flow, CLI, document surface, dataset, or storage system materially relevant to completing the job, as long as the access pattern is lawful, auditable, and proportionate to risk.
- Do not artificially limit execution to the tools already named in the repo if adjacent systems are clearly required to close the loop.
- Prefer first-party APIs and direct integrations when available, but use browser automation, provider CLIs, structured import/export, and human-review queues when they are the most reliable path to completion.
- Treat communication systems, docs, spreadsheets, issue trackers, code hosts, cloud consoles, dashboards, databases, and admin panels as valid operating surfaces whenever the repo's job depends on them.
- Escalate only when the action is irreversible, privacy-sensitive, financially material, or likely to create external side effects without adequate review.

### Priority surfaces for cockpit work
- Sentry, Datadog, Grafana, OpenTelemetry traces, cloud logs, status pages, analytics dashboards, and audit trails required to explain system state and turn anomalies into actions.
- GitHub, Linear, Jira, Notion, Google Docs/Sheets, Slack, email, and calendar surfaces so incidents, reviews, and operating actions can move from detection to closure.
- Deployment/admin consoles for Cloudflare, Vercel, Render, Docker hosts, databases, auth providers, and connector platforms when provider APIs omit the exact evidence operators need.
- Cross-repo contract, runtime, and release metadata from core, connectors, departments, skills, and tool repos whenever the cockpit needs a coherent platform-wide view.

### Selection rules
- Start by identifying the systems that would let the repo complete the real job end to end, not just produce an intermediate artifact.
- Use the narrowest safe action for high-risk domains, but not the narrowest tool surface by default.
- When one system lacks the evidence or authority needed to finish the task, step sideways into the adjacent system that does have it.
- Prefer a complete, reviewable workflow over a locally elegant but operationally incomplete one.

## 8. Autonomous Operating Model

This PRD assumes **maximum-capability autonomous work**. The repo should not merely accept tasks; it should research deeply, compare options, reduce uncertainty, ship safely, and learn from every outcome. Autonomy here means higher standards for evidence, reversibility, observability, and knowledge capture—not just faster execution.

### Required research before every material task
1. Read the repo README, this PRD, touched source modules, existing tests, and recent change history before proposing a solution.
1. Trace impact across adjacent UOS repos and shared contracts before changing interfaces, schemas, or runtime behavior.
1. Prefer evidence over assumption: inspect current code paths, add repro cases, and study real failure modes before implementing a fix.
1. Use external official documentation and standards for any upstream dependency, provider API, framework, CLI, or format touched by the task.
1. For non-trivial work, compare at least two approaches and explicitly choose based on reversibility, operational safety, and long-term maintainability.

### Repo-specific decision rules
- Operator trust beats visual density.
- Every important recommendation should be explainable and inspectable.
- A calm dashboard with high signal is better than exhaustive but noisy coverage.
- Actions with side effects need confidence indicators and escape hatches.

### Mandatory escalation triggers
- Automations that might execute high-impact changes from within the cockpit.
- Ambiguous root-cause claims presented as certainty.
- Any change that mixes reporting surfaces with hidden state mutation.

## 9. Continuous Learning Requirements

### Required learning loop after every task
- Every completed task must leave behind at least one durable improvement: a test, benchmark, runbook, migration note, ADR, or automation asset.
- Capture the problem, evidence, decision, outcome, and follow-up questions in repo-local learning memory so the next task starts smarter.
- Promote repeated fixes into reusable abstractions, templates, linters, validators, or code generation rather than solving the same class of issue twice.
- Track confidence and unknowns; unresolved ambiguity becomes a research backlog item, not a silent assumption.
- Prefer instrumented feedback loops: telemetry, evaluation harnesses, fixtures, or replayable traces should be added whenever feasible.

### Repo-specific research agenda
- Which metrics or review outputs operators actually use to make decisions?
- What alert patterns are currently noisy or low-value?
- How can explanation quality be measured, not just visual completeness?
- What incident/postmortem patterns should feed new review templates?
- Which dashboard views should be simplified or removed entirely?

### Repo-specific memory objects that must stay current
- Operator workflow map.
- Alert quality scorecard.
- Explanation pattern library.
- Review template catalog.
- Incident-to-dashboard gap log.

## 10. Core Workflows the Repo Must Master

1. Monitoring steady-state health and detecting anomalies.
1. Running operating reviews with evidence-backed summaries.
1. Investigating drift, failed actions, or degraded performance.
1. Assessing recommended remediations with clear risk framing.
1. Tracking system changes over time and correlating incidents.

## 11. Interfaces and Dependencies

- Paperclip plugin scaffold for worker, manifest, UI, and validation surfaces.

- `@uos/core` for lifecycle and drift state.
- `@uos/plugin-connectors` for provider health and callback status.
- Department overlays that expose operational metrics or review inputs.
- Underlying telemetry, event, and audit sources.

## 12. Implementation Backlog

### Now
- Define the minimum viable health model across core lifecycle, connector state, and department execution.
- Build the operating review output so it is actionable by humans and autonomous follow-on routines.
- Wire change history, drift signals, and incident evidence into one reviewable surface.

### Next
- Reduce noise by improving anomaly classification and alert suppression logic for known low-signal states.
- Add risk-scored remediation suggestions with direct links into the system that can close the issue.
- Expand visibility into tool-plugin health and cross-repo contract regressions.

### Later
- Turn recurring review patterns into auto-generated investigations and maintenance routines.
- Support role-specific cockpit views for operators, leadership, and department owners.

## 13. Risks and Mitigations

- Beautiful dashboards that do not change operator outcomes.
- Recommendation systems that overstate confidence.
- Metrics sprawl that hides real issues.
- Coupling to internal telemetry shapes that are too brittle.

## 14. Definition of Done

A task in this repo is only complete when all of the following are true:

- The code, configuration, or skill behavior has been updated with clear intent.
- Tests, evals, replay cases, or validation artifacts were added or updated to protect the changed behavior.
- Documentation, runbooks, or decision records were updated when the behavior, contract, or operating model changed.
- The task produced a durable learning artifact rather than only a code diff.
- Cross-repo consequences were checked wherever this repo touches shared contracts, orchestration, or downstream users.

### Repo-specific completion requirements
- Any new signal has a clear operator action path or it should not ship.
- No major UI/UX change is complete without usage and signal-quality instrumentation.
- Recommendations include rationale, evidence, and safe fallback paths.

## 15. Recommended Repo-Local Knowledge Layout

- `/docs/research/` for research briefs, benchmark notes, and upstream findings.
- `/docs/adrs/` for decision records and contract changes.
- `/docs/lessons/` for task-by-task learning artifacts and postmortems.
- `/evals/` for executable quality checks, golden cases, and regression suites.
- `/playbooks/` for operator runbooks, migration guides, and incident procedures.
