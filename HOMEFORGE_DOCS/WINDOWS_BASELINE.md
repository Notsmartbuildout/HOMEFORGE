# Windows setup and baseline

This is the historical setup snapshot before remediation. Known dependency and browser failures have since been repaired and retested; current status is in [FOUNDATION_READY.md](FOUNDATION_READY.md) and [HANDOFF.md](HANDOFF.md). Preserve the observations below as baseline evidence.

Date: 2026-10-04 (America/Toronto). Checkout: `C:\DEVELOPMENT\HOMEFORGE`.

## Repository

- Public GitHub fork: https://github.com/jessenlawson-cell/HOMEFORGE
- Verified fork parent: `laanlabs/openPlan3D`; default branch: `main`.
- Starting commit: `d68cadf703578f2cd3a7c77f820e18d342580c32`.
- `origin`: `https://github.com/jessenlawson-cell/HOMEFORGE.git`.
- `upstream`: `https://github.com/laanlabs/openPlan3D.git`.
- Preserved tag: `homeforge-upstream-baseline-2026-10-04`.
- Bootstrap documentation copied from `C:\DEVELOPMENT\HOMEFORGE_SETUP\HOMEFORGE_DOCS`; the cloud bootstrap commits were not substituted for upstream source.
- GitHub Desktop 3.6.6: account `jessenlawson-cell`, existing checkout added, repository HOMEFORGE, branch main. Origin verified in Repository settings. Fork behavior saved as **For my own purposes**.

## Tooling and configuration

Git 2.55.0.windows.5; GitHub CLI 2.100.0; Node v24.20.0; npm 11.19.0.

Git's existing credential was used without printing or persisting its secret elsewhere. Its API identity was verified before creating the fork. GitHub CLI has no separate saved login; Git pushes use the existing Git credential manager.

Root `.env` is ignored by Git and contains:

```dotenv
PUBLIC_ENABLE_ANALYTICS=false
HANDOFF_UPLOADS_ENABLED=false
ASSISTANT_SHARES_ENABLED=false
HANDOFF_BUCKET=
```

Repository-local `core.autocrlf=false` preserves exact upstream bytes. The initial Windows checkout converted license notices and the catalog manifest to CRLF; catalog verification rejected the license checksum. Checksums matched the committed Git blobs. After confirming no tracked modifications, the working tree was extracted from a Git archive of HEAD with original bytes. Catalog verification then passed. No source, license, package manifest, or lockfile changes are part of setup. Global Git settings were preserved.

## Validation

Logs are under `EVIDENCE/WINDOWS/`; older `EVIDENCE/*.log` and `BASELINE.md` describe the separate cloud run.

| Check | Windows result |
|---|---|
| `NODE_ENV=production npm ci --include=dev` | Exit 0; 260 packages installed. Installation audit reported 6 vulnerabilities: 5 high and 1 low. |
| `npm run catalog:check` | Initial exit 1 from CRLF conversion; after restoring original bytes, exit 0: 189 entries, 204 GLBs, 20 textures. |
| `NODE_ENV=production npm run check` | Exit 0; zero errors and warnings. |
| `npm test` | Exit 0; 125 files and 1,175 tests passed. |
| `NODE_ENV=production npm run build` | Exit 0; adapter-node production build created. Final build after restoring original LF bytes also passed. |
| `NODE_ENV=production npm audit --audit-level=high` | Exit 0; one low DOMPurify advisory. This omits development dependencies and is not the full dependency result. |
| `NODE_ENV=production npm audit --include=dev --audit-level=high` | Exit 1; six vulnerabilities, five high and one low. Firebase/grpc and devalue paths are high; DOMPurify is low. No dependency changes made. |
| `npx playwright install chromium firefox webkit` | Exit 0; all three engines installed. |
| Browser regressions | Combined two-worker run: 393 Chromium cases passed; five Firefox launch failures stopped the run, with 781 cases not run. Separate WebKit run: 86 passed, 5 failed, 1 interrupted, 301 did not run, exit 1. Initial serial run was intentionally stopped after 57 passing Chromium cases; six workers caused resource contention and that partial run was also stopped. Both partial logs are retained, and their termination exits are not application failures. |
| Viewer benchmarks | Exit 0; all six passed with the default one-worker configuration: small, medium and large homes at desktop and phone viewport sizes. Logs and six metrics JSON files retained. Phone viewport results describe a viewport on this PC, not physical phone performance. |
| Development server HTTP | `/` and `/editor` returned 200 at `http://localhost:5173`. POST requests to `/api/assistant-shares` and `/api/handoffs` returned 503 with sharing disabled. |

Firefox 155.0 / Playwright revision 1543 fails before application execution with `browserType.launch: spawn UNKNOWN`. Direct `firefox.exe --version` fails with Windows' side-by-side configuration error. The Application event log identifies the missing `mozglue` assembly. `mozglue.dll` exists in the installation; a supported `npx playwright install firefox --force --no-remove` reinstall succeeded but reproduced the same loader failure. No application regression is established by those launch failures. See `FIREFOX-LAUNCH-DIAGNOSTIC.json` and `FIREFOX-REINSTALL.log`; the blocker requires a separate investigation of this browser package on Windows.

WebKit failures: furniture context actions could not find the imported Armchair; crossing-room Blender export timed out waiting for a download; dropped curved-wall door/window assertions found no inserted opening; curved-opening splitting could not find Wall 1. Error contexts are preserved under `WEBKIT_FAILURES/`. A focused five-case recheck with one worker and the final build returned exit 1: two passed (crossing-room export and curved-opening splitting), while three repeated (the Armchair timeout and both curved-wall opening drop assertions). The initial failures remain recorded; remaining full-suite WebKit coverage is unverified. No application changes are included in baseline setup.

Browser regression commands used the existing production-server configuration on port 4188:

```powershell
$env:NODE_ENV = 'production'
npm run test:browser -- --workers=2 --max-failures=5 --global-timeout=3600000
npm run test:browser -- --project=webkit --workers=2 --max-failures=5 --global-timeout=1800000
npm run benchmark:viewer
npm run test:browser -- tests/browser/context-furniture-actions.spec.ts tests/browser/crossing-rooms.spec.ts tests/browser/curved-opening-drop.spec.ts tests/browser/curved-openings.spec.ts --project=webkit --workers=1 --grep 'furniture context actions|crossing dividers|drop a (door|window)|after splitting' --max-failures=5 --global-timeout=900000
```

The five-failure cap bounds repeated failures while preserving diagnostics. Coverage not reached after that cap remains unverified.

## Inherited network paths

Source review confirms the analytics module import is gated by `PUBLIC_ENABLE_ANALYTICS`. Server handoff and assistant upload routes reject requests unless their enable flag is true and a bucket exists. The source also retains Firebase capture download via `/editor?import=CODE`, direct Gemini and OpenAI provider requests when configured and invoked, and the hosted assistant connector link. Do not claim every inherited workflow is offline. No provider keys or cloud services were configured during setup.

## Launch

```powershell
Set-Location C:\DEVELOPMENT\HOMEFORGE
npm run dev -- --host 127.0.0.1
```

Use `http://localhost:5173` consistently for browser project storage. The development server must run in a terminal; stop it with Ctrl+C. Production build commands require `$env:NODE_ENV = 'production'`; remove that variable before running the development server.

Feature implementation remains unstarted. Retain baseline evidence and address inherited validation failures in a separate follow-up before a release.
