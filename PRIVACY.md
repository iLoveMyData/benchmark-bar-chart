# Privacy Policy

_Last updated: May 2026_

## Summary

**Benchmark Bar Chart** is a Power BI custom visual. It runs entirely inside the Power BI sandbox on the user's machine or in the Power BI Service browser tab. It **does not collect, transmit, or store any personal data, telemetry, or report content** on any external server.

## What the visual processes

The visual receives only the data the user explicitly binds to its three data roles:

| Role | Purpose |
|------|---------|
| Category | One label per item, displayed on the y-axis |
| Reference | The benchmark/target value, used to compute the gap |
| Actual | The realized value, compared against the reference |

This data is processed in memory, only for the duration of a render, exclusively to draw the chart, the side panel, and the tooltips. It is **never** persisted, exported, or sent anywhere by the visual.

## What the visual does NOT do

- It does **not** make any HTTP, fetch, XHR, or WebSocket request to any external service.
- It does **not** load any third-party script, font, image, or stylesheet from the network.
- It does **not** read cookies, localStorage, sessionStorage, or browser history.
- It does **not** access any device sensor, camera, microphone, geolocation, or clipboard.
- It does **not** include any analytics, tracking, A/B-testing, or telemetry SDK.
- It does **not** read or write any file on the user's machine.

## State persistence

The visual stores a small set of UI state (current sort mode, current metric, page number, search text) in the Power BI report itself, via the official `host.persistProperties` API. This state lives inside the report file (`.pbix`) and is never sent to any third party.

## Data residency

All processing happens inside the Power BI sandboxed iframe. Data residency, retention, and access controls are governed entirely by the user's Power BI tenant and Microsoft's terms — the visual adds no additional storage or processing surface.

## Compliance

Because the visual processes no personal data outside the user's Power BI environment, it has no GDPR, CCPA, HIPAA, or PIPEDA obligations of its own. The applicable data-protection regime is the one your organization has configured for Power BI itself.

## Contact

For privacy questions or to report a vulnerability, please open a GitHub issue:
https://github.com/iLoveMyData/benchmark-bar-chart/issues

Or contact the author by email: **karar.sammy@outlook.fr**
