# @uos/plugin-operations-cockpit

@uos/plugin-operations-cockpit is the operator surface for UOS health, drift evidence, operating reviews, and remediation entrypoints. It should make system state explainable, actionable, and trustworthy without taking over setup ownership or the canonical core engine.

Built as part of the UOS split workspace on top of [Paperclip](https://github.com/paperclipai/paperclip), which remains the upstream control-plane substrate.

## Boundary Summary

- Owns health, drift evidence, operating reviews, and operator-facing remediation entrypoints.
- Consumes canonical lifecycle evidence from [uos-core](https://github.com/Ola-Turmo/uos-core).
- Surfaces connector and tool health from [uos-plugin-connectors](https://github.com/Ola-Turmo/uos-plugin-connectors) and the narrow tool plugins.
- Does not own first-run setup UX or the canonical apply and rollback engine.

## What This Repo Owns

- Health dashboards, operating reviews, and alert or context surfaces.
- Drill-downs from summary state into causal evidence and linked artifacts.
- Recommendation generation with risk framing and remediation entrypoints.
- Cross-repo and cross-plugin status synthesis for operators.
- Historical analysis and operator workflow instrumentation.

## Runtime Form

- Plugin-first cockpit that renders evidence from core, connectors, departments, and tools into a coherent operator surface.

## Highest-Value Workflows

- Monitor steady-state health and detect anomalies.
- Run operating reviews with evidence-backed summaries.
- Investigate drift, failed actions, or degraded performance.
- Assess recommended remediations with clear risk framing before action is launched elsewhere.
- Track system changes over time and correlate incidents across slimmer plugins.

## Key Connections and Operating Surfaces

- Sentry, Datadog, Grafana, OpenTelemetry traces, cloud logs, status pages, analytics dashboards, and audit trails required to explain system state and turn anomalies into actions.
- GitHub, Linear, Jira, Notion, Google Docs/Sheets, Slack, email, and calendar surfaces so incidents, reviews, and operating actions can move from detection to closure.
- Deployment and admin consoles for Cloudflare, Vercel, Render, Docker hosts, databases, auth providers, and connector platforms when provider APIs omit the evidence operators need.
- Cross-repo contract, runtime, and release metadata from core, connectors, departments, skills, and tool repos whenever the cockpit needs a coherent platform-wide view.

## KPI Targets

- The cockpit detects >= 95% of seeded health degradations in the maintained benchmark scenarios.
- Evidence-backed operating review generation completes in <= 10 minutes from a fresh system snapshot.
- Critical alert false-positive rate stays < 15% on maintained health domains.
- 100% of critical alerts and recommended remediations include linked evidence and explicit risk framing.

## Implementation Backlog

### Now
- Define the minimum viable health model across core lifecycle, connector state, and tool or department execution.
- Build the operating review output so it is actionable by humans and autonomous follow-on routines.
- Wire change history, drift signals, and incident evidence into one reviewable surface.

### Next
- Reduce noise by improving anomaly classification and alert suppression logic for known low-signal states.
- Add risk-scored remediation suggestions with direct links into the systems that can close the issue.
- Expand visibility into tool-plugin health and cross-repo contract regressions.

### Later
- Turn recurring review patterns into auto-generated investigations and maintenance routines.
- Support role-specific cockpit views for operators, leadership, and domain owners.

## Local Plugin Use

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName":"<absolute-path-to-this-repo>","isLocalPath":true}'
```

## Validation

```bash
npm install
npm test
npm run plugin:typecheck
npm run plugin:test
```
