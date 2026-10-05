# M2.5 — Removal, recovery and resilience

The authorized M1.1–M2.5 sequence is implemented and verified in C:\DEVELOPMENT\HOMEFORGE. This milestone adds safe option removal and practical damaged-metadata recovery to the dashboard, with independent service and code reviews. Wrapper schema 1 and IndexedDB version 2 remain unchanged.

## Files changed

- src/lib/services/homeforge.ts: removal and unreadable archival methods.
- src/lib/services/homeforgeDashboard.ts: exact raw revision on unreadable projections.
- src/lib/components/HomeforgeDashboard.svelte: option opening/removal and archive confirmations.
- tests/homeforgeRemoval.test.ts and tests/browser/homeforge.spec.ts: removal/recovery/cross-tab regressions.
- HOMEFORGE_DOCS milestone, audit, architecture, roadmap and handoff files; EVIDENCE/M2_5_* logs/screenshots.

## API and behavior

`createHomeforgeStore().removeVariant(workspaceId, renovationId, variantId): Promise<void>` checks the client's raw revision and validates the wrapper in one metadata write transaction. Existing Conditions cannot be removed; a source option with descendants cannot be removed until its descendants. Removing an active option returns its pointer to Existing. Updated timestamps are monotonic. Missing or unreadable geometry does not block relationship removal. The method bypasses legacy migration and touches no project, thumbnail or history records.

`createHomeforgeStore().archiveUnreadableWorkspace(id, expectedRaw): Promise<void>` requires the exact saved raw revision and rejects readable wrappers, including wrappers whose geometry is unavailable. It atomically stores an opaque openplan3d-recovery envelope under a fresh bounded `meta` key `library-recovery:<id>` and removes the unreadable live entry. Damaged bytes are retained under `metadata.homeforgeWorkspaces`; HOMEFORGE backup exports them and restore retains them as recovery archives. It bypasses migration, never silently repairs data, and retains all upstream records. Quota, abort, collision and stale-target failures leave both stores unchanged and retryable.

The dashboard lists all design options, provides exact opening links and explicit removal confirmation, and offers archive confirmation beside unreadable metadata. Healthy cards remain visible. Saved editor geometry remains in the inherited library after relationship removal; permanent deletion uses its existing explicit confirmation and atomic HOMEFORGE reference check. Archiving an unreadable live wrapper permits healthy editing to resume while retaining the damaged relationships for manual recovery.

## Verified resilience

Fifteen new unit cases cover baseline/source protection, active-pointer fallback, missing/corrupt geometry, exact retained upstream bytes including assets/history, metadata conflicts, write rollback/retry, legacy isolation, archive eligibility, raw-byte conflicts, recovery backup/restore and ID collision limits. Existing domain, duplication and recovery tests prove additive database upgrade, stable identities, complete independent assets, remapped history, corruption rejection, backup consistency and reference-safe delete races.

New browser cases exercise descendant removal, quota/retry, reload and retained project records at desktop/mobile widths, plus archive cancellation, atomic failure/retry, exact exported recovery bytes and subsequent healthy protected-baseline access. Earlier HOMEFORGE switching, creation, correction, backup/restore and recovery browser cases remain included.

Final gates: **47 focused tests in five files**, **1,260 unit tests in 132 files**, **npm run check: zero errors/warnings**, **production build passed**, **60 HOMEFORGE browser cases across Chromium, Firefox and WebKit passed**. Logs and inspected screenshots: EVIDENCE/M2_5_*. No assertions weakened, failures skipped, dependencies added or services activated. The historic broad upstream browser baseline was not repeated.

## Planning consequences

- Deliberately adopting an existing project can share a baseline across renovations. Corrections affect every reference to that upstream ID; options are complete independent copies. The correction dialog explains this ownership rule.
- New editor controls must use the shared mutation and persistence boundaries. Protected projections deliberately reject nested in-place mutations. Keep view-only floor selection distinct from saved geometry.
- Removal retains geometry by design. Corrupt wrappers require explicit opaque archival or manual recovery; archived data is never automatically interpreted as repaired relationships.
- A previously open standalone editor adopted in another tab may retain unsaved edits; transactional guards block overwriting the new baseline and navigation while unsaved, and JSON export preserves those edits. Reload discovers default protection.
- Current development is on `foundation-remediation`, ahead of the original main foundation snapshot. Continue UI development from this branch/checkpoint.
- M3 homeowner controls and M4 measurement provenance remain planning work. Native scanner, AI, structural/code calculations and hosted deployment remain outside this completed objective.

See MILESTONE_AUDIT.md for the complete sequence and CHATGPT_PLANNING_HANDOFF.md for the copy-ready planning request. Passing these acceptance gates establishes the foundation for further development; it is not a claim that every possible application workflow is bug-free.

Browser evidence is split intentionally: EVIDENCE/M2_5_BROWSER.log proves 57 cases, and EVIDENCE/M2_5_PENDING_BROWSER.log proves three additional cross-tab adoption/export cases. Existing assertions remain intact; the added test uses canonical door orientation so legacy default revival does not change its fixture shape.
