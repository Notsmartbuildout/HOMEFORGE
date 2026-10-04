# HOMEFORGE foundation verification

Date: 2026-10-04. Final checkout and application: `C:\DEVELOPMENT\HOMEFORGE`.

Status: ready for future development planning. Known setup, dependency and browser failures were repaired and retested. The user clarified that another complete regression/benchmark run was not required; the broad rerun was stopped at that request.

## Scope

The user authorized settling setup dependencies and failures before feature work. This remediation retains the upstream foundation and repairs dependency security, browser installation and existing catalog drag behaviour. No homeowner features or cloud deployment were implemented.

The public fork, origin/upstream remotes and GitHub Desktop configuration are recorded in `WINDOWS_BASELINE.md`. The original upstream tag and earlier Windows/cloud evidence remain preserved.

## Repairs and causes

1. **Dependencies:** `npm audit --include=dev` originally reported six affected packages. Compatible lockfile updates install Firebase 12.19.0, devalue 5.9.4 and DOMPurify 3.4.16. Firebase's Firestore package still requests grpc `~1.9.0`; a targeted `@grpc/grpc-js` override resolves 1.14.5, beyond the advisory's vulnerable range. No forced Firebase downgrade was used. Keep the override until Firebase's dependency range is patched, then reassess it using an audit and regression tests.
2. **Browser installation:** the AppData browser cache failed Firefox activation and WebKit file import when used from packaged Codex on Windows. Its files appeared under Codex's `LocalCache\Local\ms-playwright` redirect. Installing the same official Playwright 1.63.0 binaries in `.playwright-browsers` inside this checkout resolved both failures. `npm run install:browsers` and the Playwright configuration now consistently select that ignored local cache; an explicitly supplied `PLAYWRIGHT_BROWSERS_PATH` is respected. No binary patch or external manifest is retained. Diagnostic manifest changes were unsuccessful and reverted.
3. **Existing drag operations:** browser event diagnostics showed Windows WebKit retaining standard text formats while removing `application/o3d-type` and `application/o3d-id` between dragstart and dragover. The canvas rejected the drag and never received drop. Catalog cards now provide a marked JSON text fallback alongside the original custom types; the receiver validates kind and nonempty ID and rejects unrelated or malformed text. Existing curved door/window drop and undo assertions pass unchanged in all three engines. Eleven unit cases cover the fallback and malformed payload rejection.
4. **Install scripts:** reviewed npm 11's unreviewed-script notices. Explicit policy allows pinned esbuild 0.28.2's binary installation and denies Firebase's optional environment-config generation, the core-js donation banner and protobufjs's optional version-scheme warning script. A clean install and build pass with this policy. There are no unreviewed dependency install scripts.
5. **Deployment regression clock:** the broad run exposed an inherited test race: computing `Date.now() + 1000` and then sending `pauseAt` took over 1,000 ms under load. The test now installs a known clock and pauses it before editor navigation, matching the existing onboarding test's future-pause pattern. Polling advances only through explicit test commands. All twelve deployment cases pass across the three engines with the original assertions. The initial run is retained as `BROWSER-ALL-INITIAL.log`; the later broad rerun was intentionally stopped when the user narrowed validation to known failures.

The clean install retains one inherited `node-domexception@1.0.0` deprecation warning via `google-auth-library → gaxios → node-fetch → fetch-blob`. This is a migration notice from the dependency author, not a missing dependency, audit vulnerability or failed gate. It was not removed by replacing the inherited authentication stack.

## Final validation

All commands run from the final checkout. Logs: `HOMEFORGE_DOCS/EVIDENCE/FOUNDATION/`.

| Gate | Result |
|---|---|
| Clean `npm ci --include=dev` with `NODE_ENV=production` | Exit 0; 262 packages installed; zero audit vulnerabilities |
| `npm run catalog:check` | Exit 0; 189 entries, 204 GLBs, 20 textures |
| `npm run check` | Exit 0; zero errors and warnings |
| `npm test` | Exit 0; 126 files, 1,186 tests |
| `npm audit --include=dev` | Exit 0; zero vulnerabilities, including development dependencies |
| `npm run build` | Exit 0; adapter-node production build |
| `npm run install:browsers -- chromium firefox webkit` | Exit 0; reproducible official local browser cache |
| Focused unchanged browser cases | Exit 0; 15 passed across all three engines |
| Broad browser rerun | Intentionally stopped at the user's request; see counts below. No observed failures in the corrected rerun. |
| Viewer benchmarks | All six passed in the original Windows baseline; not repeated after the user's scope clarification. |
| Local application and disabled services | `/` and `/editor` HTTP 200; disabled sharing POST endpoints HTTP 503 |

The corrected broad rerun completed all 393 Chromium cases and 325 Firefox cases with zero observed failures before intentional termination. WebKit's complete suite was not repeated in that run. The unchanged focused furniture/curved-opening cases pass in all three engines (15 total), and all deployment cases pass in all three engines (12 total). No cases were skipped or assertions relaxed to resolve the known failures. `BROWSER-REGRESSION-PARTIAL.log` records the stopped run; its interruption is not an application test failure.

`CHECK-INITIAL.log` retains a test-double typing error introduced during repair; the subsequent check passes after replacing an unnecessary DataTransfer cast with the actual method interface. Earlier repro, diagnostic and red-test logs are retained as evidence of the investigation. `EXIT-CODES.txt` is chronological, so historical nonzero entries must be read with the later successful results.

## Reproduce validation

```powershell
Set-Location C:\DEVELOPMENT\HOMEFORGE
$env:NODE_ENV = 'production'
npm ci --include=dev
npm run install:browsers -- chromium firefox webkit
npm run catalog:check
npm run check
npm test
npm audit --include=dev
npm run build
npm run test:browser -- --workers=2 --global-timeout=7200000
npm run benchmark:viewer
Remove-Item Env:NODE_ENV
```

These commands describe an optional future complete validation run, not a remaining setup task. Run the benchmark after the browser suite because both use the production server on port 4188. The browser suite has 393 cases per engine; two workers keep resource usage moderate on this PC. Performance timings and phone viewport benchmarks do not establish physical-phone performance.

## Local use and remaining product work

```powershell
Set-Location C:\DEVELOPMENT\HOMEFORGE
npm run dev -- --host 127.0.0.1
```

Use `http://localhost:5173` consistently. The ignored `.env` disables analytics, handoff uploads and assistant sharing. No keys, paid services or hosted deployment were configured.

This evidence supports beginning future development planning. It does not establish that every application workflow is bug-free or that all three complete browser suites passed after remediation. HOMEFORGE's homeowner dashboard, variants and measurement verification are still planned. Optional inherited external-service paths and offline behaviour need explicit product review before release; neither local configuration nor the regression suite certifies a fully offline homeowner release. See `CHATGPT_PLANNING_HANDOFF.md` for the planning input.
