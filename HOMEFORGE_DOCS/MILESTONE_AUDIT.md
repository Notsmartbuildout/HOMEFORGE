# Milestone audit — updated 2026-10-08

Repository/application: C:\DEVELOPMENT\HOMEFORGE. Owner fork: jessenlawson-cell/HOMEFORGE. Development branch: foundation-remediation. MIT notices and original upstream history remain intact; no deployment or cloud services added.

| Milestone | Checkpoint | Verified invariant and durable evidence |
|---|---|---|
| M1.1 Domain | a402da1 | Versioned wrappers reference Project IDs; strict validation; additive database v2; atomic single Existing creation. M1_1_DOMAIN_FOUNDATION.md, homeforge.test.ts |
| M1.2 Dashboard | 39ca141 | Workspace/renovation creation and exact opening; consistent backup/remapped restore; recovery states; reference-safe deletion. M1_2_COMPLETE.md, homeforgeRecovery.test.ts, homeforgeDashboard.test.ts |
| M1.3 Editor identity | 8ca4d62 | Identity/navigation preserve inherited editor; failed save retains latest edits. M1_3_EDITOR_CONTEXT.md, browser/homeforge.spec.ts |
| M2.1 Existing | b15ae2c | Exactly one Existing variant and matching stable pointer. M2_1_EXISTING_CONDITIONS.md, homeforge.test.ts |
| M2.2 Complete option clone | caf2ef4 | Independent project/assets/thumbnail/remapped valid history; provenance; bounded IDs; conflicts/rollback. M2_2_CLONE_TO_OPTION.md, homeforgeVariants.test.ts |
| M2.3 Switcher | a6ef62a | Successful latest save, exact valid target activation, context/undo reset, reload and dashboard continuation. M2_3_VARIANT_SWITCHER.md, homeforgeVariants.test.ts, browser/homeforge.spec.ts |
| M2.4 Protection | bbd0152 | Shared mutation/persistence/history protection; visible explicit session correction; standalone protection; adopted recovery preserved. M2_4_BASELINE_PROTECTION.md, homeforgeProtection.test.ts |
| M2.5 Resilience | This checkpoint | Safe removal, provenance/baseline guards, pointer fallback, retained bytes/assets, atomic unreadable archival/export, failure/retry. M2_5_RESILIENCE.md, homeforgeRemoval.test.ts, browser/homeforge.spec.ts |

Final current gates: 1,260 unit tests in 132 files, 47 focused cases in five files, 60 targeted browser cases across Chromium/Firefox/WebKit, type checking with zero errors/warnings and production build pass. Evidence logs/screenshots: EVIDENCE/M2_5_*. M2.4's preceding checkpoint independently passed 1,245 unit tests and 48 browser cases. Earlier milestone results remain in their own documents and evidence; the historic broad upstream browser suite was not repeated.

Parallel work was limited to separate service/test ownership and independent read-only reviews. Findings in older-tab migration, expired correction grants and pending in-memory reopening were corrected and regression-tested. Final service/UI review found no concrete outstanding defect. No gate was relaxed.

Git publication check: all listed commits are ancestors of the pushed development branch; origin is the owner's fork, upstream remains laanlabs/openPlan3D. Before reporting completion Codex compares the final local HEAD with `git ls-remote origin refs/heads/foundation-remediation` and verifies a clean checkout. This document's own commit is the M2.5 checkpoint; identify it with `git log --diff-filter=A -- HOMEFORGE_DOCS/M2_5_RESILIENCE.md`.

The table and gate above are the historical M1–M2.5 audit. M3–M6 proceeded under M3_M6_DESIGN.md and M3_M6_IMPLEMENTATION_PLAN.md; their current evidence follows.

Browser evidence is split intentionally: EVIDENCE/M2_5_BROWSER.log proves 57 cases, and EVIDENCE/M2_5_PENDING_BROWSER.log proves three additional cross-tab adoption/export cases. Existing assertions remain intact; the added test uses canonical door orientation so legacy default revival does not change its fixture shape.

## M3–M6 software gate

| Milestone | Evidence | Status |
|---|---|---|
| M3.1 | `67cf2b9`; 1,260 unit tests, type check, build, 18 browser cases across three engines | Complete |
| M3 numeric gap | October 8 sample and 390 px stair control case across three engines: inherited width control reachable; protected Existing and independent option edit verified | Closed without duplicate controls |
| M4 | `4f41a33` and `abb9595`; 1,282 unit tests, type check, build, nine browser cases across three engines; byte-exact original evidence backup/restore | Complete |
| M5 | `9668139` plus local `e33ce6d` transition fix; 1,287 unit tests, type check, build, six proposal/RoomPlan cases across three engines | Complete |
| M6 | Saved feature/dimension comparison, CSV provenance, sample front-entry/stair workflow, 390 px control, normal-use external-request audit; 1,288 unit tests in 137 files, zero type-check diagnostics, production build and nine focused browser cases across Chromium/Firefox/WebKit | Software gate passed; publication pending |

The M6 sample uses fictional dimensions and images from test fixtures. It proves the software path for beginning a real project; it does not claim that Jesse's home has been measured. The sample makes no external HTTP requests. Analytics is opt-in, and inherited optional Firebase capture-code import, AI rendering and assistant-sharing actions remain outside this local workflow. CSV omits original evidence and full plans; HOMEFORGE backup includes them. See FRONT_ENTRY_STAIR_PILOT.md.

Current `origin` is `Notsmartbuildout/HOMEFORGE`, not the historical `jessenlawson-cell/HOMEFORGE` named by this audit. The old `foundation-remediation` remote branch is gone, and `9668139` is already in `origin/main`. Do not infer publication of later local commits from the historic push check; verify the target owner and branch before pushing.
