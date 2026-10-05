# NetPulse — Network Service Monitoring Dashboard

A responsive network service monitoring dashboard built with React, JavaScript, HTML, CSS, and Node.js. Track service health, view response-time charts, manage incidents, and export CSV reports. Includes desktop and mobile design references for import into Figma.

**[Open the live dashboard](https://netpulse-network-monitoring.onrender.com)**

## Features

- Network overview with service status, measured-check availability, average response time, and active incidents.
- **Demo data:** eight simulated services for exploring the dashboard.
- **Live HTTP:** real server-side checks of configured public HTTPS endpoints.
- Manual checks and optional automatic checks every 30 seconds while the dashboard is open and visible.
- Service search, filters, details, and pause/resume controls.
- Automatic incident creation, acknowledgement, severity updates, and recovery closure.
- Response-time charts and CSV reports for selected reporting windows.
- Separate demo and live histories saved in browser storage.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React, JavaScript / JSX, HTML, CSS |
| Build | Vite |
| Backend | Node.js HTTP server and Fetch API |
| UI | Radix UI, Lucide icons, Sonner notifications |
| Charts | SVG |
| Hosting | Render Free web service |
| Design assets | Desktop/mobile SVG layouts and JSON design tokens for Figma |

## Run locally

Use Node.js 24, or a supported Node.js version from 22.13 to below 25.

```bash
git clone https://github.com/SKeerthanashanmugam/Netpulse-network-monitoring.git
cd Netpulse-network-monitoring/NetPulse
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Select **Demo data** to explore sample services, or **Live HTTP** and **Run checks** to collect real measurements.

The default live targets are Example Website, Cloudflare Trace, and Wikipedia. Operators can configure targets through `NETPULSE_TARGETS_JSON`; see the [setup guide](NetPulse/docs/SETUP.md).

## Verify and build

Run these commands from the `NetPulse` directory:

```bash
npm test
npm run build
npm start
```

The production dashboard and API are served at [http://localhost:3001](http://localhost:3001).

## Render deployment

The application source is inside the repository's `NetPulse` folder. For a manual Render deployment, use:

| Setting | Value |
| --- | --- |
| Service | Node.js web service |
| Branch | `main` |
| Root Directory | `NetPulse` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free |
| Region | Singapore |
| Environment | `NODE_VERSION=24`, `HOST=0.0.0.0` |

The Node.js server serves the frontend and monitoring API together and uses Render's supplied `PORT`.

## Monitoring behavior

Availability is the percentage of recorded checks that receive a successful HTTP response. Average response time measures the time to receive response headers for successful checks. Unmeasured intervals remain unknown.

Checks stop when the dashboard closes or is hidden. History is local to each browser. This project monitors HTTPS endpoints; it does not measure ICMP ping, packet loss, TCP ports, or DNS health.

## Documentation and Figma assets

- [Setup and target configuration](NetPulse/docs/SETUP.md)
- [Architecture and API](NetPulse/docs/ARCHITECTURE.md)
- [Testing guide](NetPulse/docs/TESTING.md)
- [Interview walkthrough](NetPulse/docs/INTERVIEW.md)
- [Figma import guide](NetPulse/design/FIGMA_GUIDE.md)
- [Desktop design](NetPulse/design/NetPulse_Desktop.svg)
- [Mobile design](NetPulse/design/NetPulse_Mobile.svg)
- [Design tokens](NetPulse/design/design-tokens.json)

The design files are SVG import assets and design tokens. Follow the Figma guide to create frames, reusable components, and prototype interactions.

![NetPulse desktop design reference with simulated data](NetPulse/design/NetPulse_Desktop.svg)

## License

[MIT](NetPulse/LICENSE). See [third-party notices](NetPulse/THIRD_PARTY_NOTICES.md) for included UI components.
