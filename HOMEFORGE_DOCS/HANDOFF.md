# Handoff

Owner: Jesse Lawson (`jessenlawson-cell`). Date: 2026-10-04. Final Git repository and application: `C:\DEVELOPMENT\HOMEFORGE`.

## Current state

The authorized Windows setup and known-error remediation are complete. M1.1 and M1.2 are committed and pushed to the fork; M1.2 checkpoint is `39ca141`. M1.3 adds editor identity and safe return navigation, with verified results in [M1_3_EDITOR_CONTEXT.md](M1_3_EDITOR_CONTEXT.md). Jesse's continuing milestone objective authorizes implementation and commit/push checkpoints through M2.5. Baseline enforcement and options remain pending; hosted deployment remains out of scope.

Read [M1_3_EDITOR_CONTEXT.md](M1_3_EDITOR_CONTEXT.md) and [M1_2_COMPLETE.md](M1_2_COMPLETE.md) for APIs/recovery behavior, and [M1_1_DOMAIN_FOUNDATION.md](M1_1_DOMAIN_FOUNDATION.md) for the domain/schema migration. Current verification: all 1,228 unit tests in 129 files, 33 targeted HOMEFORGE browser cases across three engines, production build and type checking with zero errors/warnings pass. M0 evidence below remains historical.

- Public fork: https://github.com/jessenlawson-cell/HOMEFORGE
- `origin`: https://github.com/jessenlawson-cell/HOMEFORGE.git
- `upstream`: https://github.com/laanlabs/openPlan3D.git
- Verified fork parent: `laanlabs/openPlan3D`; default branch: `main`.
- Original upstream commit: `d68cadf703578f2cd3a7c77f820e18d342580c32`.
- Preserved baseline tag: `homeforge-upstream-baseline-2026-10-04`.
- Remediation checkpoint: `homeforge-foundation-ready-2026-10-04`.
- GitHub Desktop: HOMEFORGE added from the final path, signed in as `jessenlawson-cell`, fork behaviour **For my own purposes**.
- Repository-local `core.autocrlf=false` preserves checksum-sensitive files; global Git settings and upstream MIT attribution are preserved.

## Repairs and verification

Compatible dependency updates and a targeted grpc override clear the full audit, including development dependencies. Official Playwright binaries now install in an ignored repository-local cache to avoid the observed packaged-Windows AppData failures. Existing catalog drags have a validated text fallback for Windows WebKit. An inherited deployment-test clock race was corrected without relaxing assertions.

Verified: clean install, catalog check, type check with zero errors/warnings, 1,186 unit tests in 126 files, production build, zero full-audit vulnerabilities, reproducible browser installation, all 15 focused furniture/curved-opening cases and all 12 deployment cases across all three engines.

The corrected broad rerun passed all 393 Chromium cases and 325 Firefox cases without observed failures. Jesse then clarified that repeating the full suite was unnecessary and requested preparation for development strategy. The remaining broad run was intentionally stopped. WebKit's full suite was not repeated; its known failures pass focused rechecks. All six viewer benchmarks passed in the original Windows baseline and were not repeated after this clarification.

Details and evidence: [FOUNDATION_READY.md](FOUNDATION_READY.md), with logs in `EVIDENCE/FOUNDATION`. [WINDOWS_BASELINE.md](WINDOWS_BASELINE.md) and [BASELINE.md](BASELINE.md) preserve historical Windows and cloud results; their old failures are not the current repair status.

## Local application

```powershell
Set-Location C:\DEVELOPMENT\HOMEFORGE
npm run dev -- --host 127.0.0.1
```

Use `http://localhost:5173` consistently. Both `/` and `/editor` return HTTP 200. The ignored `.env` disables analytics, handoff uploads and assistant sharing, with an empty bucket. Disabled sharing POST endpoints return HTTP 503. Browser projects are tied to browser profile and origin; export backups before changing either.

No keys, paid services or hosted deployment were configured. Optional inherited Firebase capture and direct AI-provider paths remain for later product review. A tested foundation does not prove every possible workflow is bug-free or certify fully offline behaviour.

## Next action

Continue the authorized sequence in [M2_IMPLEMENTATION_PLAN.md](M2_IMPLEMENTATION_PLAN.md), committing and pushing each verified milestone to the owner's fork. Independent options, baseline correction/enforcement and resilience are the remaining authorized milestones. Measurement/AI/native-scanner work and hosted deployment remain outside this objective.
