# M2.4 — Baseline protection and intentional corrections

Existing Conditions now opens protected, including inherited standalone links to a project referenced by HOMEFORGE. Any Existing reference protects a shared project ID. The legacy baselineProtected flag cannot authorize edits; correction permission is explicit and belongs only to the mounted editor session. Wrapper schema 1 and database version 2 are unchanged.

## Shared boundaries

- Shared project mutations, writable callbacks, alignment, undo and prepared photo/details commits check protection before changing nested data. The protected project projection is detached, frozen and stable across subscribers. Old editable aliases detach when correction mode changes.
- Floor selection remains available as a view operation without dirtying or saving the baseline. Viewing, selection, 2D/3D, export and independent option cloning remain available. Cloning a protected baseline uses the saved source, so a view-only floor choice cannot create a source revision conflict.
- Project save and history save/delete read HOMEFORGE references inside their write transaction. Correction grants are captured and checked again after awaited metadata reads; ending or replacing the session invalidates queued writes. Unreadable metadata blocks potentially destructive overwrites while retaining data for export/recovery.
- Older-tab migration cannot reuse any recovery project referenced by HOMEFORGE. It creates another independent recovery copy instead. Restore includes metadata in that same migration transaction. Existing migration/recovery behavior remains intact for unreferenced copies.

## Editor flow

A visible protection strip offers Begin correction, an explicit explanation, and Start correction. Finish corrections requires successful saving of the latest edits before returning to protection and resetting editing context. Failed saves leave correction mode and current edits intact. Reload, variant changes, imports and leaving the editor end correction permission. Reopening pending unsaved data discovers protection without discarding it or falsely reporting it as saved; recovery copies and export remain available.

The URL synchronizer ignores controlled variant transitions, preventing intermediate protection-store emissions from discarding wrapper context. Selecting the already active variant is a no-op.

## Verification

Six new focused protection cases cover shared/direct mutation paths, aliases, details/import/alignment, view-only autosave, explicit correction, independent option edits, standalone writes, expired permission, corrupt metadata, history restore/delete and adopted older-tab recovery. Existing conflict tests now explicitly authorize intentional baseline correction.

Passed: 1,245 unit tests in 131 files; npm run check with zero errors/warnings; production build; 48 focused browser cases across Chromium, Firefox and WebKit, including correction failure/retry, reload, standalone protection and mobile drawer layout. Evidence: EVIDENCE/M2_4_*. No dependencies, schema upgrades, cloud services or deployment added.

Remaining authorized work: M2.5 option metadata removal and practical unreadable-metadata recovery, final resilience verification and milestone audit.
