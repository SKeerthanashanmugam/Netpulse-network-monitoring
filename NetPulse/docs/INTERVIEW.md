# Explain NetPulse in an interview

Use this guide after running the project and understanding the code. Do not claim deployment scale, production users, or work you have not done.

## 45-second explanation

“NetPulse is a React and JavaScript dashboard for monitoring HTTP service health. It shows current status, response-time trends, successful-check availability, and incidents. I separated the UI from pure monitoring rules so calculations and incident transitions can be tested independently. Demo mode makes the project easy to explore; live mode sends approved target IDs to a server that performs HTTPS checks. The project handles timeout errors, empty history, paused services, and CSV reporting.”

## Files to understand first

1. `lib/netpulse/model.js`: availability, latency averages, check application, and incident recovery.
2. `src/App.jsx`: state, effects, persistence, filters, and controls.
3. `components/netpulse/charts.jsx`: time buckets and SVG charts without invented measurements.
4. `lib/netpulse/probe.js`: timeout, no redirects, target validation, and controlled server requests.
5. `server/index.js`: API routes and production file serving.
6. `tests/model.test.js`: failure paths and calculation boundaries.

## Questions you should be ready to answer

**Why server-side probes?** Browser-only fetch calls can be blocked by CORS and do not provide a controlled probe location. The server measures approved endpoints and returns small result records.

**How is availability calculated?** Successful observed checks divided by all observed checks in the selected time window. Missing intervals are unknown, not automatically successful. This version is sample-based, not a time-weighted SLA calculator.

**What happens during failure?** The service becomes down, an incident opens, repeated failures reuse the active incident, acknowledgement records investigation, and a healthy recovery closes it.

**How did you avoid unsafe requests?** The browser submits only IDs from server configuration. URLs are operator-controlled and checked for HTTPS, credentials, ports, and common internal addresses. Redirects are not followed. Configured domains still need to be trusted by the operator.

**What does a latency value mean?** Time until HTTP response headers arrive. Failed checks are excluded from the average and full page download time is not measured.

**What would you improve?** Add an authorized background collector, database persistence, multi-user access, alert delivery, multiple probe regions, and automated browser coverage.

## Honest resume bullets after completing your walkthrough

- Developed NetPulse, a responsive React and JavaScript dashboard for HTTP service health, latency trends, check-based availability, and incident tracking.
- Implemented controlled server-side HTTPS checks, timeouts, automatic incident recovery, service filtering, browser-local history, and CSV reporting.
- Verified monitoring calculations and probe failure paths with 20 automated tests; prepared desktop/mobile design references for Figma import.

If you import and refine the layouts in Figma, add Figma to your project tools. The provided SVG import files alone do not establish that you personally designed a native Figma prototype.

## Small changes to make the project your own

- Add one authorized endpoint you control and document actual results.
- Refine one component in Figma and update the matching CSS.
- Add a focused test for a behavior you changed.
- Record a short demo and commit your changes with clear messages.
