# NetPulse setup and GitHub guide

## Run on a Windows laptop

1. Install Node.js from its official website: https://nodejs.org/. Use Node 24 LTS or Node 22.13+.
2. Extract the ZIP completely. Do not run the project inside the ZIP viewer.
3. Open VS Code → File → Open Folder → select `NetPulse`.
4. Open Terminal → New Terminal. If PowerShell blocks `npm.ps1`, select **Command Prompt** in the terminal menu or use `npm.cmd` in the commands below. No system-wide execution-policy change is necessary.
5. Check installation:

```bat
node --version
npm --version
```

6. Install and start:

```bat
npm install
npm run dev
```

7. Open http://localhost:5173. The API runs on 127.0.0.1:3001. Keep the terminal open while using the dashboard. Stop with Ctrl+C.

No API keys, Figma account, database, or payment are required to run the project. An internet connection is needed for installation and real HTTP checks. Demo mode works after dependencies are installed without outgoing probe requests.

## First project walkthrough

- Start in **Demo data**. Review eight services and three active incidents.
- Click **Run checks**. Values update; repeated failures do not create duplicate active incidents.
- Search for `Payment` and select a status filter.
- Click a service name to inspect samples and pause/resume its checks.
- Open **Incidents** and acknowledge an open incident.
- Add a demo service with an HTTPS label and run its first simulated check.
- Select **Live HTTP**, run checks, and observe real measurements or explicit HTTP/network failures.
- Open **Reports** and download a CSV for the selected time period.

## Configure real endpoints

Live targets are operator-controlled. They cannot be added by an untrusted browser request.

The default list is in `lib/netpulse/probe.js`: Example Website, Cloudflare Trace, and Wikipedia. These are public third-party endpoints, so successful results depend on their current availability, redirect behavior, and bot policies. A 403 or redirect is shown as a failed check, not fabricated as success.

To override defaults locally, copy `.env.example` to `.env` and set one JSON value:

```dotenv
NETPULSE_TARGETS_JSON='[{"id":"my-api","name":"My API","url":"https://your-public-domain.example/health","thresholdMs":500,"group":"Core services"}]'
```

Replace the illustrative hostname with a public HTTPS endpoint you control or are authorized to check. Restart `npm run dev`. Existing live history is restored only for unchanged target IDs and URLs.

Use 1–12 targets. IDs must start with a lowercase letter and use lowercase letters, digits, and hyphens. HTTPS is required, credentials in URLs are rejected, nonstandard ports and literal IP addresses are rejected, and common internal hostnames are rejected. Use trusted public hostnames. The operator remains responsible for the configured hostnames and their DNS destinations. The server never follows redirects; configure the final endpoint directly.

On Render, add `NETPULSE_TARGETS_JSON` in the service's **Environment** settings and redeploy. Enter the JSON array directly without the surrounding shell quotes. Both demo mode and real HTTPS checks are available on the free server.

## Build and run a production version

```bash
npm test
npm run build
npm start
```

Open http://localhost:3001. The Node server serves `dist/` and the monitoring API from one origin. It binds to loopback locally. On Render, `render.yaml` sets `HOST=0.0.0.0`, the server listens on Render's `PORT`, and Render provides HTTPS. The API validates browser requests against Render's `RENDER_EXTERNAL_URL`. Follow [the free server guide](FREE_HOSTING.md) to deploy.

## Upload to GitHub

Suggested repository name: **netpulse-network-monitoring**.

For an easy first upload:

1. Create an empty repository in your GitHub account.
2. Choose **Add file → Upload files**.
3. Open the extracted `NetPulse` folder and upload the source files/folders. Put `package.json` and `render.yaml` at the repository root. For hidden items such as `.github`, `.gitignore`, and `.env.example`, Git is more reliable.
4. Keep the file structure intact. Commit with `Initial NetPulse dashboard`.
5. Follow `docs/FREE_HOSTING.md` to deploy a Free web service on Render, then add the resulting `onrender.com` URL to the repository About section.

Using Git in the project terminal:

```bash
git init
git add .
git commit -m "Build NetPulse monitoring dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/netpulse-network-monitoring.git
git push -u origin main
```

Replace `YOUR_USERNAME`. GitHub may ask you to sign in. Never commit `.env`, `node_modules`, `dist`, passwords, or tokens. The project `.gitignore` excludes them. The included GitHub Actions workflow runs tests and the production build on pushes and pull requests.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm` is not recognized | Reopen VS Code after installing Node; check `node --version`. |
| PowerShell blocks `npm.ps1` | Use Command Prompt or `npm.cmd install` / `npm.cmd run dev`. |
| Port 5173 is busy | Stop your older dev process; Vite prints the port it actually uses if allowed to choose another. |
| Port 3001 is busy | Stop your older API process or set `NETPULSE_API_PORT=3002` in `.env`; restart. |
| Live mode cannot load targets | Confirm the API terminal is running and the JSON configuration is valid. |
| Endpoint is down in live mode | Check the HTTP status, timeout, network reachability, and final URL. Some public sites block probes. |
| History disappeared | Browser storage is local; another browser/device, private browsing, or clearing site data starts a new history. |
| Gray chart intervals | No measurements exist in those intervals. Run checks and collect samples. |
| `npm start` reports no build | Run `npm run build` before starting the production server. |
| Render page is slow after inactivity | Free services sleep after 15 minutes without traffic. Allow about a minute for the next request to start the service. |
| Render cannot find `package.json` | Upload the contents of `NetPulse` to the repository root, or set Root Directory to `NetPulse` if you uploaded the whole folder. |
