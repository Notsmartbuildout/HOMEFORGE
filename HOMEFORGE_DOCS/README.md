# HOMEFORGE bootstrap

Read PROJECT_CHARTER.md, ARCHITECTURE.md, BASELINE.md, ROADMAP.md and HANDOFF.md in this directory. The root README remains upstream documentation.

Requires Git, Node.js 24 and npm. Windows destination: C:\DEVELOPMENT\HOMEFORGE.

The Windows checkout and public GitHub fork now exist. See [WINDOWS_BASELINE.md](WINDOWS_BASELINE.md) for local setup, validation evidence and limitations; [BASELINE.md](BASELINE.md) retains the earlier cloud results. Current status is in [HANDOFF.md](HANDOFF.md).

On another Windows machine, clone with `git clone -c core.autocrlf=false https://github.com/jessenlawson-cell/HOMEFORGE.git C:\DEVELOPMENT\HOMEFORGE` to preserve checksum-sensitive upstream files. Copy `HOMEFORGE_DOCS/LOCAL_ENV.example` to `.env` if it does not already exist, and add `upstream` as `https://github.com/laanlabs/openPlan3D.git`.

PowerShell local commands:

```powershell
cd C:\DEVELOPMENT\HOMEFORGE
$env:NODE_ENV = 'production'
npm ci --include=dev
npm run catalog:check
npm run check
npm test
npm run build
npm audit --include=dev --audit-level=high
npx playwright install chromium firefox webkit
npm run test:browser
npm run benchmark:viewer
Remove-Item Env:NODE_ENV
npm run dev -- --host 127.0.0.1
```

Run browser commands after a successful build. Individual engines: `npm run test:browser -- --project=chromium` (or firefox / webkit). For the dev server use http://localhost:5173. Browser data is tied to the browser profile and origin; keep a consistent URL and export backups. The audit is currently failing upstream; do not run `npm audit fix --force` automatically.

Copy LOCAL_ENV.example to root .env only if .env does not already exist. It disables inherited analytics, handoff uploads and assistant sharing.

The repository is a baseline: homeowner navigation, variants and verification UI are not implemented yet.
