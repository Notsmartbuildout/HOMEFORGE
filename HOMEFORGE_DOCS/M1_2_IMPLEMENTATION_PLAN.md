# M1.2 Implementation Plan

> For agentic workers: use superpowers:executing-plans for inline execution. Track verified steps below.

Goal: recover HOMEFORGE relationships safely and expose a minimal local homeowner dashboard.
Architecture: extend the inherited restore transaction with workspace candidates and ID mappings; keep legacy formats/API compatible. Add a shared deletion guard and a focused dashboard component; open saved projects through the existing editor route with explicit missing-reference handling.
Tech stack: existing Svelte 5, TypeScript, IndexedDB, Vitest/fake-indexeddb, Playwright. No new dependencies.
Spec: M1_2_PROPOSAL.md, accepted by Jesse's “Lets do M1.2” on 2026-10-04.

## Constraints and rulings

- Preserve upstream Project → Floor, MIT notices, standalone projects and import/template workflows.
- No options, baseline mutation enforcement, AI/cloud/deployment, push or publication in this task.
- Ruling: implement both M1.2a and M1.2b in dependency order; the request names the full milestone.
- Ruling: work in the canonical checkout C:\DEVELOPMENT\HOMEFORGE; preserve its required application location and avoid a second checkout.
- Ruling: extend the existing restore preview rather than creating a parallel restore engine; this preserves proven history/recovery handling and one atomic commit boundary.
- Ruling: keep changes uncommitted until requested, as in M1.1; no milestone-boundary permission prompts during authorized implementation.

## Review focus

- Damaged metadata must remain exportable and block destructive project deletion.
- Shared project references must share one remapped project after restore.
- Empty workspaces and metadata-only recovery archives must restore without geometry.
- Missing editor links must not create substitute projects; save errors must remain visible.
- A committed mutation followed by refresh failure must not offer a duplicate mutation.

## Task 1 — Backup and reference safety

Files: src/lib/services/localDatabase.ts, datastore.ts, new homeforgeReferences.ts; tests/homeforgeRecovery.test.ts.
Interfaces: homeforgeBackup(): Promise<string>; assertProjectUnreferenced(tx, projectId): Promise<void>.
- [x] Write/run failing tests for raw consistent backup, protected deletion and unreadable metadata.
- [x] Add homeforge-library version 1 envelope with workspaces/projects/thumbnails/history/legacy/recovery from one read transaction; preserve damaged bytes without migration.
- [x] Check all wrappers inside the same transaction as project deletion; retain raw-revision conflicts.
- [x] Run focused persistence tests.

## Task 2 — Atomic coordinated restore

Files: src/lib/services/libraryRestore.ts; tests/homeforgeRecovery.test.ts.
Interfaces: prepareLibraryRestore accepts homeforge-library v1 as well as existing formats; preview.workspaceCount and result.workspaces for HOMEFORGE.
- [x] Write/run failing round-trip, remapping, shared references, empty workspace, corrupt archive, collision, cancellation and rollback tests.
- [x] Validate immutable candidates; archive unreadable or dangling wrappers; remap all wrapper identities and project references inside the inherited restore transaction.
- [x] Preserve legacy backup behavior and history/assets; retain idempotence and failure retry.
- [x] Run focused tests, npm run check and npm test before dashboard integration.

## Task 3 — Homeowner dashboard and exact opening

Files: new src/lib/components/HomeforgeDashboard.svelte, src/routes/+page.svelte, editor/+page.svelte, LibraryRestoreDialog.svelte; tests/browser/homeforge.spec.ts and relevant service tests.
Interfaces: dashboard onchanged callback refreshes inherited library; HOMEFORGE export uses homeforgeBackup; editor links carry a HOMEFORGE marker and project ID.
- [x] Write targeted browser cases for workspace/renovation creation, adoption, exact reopening, backup/restore, missing links, metadata removal, keyboard flow and standalone access.
- [x] Add workspace selector/forms and renovation cards using M1.1 services; preserve library UI and expose recovery actions.
- [x] Open the exact saved ID; reject missing HOMEFORGE targets. Show unavailable entries and accurate editable-baseline copy.
- [x] Integrate workspace count into existing restore dialog and refresh HOMEFORGE state after restore.
- [x] Run type checking, full unit suite and targeted browser tests against a current production build.

## Task 4 — Review and handoff

- [x] Review full changes against the accepted scope and resolve concrete defects with regression tests.
- [x] Record schema/API additions, results, limitations and M2 implications; update HANDOFF/ROADMAP.
- [x] Verify clean diff formatting; report local changes and exact test results.

## Verified completion — 2026-10-04

Review found a post-commit refresh failure could permit further writes against stale UI; fixed by blocking mutations until refresh succeeds, with a browser regression. Added collision and metadata-only recovery checks. Unchanged workspace selection now retains renovation drafts, also covered by a regression.

Final gates: 98 focused tests; 1,227 unit tests in 129 files; 36 targeted browser cases across Chromium/Firefox/WebKit; production build passed; type checking has zero errors/warnings. See M1_2_COMPLETE.md and EVIDENCE/M1_2_* logs. Changes remain local and uncommitted.
