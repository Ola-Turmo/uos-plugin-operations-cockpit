# @uos/plugin-operations-cockpit

@uos/plugin-operations-cockpit is the monitoring, review, and dashboard surface for UOS. It should make system state explainable, actionable, and trustworthy for humans and autonomous operators alike.

Built as part of the UOS split workspace on top of [Paperclip](https://github.com/paperclipai/paperclip), which remains the upstream control-plane substrate.

## What This Repo Owns

- Health dashboards, operating reviews, and alert/context surfaces.
- Drill-downs from summary state into causal evidence.
- Recommendation generation with risk framing and actionability.
- Cross-repo and cross-plugin status synthesis.
- Historical analysis and operator workflow instrumentation.

## Runtime Form

- Split repo with package code as the source of truth and a Paperclip plugin scaffold available for worker, manifest, UI, and validation surfaces when the repo needs runtime or operator-facing behavior.

## Highest-Value Workflows

- Monitoring steady-state health and detecting anomalies.
- Running operating reviews with evidence-backed summaries.
- Investigating drift, failed actions, or degraded performance.
- Assessing recommended remediations with clear risk framing.
- Tracking system changes over time and correlating incidents.

## Key Connections and Operating Surfaces

- Sentry, Datadog, Grafana, OpenTelemetry traces, cloud logs, status pages, analytics dashboards, and audit trails required to explain system state and turn anomalies into actions.
- GitHub, Linear, Jira, Notion, Google Docs/Sheets, Slack, email, and calendar surfaces so incidents, reviews, and operating actions can move from detection to closure.
- Deployment/admin consoles for Cloudflare, Vercel, Render, Docker hosts, databases, auth providers, and connector platforms when provider APIs omit the exact evidence operators need.
- Cross-repo contract, runtime, and release metadata from core, connectors, departments, skills, and tool repos whenever the cockpit needs a coherent platform-wide view.

## KPI Targets

- The cockpit detects >= 95% of seeded health degradations in the maintained benchmark scenarios.
- Evidence-backed operating review generation completes in <= 10 minutes from a fresh system snapshot.
- Critical alert false-positive rate stays < 15% on maintained health domains.
- 100% of critical alerts and recommended remediations include linked evidence and explicit risk framing.

## Implementation Backlog

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
