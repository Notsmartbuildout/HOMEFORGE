# M2 execution plan

Authorized by Jesse's continuing milestone objective, including committing and pushing each verified milestone to the fork. Work remains at `C:\DEVELOPMENT\HOMEFORGE` on `foundation-remediation`. Execute inline; preserve editor behavior and upstream notices. No further milestone approval prompts are required by the user's standing instruction.

## Design

Reuse the HOMEFORGE metadata store and inherited project validation, duplication, load/reset, save/conflict, history and recovery boundaries. No new dependencies or parallel persistence engine. Upstream Project objects remain outside wrappers.

- M2.1: require exactly one `kind: existing` variant per renovation and validate its Existing pointer. Existing creation already supplies the protected baseline. Preserve valid existing records; reject ambiguous records without repair.
- M2.2: clone a saved source variant into a named option using a complete validated project copy, fresh project/variant IDs and atomic metadata/project/assets writes. Copy inline project-owned data rather than sharing mutable objects; keep source/history unchanged. Validate metadata revisions and bounded ID allocation. Retain source variant provenance.
- M2.3: expose option creation and variant selection around the editor. Save current edits successfully before transition; reject conflict/quota/missing targets while retaining current state. Persist active pointer and load exact target; reuse inherited context/undo reset, clear local panels and synchronize URL. Reload opens the selected variant. Avoid late work overwriting newer state.
- M2.4: protect Existing Conditions by default at shared editor mutation and persistence boundaries, including standalone access to referenced baselines. Explicit correction mode permits intentional edits, visibly marks the mode and ends on navigation/reload. Options remain editable. Keep read/export/view operations available. Do not silently discard blocked changes.
- M2.5: exercise reload, option duplication/removal, missing/corrupt/conflicting data, rollback/retry, backup remapping and asset independence. Removing an option's metadata must respect source pointers and protect the baseline; permanent geometry deletion requires an explicit action and reference-safe transaction.

## Verification and checkpoints

Each milestone adds focused regressions, runs `npm run check` and `npm test`, and commits/pushes only after passing. Build and run focused production browser cases for UI changes across desktop/mobile and the three configured engines. Record actual results and checkpoint IDs in durable handoffs. Reuse previous evidence for unchanged areas; do not repeat the broad historical browser baseline.

- [ ] M2.1 invariant and checkpoint
- [ ] M2.2 complete clone and checkpoint
- [ ] M2.3 save/load/reset and checkpoint
- [ ] M2.4 protection/correction and checkpoint
- [ ] M2.5 resilience audit and checkpoint

Final audit must prove every listed milestone, including live GitHub checkpoints, before completing the active goal. Later measurement, AI, native scanner, structural calculation and hosted deployment features remain outside this objective.
