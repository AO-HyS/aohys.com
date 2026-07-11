# Issue Tracker

Linear is the source of truth for AOHYS planning and execution.

## Configuration

- Workspace: `Aohys`
- Team: `Aohys` (`AOH`)
- Primary project: `AOHYS Dashboard 100/100`
- External pull requests are not an automatic triage surface.

## Operations

Skills must use the Linear integration to read, create, and update projects, issues, comments, labels, assignees, and relationships.

## Wayfinding operations

- The canonical map is an issue labeled `wayfinder:map`.
- Its tickets use `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- Tickets are linked to the map through Linear's parent-child relationship.
- Dependencies use the native `blockedBy` and `blocks` relationships.
- A ticket is claimed by assigning it before work begins.
- The frontier contains open, unassigned child tickets with no open blockers.
- Decisions are recorded as resolution comments and indexed in the map description.

