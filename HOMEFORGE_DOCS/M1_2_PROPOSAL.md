# M1.2 proposal — Recovery and homeowner dashboard

Status: draft for scope review, 2026-10-04. This document proposes the next work; it does not describe implemented features. M1.1 is committed as `a402da1` on `foundation-remediation`. Jesse authorized pushing the completed work and this separate draft to the HOMEFORGE fork.

## Intended outcome

A homeowner can organize renovation projects, reopen their Existing Conditions geometry, and recover the relationship between HOMEFORGE metadata and upstream editor projects after exporting/restoring local data. Preserve the inherited editor and existing project library. Keep all work local; do not push, publish, add cloud services or create options.

## Recommended sequence

### M1.2a — Recovery and reference safety

Implement and verify these service boundaries before dashboard integration:

1. A versioned HOMEFORGE local backup containing wrapper metadata and the upstream project records, project-owned assets, previews, history and existing recovery information needed to recover it. Capture metadata and project records in one consistent IndexedDB read transaction. Preserve raw corrupt records for recovery; exporting must not require repairing them.
2. Restore preview with validation before writes. Restore usable data as independent copies with new IDs; remap workspace, renovation, variant, source-variant, pointer and upstream project references consistently. Shared references within a backup must point to the same restored project. Never overwrite current records. Preserve unreadable material as opaque recovery data using the existing recovery approach; do not activate ambiguous wrappers or dangling relationships.
3. Restore all participating records atomically. A quota error, cancellation or late abort must leave current data intact. Repeated submission of the same completed preview must not duplicate the restore.
4. Guard upstream project deletion at the shared datastore boundary: reject deletion while valid HOMEFORGE wrappers reference it. If wrapper records are unreadable, block destructive deletion and offer backup/recovery. Perform the reference check and delete in the same transaction so a concurrent new reference cannot be orphaned.
5. Removing HOMEFORGE metadata leaves geometry intact, following M1.1. A separate permanent geometry-deletion action is outside this step.

Keep the existing OpenPlan3D backup/restore API and format readable. Determine the HOMEFORGE envelope shape after inspecting existing recovery serialization; avoid encoding complete upstream Project objects inside workspace metadata.

Acceptance tests: consistent snapshot; save/export/restore round trip; asset/history preservation; restored ID remapping; shared references; preexisting records unchanged; corrupt data preserved without ambiguous activation; cancellation/quota rollback; repeated restore; deletion/reference races; legacy backups remain readable.

### M1.2b — Minimal homeowner dashboard

After M1.2a passes:

- Workspace selection and creation, renovation-project list and a new-renovation form using the M1.1 primitive.
- Each renovation shows its Existing Conditions entry and opens the referenced saved project in the existing editor.
- Deliberate adoption of an existing upstream project through `projectId`; no automatic wrapping or geometry conversion.
- Keep inherited standalone projects, imports/templates and recovery actions accessible.
- Expose HOMEFORGE backup/restore and metadata removal with clear descriptions of what is retained.
- Show missing or unreadable relationships as recovery states. Do not substitute an empty plan or claim the original geometry was opened successfully.
- Preserve accessible keyboard interactions, loading/errors and existing save/conflict handling.

Use the existing visual language and components. Do not introduce a dashboard restyle, editor-header redesign, option creation/switching or editor baseline enforcement. Do not display a lock indicator suggesting that `baselineProtected` already prevents editing.

Acceptance tests: workspace/project creation and reload; opening the exact referenced project without duplication; existing standalone project access; unavailable-project recovery; metadata removal preserves geometry; backup/restore user flow; focused keyboard interactions.

## Findings that affect implementation

- `src/routes/+page.svelte` currently lists and deletes upstream projects directly via `localStore`. A guard solely inside new dashboard UI would leave an inherited deletion path capable of orphaning metadata.
- `openProject` handles new/imported candidates and reallocates colliding project IDs. Opening an existing renovation must use the saved-project path rather than passing it through that creation/import primitive.
- `src/routes/editor/+page.svelte` currently loads saved IDs and can create a default project when an ID is missing. HOMEFORGE opening must make missing references explicit rather than presenting a replacement as Existing Conditions.
- Current library restore validates data, restores copies and retains unreadable recovery bytes. Reuse those principles while coordinating wrapper ID remapping and one commit boundary.
- Baseline correction/locking remains an M2 decision; M1.2 must accurately communicate the existing editable behavior.

## Alternatives considered

- Recovery first, then dashboard (recommended): two reviewable changes, with portable recovery ready before new UI creates wrapper relationships.
- Dashboard first: earlier visible progress, but its export/deletion behavior would need temporary restrictions until recovery services are available.
- One combined implementation: delivers both together, with a larger change to review and diagnose.

## Verification and boundaries

For each implementation step, use focused tests for the affected persistence or UI boundaries, then `npm run check` and `npm test`. Add targeted browser checks when UI integration begins; do not repeat the broad historical browser baseline without a concrete reason. Preserve MIT notices, history, M1.1 changes and unrelated work.

No implementation of this proposal has started. Review the scope and recovery behavior before writing the detailed execution plan. Recommended next scope: **M1.2a only**, followed by dashboard integration as M1.2b.
