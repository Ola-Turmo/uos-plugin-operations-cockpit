# Duplicate Repo Cleanup Decision

## Pair Reviewed

- Canonical repo: `uos-plugin-operations-cockpit`
- Cleanup-target repo: `uos-plugin-operations-cockpit-mission-control`

## Result

Keep `uos-plugin-operations-cockpit` as the canonical repo and archive
`uos-plugin-operations-cockpit-mission-control`.

## Evidence

- Both repos publish the same package name: `@uos/plugin-operations-cockpit`
- Both repos expose the same source tree shape
- Source comparison showed:
  - `src only in uos-plugin-operations-cockpit`: `0`
  - `src only in uos-plugin-operations-cockpit-mission-control`: `0`
  - `shared src`: `13`
- The cleanup-target repo has much worse hygiene despite the same source
  surface, including a bloated file count (`2290` files versus `25` in the
  canonical repo), which strongly suggests committed generated material or
  workspace residue rather than unique product capability.

## No-Port Decision

No salvage PRD or porting matrix is needed because no additive functionality was
identified in the cleanup-target repo. The “mission control” naming does not
represent a separate implementation line at the source level.

## Archive Trigger

Archive `uos-plugin-operations-cockpit-mission-control` after this decision is
recorded in the canonical repo.

