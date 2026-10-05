# NetPulse verification

## Automated tests

Run `npm test`. The test suite contains 20 meaningful cases covering:

- Eight-service demo and three active incident fixtures.
- Threshold equality, degradation, and failed-check priority.
- Sample-based availability and successful-response average latency.
- Reporting-window boundaries and unknown chart buckets.
- Incident deduplication, recovery closure, and severity updates.
- Paused-service sampling and healthy counts.
- Bounded history and corrupt browser-state rejection.
- New-service validation and safe CSV output.
- Operator target restrictions and target-ID selection.
- HTTP probe success, body cancellation, redirect rejection, timeout, and network failure.

Probe tests inject fake network responses, so they are repeatable and do not depend on third-party uptime. Their passing results do not claim all public endpoints are currently available.

## Manual acceptance checklist

| ID | Action | Expected result |
| --- | --- | --- |
| NP-01 | Open the app | Dashboard opens directly with demo data. |
| NP-02 | Run demo checks | Latest values and timestamps update. |
| NP-03 | Repeat failed checks | One active incident per failed service. |
| NP-04 | Search `Payment` | Only matching service remains. |
| NP-05 | Select Down status | Only enabled failed services remain. |
| NP-06 | Combine group/status filters | Matching intersection appears. |
| NP-07 | Use an unmatched search | Empty state and Clear filters appear. |
| NP-08 | Open a service | Detail panel shows measurements and recent checks. |
| NP-09 | Pause a service | New checks do not append samples. |
| NP-10 | Resume a service | Subsequent checks append samples again. |
| NP-11 | Add valid demo service | New service appears as Not checked until checked. |
| NP-12 | Add duplicate endpoint | Validation blocks duplication. |
| NP-13 | Enter invalid URL/threshold | Form displays a useful error. |
| NP-14 | Acknowledge incident | Status persists as acknowledged. |
| NP-15 | Change reporting range | Metrics and charts use the same range. |
| NP-16 | Export CSV | File has headers and one row per service. |
| NP-17 | Reload same browser | Workspace, incidents, and auto preference restore. |
| NP-18 | Switch to Live HTTP | Configured targets replace demo services. |
| NP-19 | Run live checks | Real successful/failure results appear with timestamps. |
| NP-20 | Stop API server | Error banner appears; failures are not replaced by demo data. |
| NP-21 | Use 390 px / 200% zoom | Controls wrap; service table scrolls within its container. |
| NP-22 | Keyboard navigation | Visible focus, dialog focus trap, Escape to close. |
| NP-23 | Close or hide dashboard | Automatic checks do not continue in the background. |
| NP-24 | Inspect missing live history | Unobserved intervals remain gray/null. |

The checklist describes acceptance expectations, not automatically executed browser test results. Browser interaction, viewport, and screen-reader checks require manual verification in your environment. The project has automated logic/probe tests and a production build check. Optional WebMCP tool validation requires a supporting browser and is not a prerequisite for this learning project.

## Completed delivery checks

- `npm ci` installed the exact downloadable dependency lockfile.
- All 20 model/probe tests passed.
- `npm run build` produced the standalone React bundle.
- `npm run verify:render` confirmed the dashboard, eight service rows, and primary controls render.
- `npm run verify:api` checks the production HTML, health endpoint, target listing, platform `PORT` selection, HTTPS browser-origin validation behind a proxy, invalid IDs, cross-origin rejection, body limits, and a real HTTP result record. The test uses the default target configuration; it accepts an explicit external failure result as a valid measured outcome.
- `render.yaml` selects the Free Node.js plan and includes build, start, and health-check settings. These are deployment configuration checks, not evidence of a completed Render deployment.

Browser interaction and screen-reader checks remain manual; the rendered Figma reference is not browser QA.
