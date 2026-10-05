# HOMEFORGE: ChatGPT planning handoff

## Request to ChatGPT

Act as my product and architecture planning partner. Read M1_2_COMPLETE.md alongside this handoff: HOMEFORGE's foundation, domain layer, recovery and minimal homeowner dashboard are implemented. M1.2 is verified locally but uncommitted. Help me plan M2 independent option variants and baseline correction/enforcement, then produce a concrete implementation handoff for Codex. Ask only questions that materially change that plan.

## Project and working arrangement

- Owner: Jesse Lawson; GitHub account: `jessenlawson-cell`.
- Application and Git checkout: `C:\DEVELOPMENT\HOMEFORGE` on Windows.
- Public GitHub fork: https://github.com/jessenlawson-cell/HOMEFORGE
- `origin`: https://github.com/jessenlawson-cell/HOMEFORGE.git
- `upstream`: https://github.com/laanlabs/openPlan3D.git
- Original upstream commit: `d68cadf703578f2cd3a7c77f820e18d342580c32`; preserved tag: `homeforge-upstream-baseline-2026-10-04`.
- GitHub Desktop is configured for this checkout and fork, with **For my own purposes** selected.
- Ready checkpoint: `homeforge-foundation-ready-2026-10-04` on the fork's `main` branch.
- ChatGPT helps reason and plan; Codex inspects and works on the actual repository; project files preserve durable decisions; Git tracks changes; GitHub preserves and shares the code.
- Preserve MIT notices, upstream history, existing editor capabilities and unrelated user changes. Push only to the owner's fork.

## Product intent

HOMEFORGE is a local-first renovation modeller for a homeowner: capture existing conditions, correct geometry, verify measurements, create renovation options, inspect them, and export useful dimensions.

Start with one renovation space. The first practical project is the front entrance and stairs; basement and bathroom follow. A project can exist without a complete house survey.

Success means I can reproduce measured conditions, create an independent proposed option, compare useful views, and export dimensions with their provenance visible. Measurement verification records evidence; it does not establish structural safety or code compliance.

## Existing application versus planned HOMEFORGE work

The inherited editor already provides local project storage, manual floor-plan editing, numeric properties, walls/openings/furniture, undo/redo, 2D and 3D views, elevation tools, imports and exports, photo-related metadata and compatible RoomPlan file import. These inherited capabilities still need a homeowner workflow and practical evaluation.

HOMEFORGE now has workspace/renovation/variant metadata referencing upstream project IDs, a minimal dashboard for Existing Conditions, portable backup/restore and reference-safe deletion. Option A/B creation/switching, editor baseline enforcement and dimension-level verification remain unimplemented. See M1_2_COMPLETE.md for exact behavior and current evidence.

## Architecture decisions to preserve

- Stack: SvelteKit, Svelte 5, TypeScript, Canvas 2D, Three.js, IndexedDB; Node 24 tooling and adapter-node production build.
- Preserve and wrap the upstream `Project → Floor` model. Proposed wrapper: `HomeWorkspace → RenovationProject → DesignVariant → upstream Project`.
- Keep references to spaces in the wrapper; postpone cross-project shared geometry.
- Alternatives must be independent deep copies, including project-owned assets. Ordinary option edits must never change Existing or another option.
- Protect Existing from accidental edits. Intentional baseline correction needs an explicit action.
- Variant switching must complete persistence and reset selection/history appropriately. Define stable IDs, schema versions, migrations and transactional writes before implementation.
- Track provenance per dimension: approximate, scan-derived, manually measured, calculated. Record units, date, source and the value/geometry verified. Calculated values retain dependencies. Geometry changes invalidate stale verification.
- Photo calibration is suitable for plans or appropriate orthographic images; scaling a perspective photograph does not make all geometry dimensionally accurate.
- Preserve the editor core initially. Build the homeowner shell and variants before selectively simplifying complex editor components.

Relevant source areas: `src/lib/models/types.ts`, `src/lib/stores/project.ts`, `src/lib/services/datastore.ts`, `src/lib/services/localDatabase.ts`, `src/lib/services/projectOpening.ts`, `src/lib/services/projectPackage.ts`, `src/routes/+page.svelte`, `src/routes/editor/+page.svelte`, and the editor/sidebar components.

## Foundation validation

Verified after repairs: clean install, catalog verification, type checking with zero errors/warnings, 1,186 unit tests in 126 files, production build, full dependency audit with zero vulnerabilities, and reproducible official browser installation. All 15 focused furniture/curved-opening cases and all 12 deployment cases pass across Chromium, Firefox and WebKit. The corrected broader run passed 393 Chromium and 325 Firefox cases without observed failures before Jesse explicitly stopped repeat full-suite validation. WebKit's full suite was not repeated. All six viewer benchmarks passed in the earlier Windows baseline and were not repeated after that clarification.

The foundation is ready for future development strategy. This is a verified baseline for the requested scope, not proof that every possible workflow is bug-free. Repair details and exact scope are in `HOMEFORGE_DOCS/FOUNDATION_READY.md`; logs are in `HOMEFORGE_DOCS/EVIDENCE/FOUNDATION`. Earlier failures remain preserved in `WINDOWS_BASELINE.md` and `EVIDENCE/WINDOWS` as historical evidence.

Repairs include compatible dependency updates with a targeted grpc override, a reproducible repository-local Playwright browser install, and a validated standard-text fallback for existing catalog drag operations on Windows WebKit. No new homeowner features were added.

## Local use and boundaries

Run in PowerShell:

```powershell
Set-Location C:\DEVELOPMENT\HOMEFORGE
npm run dev -- --host 127.0.0.1
```

Use `http://localhost:5173` consistently. Browser storage is tied to the browser profile and origin. Export backups before browser-data cleanup or origin changes.

The ignored local `.env` disables analytics, handoff uploads and assistant sharing, with no handoff bucket configured. No AI credentials, paid services, native scanner, or hosted deployment were configured. The inherited application still contains optional Firebase capture download and direct AI provider paths. Local configuration and passing regression tests do not certify every workflow as fully offline. Plan a deliberate offline/external-service review before homeowner release; do not activate those services implicitly.

## Scope and sequencing

1. M1: homeowner project dashboard, preserving the editor core.
2. M2: Existing / Option A / Option B with independent state, durable assets, persistence and recovery tests.
3. M3: direct manipulation and concise numeric property editing.
4. M4: import/calibration and dimension-level provenance with invalidation rules.
5. M5: measured front-entry/stair workflow, useful elevation output, export review and recovery tests.

Initial V1/V1.5 includes manual geometry, photo/floor-plan underlays, compatible RoomPlan import, useful 2D/elevation/3D views, notes/photos, local persistence, dimensioned export and portable backups.

Exclude Python, AI features, native capture development, automatic photo reconstruction, structural calculations and a code-compliance engine initially. Estimates, AI commands over structured state, shared spaces and a native capture companion may be considered after practical validation.

## What I want next

Recommend the smallest coherent M1/M2 slice that makes the measured front-entry project useful. Distinguish existing capability, proposed work, open decisions and later ideas. Provide:

1. A plain-language user workflow and information hierarchy.
2. A proposed wrapper schema, asset ownership rules and migration/persistence strategy.
3. Exact independence, baseline-protection, switching, backup and recovery acceptance criteria.
4. A prioritized implementation sequence with clear boundaries and meaningful tests.
5. A concise Codex prompt naming the first implementation slice, the files to inspect, the acceptance criteria and what remains out of scope.

Use `PROJECT_CHARTER.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `HANDOFF.md` and `FOUNDATION_READY.md` as the durable project references. Read the live repository before asserting details beyond this handoff. Planning does not itself authorize publishing, enabling cloud services or implementing every proposed feature.
