# Handoff

User: Jesse Lawson. Project: HOMEFORGE. Date: 2026-10-04. GitHub account verified: jessenlawson-cell. Actual repository and application path: C:\DEVELOPMENT\HOMEFORGE.

The bootstrap originated in a Linux cloud workspace. The authorized Windows setup has now created the real public GitHub fork, cloned its current default branch into the final path, installed dependencies, imported the bootstrap documentation, and configured GitHub Desktop through its UI. Current Windows results are in WINDOWS_BASELINE.md; BASELINE.md and EVIDENCE/*.log retain the distinct historical cloud results.

Upstream: https://github.com/laanlabs/openPlan3D.git
Pinned commit: d68cadf703578f2cd3a7c77f820e18d342580c32
Baseline tag: homeforge-upstream-baseline-2026-10-04
Verified origin: https://github.com/jessenlawson-cell/HOMEFORGE.git
Verified upstream: https://github.com/laanlabs/openPlan3D.git
GitHub metadata: fork=true, parent=laanlabs/openPlan3D, default branch=main.
GitHub Desktop: HOMEFORGE selected on main, signed in as jessenlawson-cell; fork behavior saved and verified as For my own purposes.

Product decisions are in PROJECT_CHARTER.md and ARCHITECTURE.md. Source, lockfile, license and upstream history remain unchanged. HOMEFORGE additions are documentation and ignored local configuration only. Repository-local core.autocrlf=false preserves checksum-sensitive upstream bytes; global Git settings were preserved.

Windows validation: dependency install, catalog verification, type checking (zero errors/warnings), 1,175 tests in 125 files, final production build, all 393 Chromium cases and all six rendering benchmarks passed. Full dependency audit fails with six vulnerabilities (five high, one low); production-only audit omits affected development dependencies and must not be represented as a full pass.

Firefox installed but cannot launch due to a Windows side-by-side / mozglue assembly error, reproduced after a supported reinstall. Five launch failures stopped the combined regression run. Separate WebKit run: 86 passed, 5 failed, 1 interrupted, 301 not run. Focused single-worker recheck: 2 passed, 3 failed again (furniture context actions and curved-wall door/window drops). Full Firefox/WebKit coverage is incomplete. Exact commands, error contexts, logs and benchmark metrics are in WINDOWS_BASELINE.md and EVIDENCE/WINDOWS. These findings do not block recording the setup baseline, but the baseline is not a fully passing release gate.

Local .env disables analytics, handoff uploads and assistant sharing, with an empty bucket. The development server returned HTTP 200 for / and /editor and HTTP 503 for disabled sharing POST endpoints. Inherited Firebase capture downloads and direct AI provider paths remain; see the source inventory in WINDOWS_BASELINE.md. Full offline behaviour is not certified.

Launch in PowerShell:

```powershell
Set-Location C:\DEVELOPMENT\HOMEFORGE
npm run dev -- --host 127.0.0.1
```

Use http://localhost:5173 consistently. No features have been implemented. Next work requires a separate task: review inherited audit findings and any browser/benchmark failures, then proceed to M1/M2 when authorized. Preserve upstream MIT attribution and baseline evidence. Do not force dependency upgrades or push to upstream.
