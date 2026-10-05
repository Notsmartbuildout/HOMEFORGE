# M3–M6 Homeowner Workflow Implementation Plan

> **For agentic workers:** Implement milestone by milestone from this plan and `M3_M6_DESIGN.md`. Use the existing HOMEFORGE services and a focused test for each nontrivial boundary. Do not repeat M1.1–M2.5.

**Goal:** Make the front-entry/stair zone usable from capture through verified Existing Conditions, independent options, comparison and export.

**Architecture:** A current `RenovationProject` is one Renovation Zone. M3 adds navigation around the inherited editor without a migration. M4 adds zone-owned evidence, identities and measurements with a coordinated storage/backup migration. M5 adds guarded proposals and deterministic numeric legend commands. M6 tests the complete workflow on a real front-entry/stair example.

**Tech stack:** SvelteKit, Svelte 5, TypeScript, IndexedDB, existing Canvas/Three editor and Vitest/Playwright. No new dependency or external service is planned.

**Spec:** `HOMEFORGE_DOCS/M3_M6_DESIGN.md`.

## Global constraints

- Continue `foundation-remediation` from `76e774d`; preserve unrelated work and MIT attribution.
- Keep upstream `Project → Floor`, one protected Existing baseline, independent complete options, successful save before switch, and retained recovery bytes.
- Every geometry edit uses shared store mutations and baseline persistence guards; never write nested projected objects directly.
- Do not call paid/cloud/AI services, activate sharing or deploy. Local/manual use must work offline.
- Original capture files are local zone assets and must survive HOMEFORGE backup/restore; project-only export must state its narrower scope.
- Only report a milestone as complete after its tests, type check, build and relevant browser checks pass; record exact evidence and checkpoint.

## Review focus

1. A missing/unreadable Existing project opens a recovery state, not a misleading editor link (M3 Task 1).
2. Navigation from an unsaved editor cannot silently lose edits (M3 Task 2).
3. Quota or a late IndexedDB failure leaves evidence metadata and bytes consistent (M4 Task 2).
4. An old v1 backup restores without zone records; a v2 backup preserves original asset bytes and unmapped recovery data (M4 Task 3).
5. A stale, protected or ambiguous proposal/command cannot change Existing geometry (M5 Tasks 1–2).

## M3 — homeowner editor UX

### Task 1: Zone overview and navigation

**Files:** Create `src/routes/zone/+page.svelte`; modify `src/lib/components/HomeforgeDashboard.svelte`; test `tests/browser/homeforge.spec.ts`.

**Interface:** `/zone?workspace=<id>&renovation=<id>` resolves the exact validated wrapper and shows the zone name, description, Existing protection state, active option and all option links. It links to the existing `/editor` identity URLs and HOMEFORGE backup. Unknown IDs, missing geometry and unreadable metadata show a recovery message and dashboard/backup path. The dashboard card adds an `Open zone` link. Capture and compare are described as upcoming steps until their real surfaces exist; do not add dead controls.

- [x] Add a browser case that creates a zone, opens its overview, reloads it, follows the Existing link, and checks missing IDs do not open another project.
- [x] Run the focused case and confirm the overview assertion fails before implementation.
- [x] Implement the route with the existing read-only HOMEFORGE dashboard projection, validated wrapper and exact editor URL scheme.
- [x] Run the focused case, `npm run check`, and `npm run build`; include the overview in the M3.1 checkpoint.

### Task 2: Editor return path and clearer task identity

**Files:** Modify `src/routes/editor/+page.svelte` and `src/routes/zone/+page.svelte`; test `tests/browser/homeforge.spec.ts`.

**Interface:** HOMEFORGE editor header shows `Workspace / Zone / Existing or Option` and a `Back to zone` action. Reuse the existing `returnToRenovations` successful-save path, changing only its destination for a valid HOMEFORGE context. A failed save keeps the editor and current changes visible. Standalone editor behavior stays unchanged.

- [x] Add browser checks for return after an edit and for blocked return on a simulated save failure.
- [x] Verify failure, then add the new destination to the existing save-before-return path without a second save implementation.
- [x] Run focused browser checks, `npm run check`, `npm test` and build; include the return path in the M3.1 checkpoint.

### Task 3: Measure the numeric-editing gap before adding controls

**Files:** Inspect `src/lib/components/sidebar/PropertiesPanel.svelte`, `src/lib/stores/project.ts`, existing wall/opening/stair browser tests; modify only proven gaps.

**Interface:** The inherited property panel already edits wall length/thickness/heights, opening dimensions and stair width/depth/riser count, and the canvas already supports dragging. Keep those shared APIs. Check the front-entry task on desktop and mobile; if a common field is hidden or difficult to reach, expose that existing field near the selected feature without duplicating mutation logic. Do not create a second geometry editor.

- [ ] Record the concrete interaction gap with a failing browser case for a wall, door or stair and Existing read-only mode.
- [ ] Make the smallest panel/layout change that resolves that case through the existing mutation function.
- [ ] Verify undo, option independence and protection with focused tests; run type check and build; commit. If no gap is found, record the finding and skip code.

M3.1 inspection found the inherited property panel already exposes wall length/thickness/heights, door/window dimensions and stair width/depth/riser count through guarded mutations, with direct canvas manipulation. No duplicate numeric controls are added without a concrete front-entry pilot gap. This task remains open for that pilot.

## M4 — capture, evidence and verification

### Task 1: Versioned zone record and validation

**Files:** Create `src/lib/models/homeforgeZone.ts`, `src/lib/utils/homeforgeZoneValidation.ts`, `src/lib/services/homeforgeZone.ts`; modify `src/lib/services/localDatabase.ts`; test `tests/homeforgeZone.test.ts`.

**Interface:** Add IndexedDB v3 `homeforgeZones` and `homeforgeEvidenceAssets`. A version-1 zone record is keyed by workspace and renovation IDs and contains session/evidence/feature/measurement metadata but no file bytes. Validation rejects unknown versions, duplicate IDs, broken local references and nonfinite dimensions. Store methods use expected raw revisions and one transaction per change. Existing v2 databases upgrade additively.

- [ ] Write tests for additive migration, invalid records, conflict and rollback.
- [ ] Verify failures; implement the two stores and minimal reader/writer; run focused tests and type check; commit.

### Task 2: Guided capture and original assets

**Files:** Create `src/lib/components/HomeforgeCapture.svelte`; extend `src/lib/services/homeforgeZone.ts`; reuse `src/lib/services/itemPhotos.ts` image-header helpers; test `tests/homeforgeZone.test.ts` and `tests/browser/homeforge.spec.ts`.

**Interface:** Sessions and evidence accept overview, wall, opening/stair, focus detail, measurement, plan/sketch and compatible RoomPlan files. Original bytes are stored in `homeforgeEvidenceAssets` with a digest and bounded metadata; a smaller preview is derived separately. Validate MIME/content/size and storage availability before admission. Evidence metadata and bytes commit or roll back together. The zone overview opens this capture surface and shows saved/retry states.

- [ ] Test original-byte round-trip, unsupported input, quota/abort rollback, reload and context/focus links.
- [ ] Verify failure; implement file preparation outside the transaction and atomic admission inside it.
- [ ] Run focused tests, type check, build and a desktop/mobile browser case; commit.

This task and Task 3 are one release gate: do not present capture as durably backed up until v2 backup/restore passes. Original evidence remains in the same local browser storage while that gate is pending.

### Task 3: HOMEFORGE backup v2 and recovery

**Files:** Modify `src/lib/services/localDatabase.ts`, `src/lib/services/libraryRestore.ts`, `src/lib/services/datastore.ts`; test `tests/homeforgeRecovery.test.ts`.

**Interface:** HOMEFORGE backup v2 exports zone metadata and original evidence bytes; restore accepts v1 and v2. It remaps workspace/renovation/variant references and asset keys atomically, while preserving damaged or unmatched raw data in recovery. Inherited project-only backup/export explicitly omits zone evidence. No live record is overwritten by restore.

- [ ] Add v1 compatibility, v2 exact-byte, ID remap, corrupt-asset and late-failure rollback tests.
- [ ] Verify failures; implement versioned export/restore with the existing transaction/recovery pattern.
- [ ] Run focused tests, type check and build; commit before shipping the capture UI as durable.

### Task 4: Measurements, coverage and legend identities

**Files:** Extend `src/lib/models/homeforgeZone.ts`, `src/lib/services/homeforgeZone.ts`; create `src/lib/utils/homeforgeCoverage.ts`; modify `src/lib/services/homeforge.ts` option clone only where a confirmed binding must be copied atomically; test `tests/homeforgeZone.test.ts`, `tests/homeforgeVariants.test.ts` and targeted browser cases.

**Interface:** Zone records contain canonical-cm measurements with entered units, source/date, feature/property and calculation dependencies; status is derived from the relevant geometry fingerprint. Coverage produces needed/recommended/optional prompts and a user-declared sufficient state without blocking. Stable feature IDs have persisted unique labels, explicit replacement/split/merge links and per-variant bindings. New option clones copy confirmed bindings in the same transaction; old options require reviewed matching when uncertain. Legend overlay reads this registry.

- [ ] Test stale verification, dependency recalculation, label persistence, clone/restore mapping, unresolved old options and protected correction.
- [ ] Verify failure; add pure coverage/status calculations first, then transactional identity updates and the smallest legend UI.
- [ ] Run focused tests, type check, build and relevant browser cases; commit in separately reviewable coverage and identity checkpoints if needed.

### Task 5: Import as evidence and review

**Files:** Reuse `src/lib/utils/roomplanImport.ts`, `src/lib/utils/roomplanValidation.ts` and existing underlay controls; extend capture UI/service; test RoomPlan and browser import paths.

**Interface:** Plans/sketches and RoomPlan files enter the same zone evidence list. Validated RoomPlan conversion produces a draft for review, never an automatic baseline replacement. Perspective photos are labeled visual context; only calibrated appropriate plan images support metric tracing. Import failures retain original evidence and Existing geometry.

- [ ] Test valid/invalid imports and failure isolation; implement the evidence-to-draft handoff; run focused gates; commit.

## M5 — assisted Existing Conditions

### Task 1: Proposal review and guarded acceptance

**Files:** Create `src/lib/models/homeforgeProposal.ts`, `src/lib/services/homeforgeProposal.ts`, `src/lib/components/HomeforgeProposalReview.svelte`; reuse project mutations/protection; test `tests/homeforgeProposal.test.ts` and browser cases.

**Interface:** A proposal lists source evidence, exact feature/property changes and before/after values. Local generators may use calibrated plans, RoomPlan and manual dimensions. Proposal creation does not write Existing. Acceptance requires current revisions and explicit correction mode, uses existing mutations/save and one undo group; reject/cancel makes no change. Photo-only proposals cannot assert metric dimensions.

- [ ] Test cancel, stale target, quota, protected baseline, accepted undo and source traceability; implement and verify; commit.

### Task 2: Deterministic legend commands

**Files:** Create `src/lib/utils/homeforgeCommands.ts`; add command input to the proposal/review UI; test `tests/homeforgeCommands.test.ts` and a browser case.

**Interface:** Parse only exact numeric assignment grammar with a unique legend label and supported property/unit. Resolve to feature ID and variant binding, then call the same guarded numeric mutation. Ambiguous/unsupported text leaves geometry unchanged and returns a specific clarification. Multi-element commands require a computed preview and acceptance; add only commands for which that preview is deterministic. No provider call or code execution.

- [ ] Test unique/ambiguous labels, units, unsupported structural text, protection and undo; implement minimal grammar; verify; commit.

## M6 — front-entry/stair pilot and export

### Task 1: Comparison and dimensioned export

**Files:** Add a zone comparison surface using existing 2D/elevation/3D views and current export paths; update export to include measurement value, unit, source, date and current/stale status; test focused unit/browser cases.

- [ ] Test same-feature Existing/Option comparison, removed/replaced/unbound cases, provenance display, stale status and backup/export scope wording.
- [ ] Implement the smallest useful comparison and export; verify type check, unit tests, build and relevant browser cases; commit.

### Task 2: Real pilot and release audit

**Files:** Add a non-sensitive front-entry/stair fixture or manual pilot checklist in `HOMEFORGE_DOCS`; update `ROADMAP.md`, `ARCHITECTURE.md`, `HANDOFF.md` and milestone audit only with verified outcomes.

- [ ] Capture context and focus, verify stair/opening dimensions, create two options, compare 2D/elevation/3D, export, restore and check protected corrections in the pilot.
- [ ] Run the relevant regression gates and deliberate offline/external-service review. Record exact passes, failures and limitations; commit/push reviewed checkpoints to the owner's fork only.

## Execution order

Implement M3 first. M4 storage/backup is one coupled boundary, so keep a single implementer for it; independent review is useful after the schema and restore contract settle. M5 depends on M4 identities and verification. M6 is the first evidence-based decision point for what to simplify or add next. Subagents would be effective for independent review or isolated UI checks after interfaces are stable, but parallel edits to the zone schema, backup and option clone would create avoidable conflicts and extra token use.
