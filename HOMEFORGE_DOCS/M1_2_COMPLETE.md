# M1.2 — Recovery and homeowner dashboard

Completed locally on 2026-10-04 in `C:\DEVELOPMENT\HOMEFORGE`, branch `foundation-remediation`. These changes are uncommitted and have not been pushed. M1.1 and the original M1.2 proposal remain the published checkpoints.

## Implemented

- Create/select home workspaces; create renovations with exactly one Existing Conditions variant, using a new empty plan or deliberately adopting a saved editor project.
- Reopen the exact referenced saved project. Missing/unreadable references show recovery errors and cannot create substitute geometry.
- Download/restore HOMEFORGE backups; remove an entire workspace's metadata while retaining its editor projects, photos and history.
- Protect referenced editor projects from deletion at the shared datastore boundary. Corrupt or ambiguous metadata blocks destructive deletion.
- Preserve the standalone editor library, imports, templates, inherited recovery and MIT notices.

## Schema and APIs

IndexedDB remains version **2**; workspace schema remains **1**. No new migration or dependency is needed.

`localDatabase.homeforgeBackup(): Promise<string>` captures all participating stores in one readonly transaction, preserving raw damaged records without migration. `datastore.downloadHomeforgeBackup()` downloads it. Envelope:

```ts
{
  format: 'homeforge-library',
  version: 1,
  projects: Record<string, string>,
  thumbnails: Record<string, string>,
  history: Record<string, string>,
  workspaces: Record<string, string>,
  legacy: {
    original?: Record<string, string>,
    previous?: Record<string, string>,
    current: Record<string, string>
  },
  recovery: Record<string, string>
}
```

`prepareLibraryRestore` accepts this envelope alongside inherited formats. HOMEFORGE previews expose `workspaceCount`; results expose `workspaces`. One transaction restores independent copies with new project/workspace/renovation/variant IDs, remaps all pointers, preserves shared references and retains history/assets. Existing records are never overwritten. Cancellation, quota errors and late aborts roll back all writes; resubmitting a completed preview is idempotent. Invalid or dangling wrappers remain raw recovery data rather than active metadata. Empty workspaces and metadata-only recovery archives are supported.

The inherited `openplan3d-library` export stays compatible and omits HOMEFORGE wrappers. Use **Download HOMEFORGE backup** to preserve renovation relationships.

`assertProjectUnreferenced(tx, projectId)` checks wrapper references within the project deletion transaction. Strict duplicate-key JSON parsing prevents concealed references. Metadata deletion itself never deletes geometry.

`readHomeforgeDashboard()` returns healthy workspaces, per-record errors and referenced-project status (`ready`, `missing`, `unreadable`). `resolveExistingProjectId(workspaceId, renovationId)` validates the exact saved target. HOMEFORGE editor links carry `homeforge`, `workspace` and `renovation` parameters; standalone editor links retain their inherited behavior.

The dashboard uses the M1.1 creation/store primitives. A successful write followed by failed refresh blocks further mutations until refresh succeeds, avoiding duplicate submissions against stale state.

## Files

New production files: `HomeforgeDashboard.svelte`, `homeforgeDashboard.ts`, `homeforgeReferences.ts`, and `utils/parseBackup.ts` (the existing strict parser extracted for reuse).

Modified production files: `localDatabase.ts`, `datastore.ts`, `libraryRestore.ts`, `homeforge.ts`, `LibraryRestoreDialog.svelte`, `WelcomeScreen.svelte`, `routes/+page.svelte`, and `routes/editor/+page.svelte`.

Tests: `tests/homeforgeRecovery.test.ts`, `tests/homeforgeDashboard.test.ts`, `tests/browser/homeforge.spec.ts`. Durable docs: this handoff, implementation plan, proposal status, architecture, roadmap, current handoff and ChatGPT planning handoff. Evidence is in `EVIDENCE/M1_2_*`.

## Verification

- 16 new unit cases: consistent raw backup, protected deletion, ambiguous JSON, atomic shared-reference remapping, assets/history, empty workspaces, corrupt archives, cancellation/quota rollback/retry, bounded ID collisions, concurrent reference/deletion and exact opening/health projection.
- Focused persistence/domain suite: **98 passed in 6 files**.
- `npm test`: **1,227 passed in 129 files**.
- `npm run check`: **0 errors, 0 warnings**.
- `npm run build`: passed; inherited chunk-size/empty-chunk/unused-import warnings remain.
- Targeted production browser run: **36 passed** across Chromium, Firefox and WebKit. Includes desktop/mobile creation/reopening and backup/restore, adoption/removal, first visit, missing references, unchanged-selection draft retention, failed-refresh recovery, inherited restore and storage observation.
- Manual in-app desktop inspection: no console errors/warnings; dashboard and inherited library remain accessible. Screenshot: `EVIDENCE/M1_2_DESKTOP.png`.

The broad historical browser suite was not repeated. Evidence logs preserve actual command output. Type checking/build used process-local `NODE_ENV=production` for the inherited Vite configuration; no persistent environment changes were made.

## M2 planning handoff

Plan independent option creation, switching and intentional baseline correction next. Existing Conditions remains editable: `baselineProtected` is metadata, not editor mutation enforcement. Do not imply locking already works. Option copies must include project-owned assets and coordinate save/history/selection when switching.

New HOMEFORGE UI strings are English; inherited translations remain. Metadata removal currently removes an entire workspace's relationships; individual renovation removal is not implemented. Invalid records are preserved for recovery without automatic repair. Cloud, AI, hosted deployment, full offline certification, measurement provenance and structural/code-compliance logic remain outside this milestone.
