# M2.1 — Existing Conditions

Every validated renovation now contains exactly one `kind: 'existing'` variant, identified by `existingVariantId`. The existing creation primitive already supplies one protected Existing Conditions baseline and initially activates it. Options can become active without changing the baseline pointer.

The shared wrapper validator rejects zero/multiple Existing variants instead of guessing or repairing a baseline. Save/load/dashboard/restore and deletion guards all reuse this validator. Valid M1 records remain unchanged; ambiguous raw data remains exportable for recovery. Workspace schema 1 and IndexedDB version 2 remain unchanged.

Tests prove a second Existing variant fails direct validation, save and loading damaged stored metadata, while a valid option beside one baseline remains supported. Verification: **75 focused tests**, **1,230 unit tests in 129 files**, and type checking with **zero errors/warnings** pass. Logs: `EVIDENCE/M2_1_*`. This milestone has no UI or editor-mutation change; M1.3 production browser/build evidence remains historical and was not rerun for this invariant.

Previous published checkpoint: M1.3 `8ca4d62`. Next: M2.2 complete option duplication, followed by switching, enforcement/correction and resilience. Baseline enforcement remains pending until M2.4.
