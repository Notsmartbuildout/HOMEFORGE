# M2.2 — Clone to Option

`createHomeforgeStore().cloneVariant(workspaceId, renovationId, sourceVariantId, name, expectedProject?)` creates a persisted option from a complete saved variant. UI creation/switching is integrated in the next M2.3 checkpoint.

The service reuses `readProject` for a deep validated copy: geometry, floors, underlay/annotation data, attachment names, inline package assets/native mapping, custom model and entourage definitions remain complete. New project and variant IDs are bounded and checked for collisions. The new variant is `kind: 'option'`, unprotected, with `createdFromVariantId` pointing to its source. Existing/active pointers remain unchanged by creation alone. Creation/update timestamps revive through existing readers.

Thumbnail and valid source history are copied; every history snapshot's project ID is remapped to the new project. Inline history assets use the inherited snapshot serializer. Corrupt source history blocks cloning with a backup/recovery message rather than being silently omitted. No source records are changed.

One IndexedDB transaction commits the project, thumbnail, history and metadata. Workspace raw revisions are checked; an optional expected source project detects concurrent saved changes. Quota/late write failure rolls back all participating records. Source assets are independent from subsequent option mutations. Schema 1 and database version 2 remain unchanged.

Six focused regressions cover complete copies/asset independence, cloning from an option/provenance, stale metadata/source, late-write rollback/retry, invalid inputs/history and bounded ID collisions. Review found no concrete defects. Verification: **93 focused tests**, **1,236 unit tests in 130 files**, type checking **zero errors/warnings**. Evidence: `EVIDENCE/M2_2_*`. No new UI/build/browser claim is made for this service checkpoint.

Previous published milestone: M2.1 `b15ae2c`. Next: M2.3 option creation and safe save → load → context reset in the editor, including durable active pointers and reload.
