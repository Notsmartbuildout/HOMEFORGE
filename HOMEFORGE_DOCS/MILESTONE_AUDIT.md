# Completed milestone audit — 2026-10-04

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

The next task is homeowner UI planning using CHATGPT_PLANNING_HANDOFF.md. M3/M4 and later ideas are not implemented by this objective. Shared adoption ownership, mutation guard use, retained-geometry removal and deliberate offline review are the planning constraints recorded in M2_5_RESILIENCE.md.

Browser evidence is split intentionally: EVIDENCE/M2_5_BROWSER.log proves 57 cases, and EVIDENCE/M2_5_PENDING_BROWSER.log proves three additional cross-tab adoption/export cases. Existing assertions remain intact; the added test uses canonical door orientation so legacy default revival does not change its fixture shape.
