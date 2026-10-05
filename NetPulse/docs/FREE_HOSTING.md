# Deploy NetPulse on Render's free server

Render's Free Node.js web service runs the React dashboard and the real HTTPS monitoring API together. After deployment, Render assigns an HTTPS URL ending in `onrender.com`. No purchased domain is needed.

## Upload to GitHub first

1. Extract `NetPulse_Full_Project.zip`.
2. Create a GitHub repository, such as `netpulse-network-monitoring`.
3. Upload the files **inside** `NetPulse`. Keep `package.json`, `package-lock.json`, `render.yaml`, `src`, `server`, `lib`, and `.github` at the repository root.
4. Commit the files. Do not upload `node_modules`, `dist`, or your local `.env` file. The included `.gitignore` excludes them when you use Git.

The setup guide includes Git commands and a Windows walkthrough.

## Deploy with the included Blueprint

1. Sign in at [Render](https://dashboard.render.com/) and connect the GitHub account that owns your repository.
2. Choose **New → Blueprint** and select your NetPulse repository.
3. Render reads `render.yaml`. Review the service name and confirm that its plan is **Free**. If you already have a service with the same name, change `name` in `render.yaml` to a unique name before creating this new service.
4. Create the Blueprint and wait for its build and deployment to finish.
5. Open the actual URL displayed in the service dashboard. Use **Demo data** to explore the UI, or select **Live HTTP → Run checks** to measure the server's configured endpoints.
6. Copy the actual deployed URL into GitHub **About → Website** and your portfolio. The URL is assigned during deployment; this package does not claim that an online service already exists.

Future commits trigger redeployment. The Blueprint explicitly uses the Free plan; do not replace it with a paid instance type if you want to stay on free hosting.

## Manual web-service settings

If you create a Web Service instead of a Blueprint, use these settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Branch | Your default branch, usually `main` |
| Root Directory | Leave blank when project files are at the repository root |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Free** |
| Health Check Path | `/api/health` |
| Environment: `NODE_VERSION` | `24` |
| Environment: `HOST` | `0.0.0.0` |

Render supplies `PORT` and `RENDER_EXTERNAL_URL` automatically. The app listens on that port and uses the external HTTPS origin when validating browser check requests.

If you uploaded the entire `NetPulse` folder rather than its contents, set **Root Directory** to `NetPulse` in the manual service settings.

## Configure your own live targets

The default targets are Example Website, Cloudflare Trace, and Wikipedia. To use your own approved public HTTPS endpoints, add this environment variable in Render's service settings:

```text
NETPULSE_TARGETS_JSON
```

Set its value to a JSON array, without surrounding shell quotes:

```json
[{"id":"my-api","name":"My API","url":"https://your-public-domain.example/health","thresholdMs":500,"group":"Core services"}]
```

Replace the illustrative URL with an endpoint you are authorized to check. Save and redeploy. See `SETUP.md` for URL restrictions and target-ID rules.

## Free-plan behavior

- The service sleeps after **15 minutes without incoming traffic**. Opening it again can take about a minute while it starts.
- Free web services share **750 instance hours per workspace each month**, plus bandwidth and build limits. Review Render's current free-plan terms before deploying multiple services.
- Check collection runs while the dashboard is open and visible. This project does not use an external keep-alive service or a background scheduler.
- History and incident acknowledgements stay in the visitor's browser. Server restarts clear the short probe cache, while browser-local history remains on that device.
- A failed public endpoint check is an actual result, not a hosting failure. The measured network path is from Render's server region to the target.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Render cannot find `package.json` | Place project files at the repo root or set Root Directory to `NetPulse`. |
| Build cannot find Vite | Use the documented build command, including `--include=dev`. |
| No open port detected | Confirm Start Command is `npm start` and `HOST` is `0.0.0.0`. |
| The page is slow after inactivity | Wait about a minute for the free service to wake. |
| Live requests receive 403 | Open the service's assigned `onrender.com` URL and confirm Render's `RENDER_EXTERNAL_URL` has not been overridden. |
| An endpoint returns failure | Inspect its HTTP status or timeout; configure its final HTTPS URL without redirects. |

Official references, checked October 5, 2026:

- [Render free services and limits](https://render.com/docs/free)
- [Deploy a Node.js app](https://render.com/docs/deploy-node-express-app)
- [Blueprint specification](https://render.com/docs/blueprint-spec)
- [Web services and port binding](https://render.com/docs/web-services)
- [Default environment variables](https://render.com/docs/environment-variables)
- [Node.js version selection](https://render.com/docs/node-version)
