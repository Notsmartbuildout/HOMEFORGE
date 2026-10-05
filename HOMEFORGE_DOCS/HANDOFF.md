# Handoff

Owner: Jesse Lawson (`jessenlawson-cell`). Date: 2026-10-04. Final Git repository and application: `C:\DEVELOPMENT\HOMEFORGE`.

## Current state

The authorized Windows setup, known-error remediation and M1.1–M2.5 development sequence are complete. Every milestone is committed on `foundation-remediation` and pushed to the owner's fork. M2.4 checkpoint: `bbd01528ea88a90b0b844241fb6f692c9618aa7e`. This M2.5 checkpoint completes safe option removal, exact-byte damaged-metadata archival and the resilience audit. Hosted deployment remains out of scope.

M3.1 added a Renovation Zone overview around the existing `RenovationProject`, with exact Existing/option opening, recovery messages and a save-before-return editor link. No schema or database migration was made. The inherited numeric wall/opening/stair controls and direct manipulation were reused. Gates for this slice: 1,260 unit tests, zero type-check errors/warnings, production build and 18 relevant browser cases across Chromium, Firefox and WebKit passed. `M3_M6_DESIGN.md` and `M3_M6_IMPLEMENTATION_PLAN.md` hold the working design and execution sequence.

M4 capture and backup/restore are in progress. The current implementation adds IndexedDB v3 zone/evidence stores, a guided capture route, original file SHA-256 records, and HOMEFORGE backup v2 with v1 restore compatibility. Restore copies zone and asset records with remapped ownership IDs; confirmed feature bindings now copy with new options. Fresh October 5 gates for this checkpoint: 1,273 unit tests in 133 files, zero type-check errors/warnings, production build, and 21 relevant browser cases across Chromium, Firefox and WebKit passed. The browser gate includes original-file capture, export and restore at desktop and phone widths. M4 measurement/coverage, legend UI, and import review remain open; do not report M4 complete.

Read [MILESTONE_AUDIT.md](MILESTONE_AUDIT.md), [M2_5_RESILIENCE.md](M2_5_RESILIENCE.md) and [M2_4_BASELINE_PROTECTION.md](M2_4_BASELINE_PROTECTION.md) for earlier APIs, invariants and evidence. Prior M2.5 gates: 1,260 unit tests in 132 files, 60 browser cases across three engines, zero type-check errors/warnings, production build passed. Logs are retained in EVIDENCE; M0 evidence below remains historical. The original `main` snapshot is older; use `foundation-remediation` for subsequent development.


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

Continue from [M3_M6_DESIGN.md](M3_M6_DESIGN.md) and [M3_M6_IMPLEMENTATION_PLAN.md](M3_M6_IMPLEMENTATION_PLAN.md). M1.1–M2.5 and the M3.1 overview are complete; do not repeat them. Finish M4 measurement/coverage, legend identity and import review from the capture/backup checkpoint before M5. Existing Conditions is protected, intentional correction is explicit and session-only, options are independent, switches preserve latest edits, and removal/recovery retain geometry and damaged bytes.

Future controls must use shared mutation/write guards. Deliberate adoption can share a baseline ID across renovations; correction affects all those references. Measurement provenance, native capture, AI, structural/code calculations and deployment remain future decisions. This verified foundation is ready for further UI development; universal bug-free or fully offline behavior has not been claimed.
