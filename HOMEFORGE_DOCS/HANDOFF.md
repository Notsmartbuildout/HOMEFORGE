# Handoff

Owner: Jesse Lawson (`jessenlawson-cell`). Updated: 2026-10-08. Final Git repository and application: `C:\DEVELOPMENT\HOMEFORGE`.

## Current state

The authorized Windows setup, known-error remediation and M1.1–M2.5 development sequence are complete. Current M3–M6 work is published on `origin/foundation-remediation`. M2.4 checkpoint: `bbd01528ea88a90b0b844241fb6f692c9618aa7e`. M2.5 completed safe option removal, exact-byte damaged-metadata archival and the resilience audit. Hosted deployment remains out of scope.

M3.1 added a Renovation Zone overview around the existing `RenovationProject`, with exact Existing/option opening, recovery messages and a save-before-return editor link. No schema or database migration was made. The inherited numeric wall/opening/stair controls and direct manipulation were reused. Gates for this slice: 1,260 unit tests, zero type-check errors/warnings, production build and 18 relevant browser cases across Chromium, Firefox and WebKit passed. `M3_M6_DESIGN.md` and `M3_M6_IMPLEMENTATION_PLAN.md` hold the working design and execution sequence.

M4 capture and backup/restore added IndexedDB v3 zone/evidence stores, a guided capture route, original file SHA-256 records, and HOMEFORGE backup v2 with v1 restore compatibility. Restore copies zone and asset records with remapped ownership IDs; confirmed feature bindings copy with new options. The earlier capture checkpoint passed 1,273 unit tests in 133 files, zero type-check errors/warnings, production build, and 21 browser cases across Chromium, Firefox and WebKit. The browser gate included original-file capture, export and restore at desktop and phone widths.

M4 is complete at checkpoint `4f41a33`. It adds persisted feature labels/relations, reviewed binding of older options, per-feature measurements, coverage prompts and a user-declared sufficient state, relevant-geometry verification, calculated nominal stair riser height, an editor legend, evidence links, derived image previews, and RoomPlan draft review. Removing an option also removes its bindings atomically. Restore keeps a zone with an unmatched floor/element binding in recovery; existing projects and workspace metadata remain available. RoomPlan review does not replace Existing Conditions. Verification shows the saved geometry value and whether it differs from the observation; it is not an engineering guarantee. Final October 5 gates on the committed code: 1,282 unit tests in 134 files, `npm run check` with zero errors/warnings, production build, and nine relevant browser cases across Chromium, Firefox and WebKit. The owner requested fewer repeated tests, so broader browser suites were not rerun.

M5 proposal review and exact numeric legend commands were committed as `9668139` and are included in `origin/main`. Manual measurements and reviewed RoomPlan dimensions produce previews; acceptance checks current saved project/zone state, Existing correction permission, evidence availability and exact target ownership before using shared editor mutations, one undo group and save. Unsupported commands and photo-only scan claims are rejected. An October 8 WebKit transition fix keeps command entry unavailable while switching options. Its gate passed 1,287 unit tests in 136 files, zero type-check errors/warnings, production build and six proposal/RoomPlan browser cases across Chromium, Firefox and WebKit.

M6 adds saved feature and dimension comparison to the zone page, with reviewed identity relationships, current/stale observation status and a CSV containing value, unit, source, date and evidence filename. Export rereads saved records so another tab's edit makes verification stale in the CSV. It distinguishes unbound and missing elements rather than inventing an option measurement. A non-sensitive front-entry/stair sample covered context/focus capture, key dimensions, two independent options, changed Option A stair width, 2D/elevation/3D inspection, CSV, backup and restore. Normal sample use made no external HTTP requests. A 390 px case confirmed the existing stair numeric control is reachable and Existing remains protected. October 8 gate: 1,288 unit tests in 137 files, zero type-check errors/warnings, production build and nine focused browser cases across Chromium, Firefox and WebKit. See `FRONT_ENTRY_STAIR_PILOT.md`. Real house measurements start when the owner uses the ready software.

Read [MILESTONE_AUDIT.md](MILESTONE_AUDIT.md), [M2_5_RESILIENCE.md](M2_5_RESILIENCE.md) and [M2_4_BASELINE_PROTECTION.md](M2_4_BASELINE_PROTECTION.md) for earlier APIs, invariants and evidence. Prior M2.5 gates: 1,260 unit tests in 132 files, 60 browser cases across three engines, zero type-check errors/warnings, production build passed. Logs are retained in EVIDENCE; M0 evidence below remains historical. Current work is on `foundation-remediation`; `origin/main` contains M5 through `9668139` but not the later M5 verification fix or M6.


- Historical public fork: https://github.com/jessenlawson-cell/HOMEFORGE
- Current `origin`: https://github.com/Notsmartbuildout/HOMEFORGE.git (confirmed by the owner on 2026-10-08); `foundation-remediation` was pushed with M6 checkpoint `b8899d8`. `origin/main` includes M5 through `9668139` but not the later branch commits.
- `upstream`: https://github.com/laanlabs/openPlan3D.git
- Historical fork parent: `laanlabs/openPlan3D`; the owner confirmed the current `origin` as the publication target.
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

Use `http://localhost:5173` consistently. The October 8 dev smoke check returned HTTP 200 for `/` and `/zone`; browser tests cover `/editor`. Analytics now requires explicit opt-in, and the ignored `.env` disables handoff uploads and assistant sharing with an empty bucket. Disabled sharing POST endpoints return HTTP 503. Browser projects are tied to browser profile and origin; export backups before changing either.

No keys, paid services or hosted deployment were configured. Optional inherited Firebase capture and direct AI-provider actions remain outside the local mapping workflow; their presence means every editor feature is not certified offline. The sample mapping path observed no external HTTP requests.

## Next action

M1.1–M2.5 and M3–M6 have passed their specified software gates. The next product action is the owner's first real front-entry/stair mapping session using [FRONT_ENTRY_STAIR_PILOT.md](FRONT_ENTRY_STAIR_PILOT.md), beginning with a HOMEFORGE backup. Use the `foundation-remediation` checkout; remote `main` has not received M6. Keep the owner's reduced-testing preference for future changes. Existing Conditions is protected, intentional correction is explicit and session-only, options are independent, switches preserve latest edits, and removal/recovery retain geometry and damaged bytes.

Future controls must use shared mutation/write guards. Deliberate adoption can share a baseline ID across renovations; correction affects all those references. Native capture, AI, structural/code calculations and deployment remain future decisions. The software is ready for the owner's first local mapping session; universal bug-free or fully offline behavior has not been claimed.
