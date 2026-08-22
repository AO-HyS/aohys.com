# IM-12 Browser QA capture protocol

This protocol captures route/load, render cadence, long tasks, and WebGL lifecycle evidence without adding a browser runtime dependency or an arbitrary numeric budget.

## Preconditions

1. Build and serve the integrated candidate with its real release SHA.
2. Use the T3 collaborative Browser preview. Do not substitute ad hoc Playwright.
3. Install `scripts/performance/browser-harness.js` in the inspected page with the Browser evaluation facility. The script creates `window.__AOHYS_PERFORMANCE_CAPTURE__` and performs no network or provider writes.
4. Validate every returned object against `scripts/performance/browser-capture.schema.json` before retaining it as evidence.

## Captures

Run at least 5 seconds per scenario and retain the JSON result with candidate SHA, URL, browser version, viewport, and whether the run was cold or warm.

```js
await window.__AOHYS_PERFORMANCE_CAPTURE__.capture({
  journey: "architecture",
  scenario: "visible",
  durationMs: 5000,
});
```

Capture these states independently:

| Scenario         | Browser setup                                                            | Evidence expected                                                                   |
| ---------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `visible`        | Architecture canvas in viewport and tab foregrounded                     | Visible frame count, frame deltas, long tasks, navigation/resource totals           |
| `offscreen`      | Scroll until every WebGL canvas is outside the viewport                  | Offscreen frame count; verify the component stops or materially suppresses its loop |
| `hidden`         | Start capture, then background the preview/tab for the sampling interval | Hidden frame count and throttling behavior                                          |
| `reduced-motion` | Enable reduced-motion emulation before navigation, reload, then capture  | Reduced-motion frame count and component behavior                                   |

Also capture one dashboard journey each for `overview`, `projects`, `leads`, `resume`, and `settings` to pair route/load/render evidence with the build import-graph report.

## Interpretation

- Results are report-only. Do not turn frame, long-task, or route-load values into blocking budgets from one local machine.
- A missing Navigation Timing entry or unsupported Long Tasks API remains explicit in JSON; it is not converted to zero.
- Compare runs only when SHA, route, viewport, browser, cache state, and scenario match.
- Browser evidence closes render/WebGL local coverage. It does not prove production RUM or Convex provider behavior.
