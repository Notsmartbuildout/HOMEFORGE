# M2.3 — Safe variant switching

The HOMEFORGE editor context now offers named option creation and a variant selector. Cloning uses M2.2's complete copy primitive; Existing and options keep separate project records. Dashboard cards retain explicit Existing Conditions access and can continue the active option.

`activateVariant(workspaceId, renovationId, variantId, expectedProject?)` validates metadata revision and the exact target project before atomically persisting the active pointer. Missing/corrupt targets, changed target contents and failed metadata writes retain the previous pointer. Geometry is never written by activation. Schema 1 and database version 2 remain unchanged.

`resolveHomeforgeEditorContext(workspaceId, renovationId, variantId?)` exposes the validated chosen variant and available variants. Links without `variant` remain Existing links for compatibility; explicit option links carry a variant ID and the matching upstream project ID. Editor opening updates the active pointer, so opening Existing from the dashboard becomes the current context too.

Transitions require saved latest edits, check pending recovery-copy work and prevent controls from editing while a transition is pending. A failed save leaves the current plan/URL/pointer intact and retryable. Target loading establishes the inherited raw project revision before activation; expected contents are checked inside the activation transaction. The URL/context are updated before `loadProject`, avoiding the inherited import URL synchronizer discarding valid wrapper context. Imports/recovery copies continue to clear wrapper parameters when they create a different project.

The inherited load/reset clears undo/redo, selection, placement/calibration/elevation context and selects the default tool. Local editor panels close and snapshot projection refreshes. Mounted-editor checks prevent activation from starting after asynchronous preparation completes in a departed editor; already committed copies remain available. Late editor changes are retained instead of overwritten by target loading. Mobile context/drawer breakpoints now match, including 700px widths.

Verification includes activation rollback/conflict/corruption, exact option resolution, named option creation, save-before-switch, tool reset, editor/dashboard reload, active pointer on explicit Existing opening, save failure/retry and desktop/intermediate/mobile layout. Final gates: **26 focused tests**, **1,239 unit tests in 130 files**, type checking with **zero errors/warnings**, production build and **45 targeted browser cases across Chromium/Firefox/WebKit** pass. Evidence: `EVIDENCE/M2_3_*`.

Previous published checkpoint: M2.2 `caf2ef4`. Remaining authorized milestones: M2.4 baseline protection/explicit correction, then M2.5 option removal and resilience audit. Existing remains editable at this checkpoint; no lock claim is made yet.
