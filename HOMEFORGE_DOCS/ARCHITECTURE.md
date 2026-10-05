# Architecture decision

Foundation: MIT-licensed laanlabs/openPlan3D. Preserve upstream notices and history.

Existing stack: SvelteKit / Svelte 5 / TypeScript / Canvas 2D / Three.js / IndexedDB; Node 24 tooling and adapter-node production build.

Wrap the existing Project → Floor model rather than replacing it. M1.1 implements HomeWorkspace → RenovationProject → DesignVariant → upstream Project ID in a separate IndexedDB metadata store. See [M1_1_DOMAIN_FOUNDATION.md](M1_1_DOMAIN_FOUNDATION.md) for schema, API, validation and additive database migration. Keep references to Spaces in the wrapper for future work; postpone cross-project shared geometry.

M1.2 adds a minimal homeowner dashboard and a versioned HOMEFORGE backup. Snapshot reads and coordinated restore writes are atomic; restore creates independent copies and remaps wrapper IDs/pointers/shared project references. Invalid wrappers remain raw recovery data. Project deletion checks references in the same transaction, blocking deletion for referenced geometry or unreadable metadata. Removing workspace metadata retains geometry. Database version 2 and workspace schema 1 are unchanged. See [M1_2_COMPLETE.md](M1_2_COMPLETE.md).

Planned M2 design alternatives are independent deep copies, including project-owned assets. Baseline protection is currently metadata only; editor enforcement and intentional correction need explicit design. Variant switching must complete persistence and reset editor selection/history appropriately. Stable IDs, schema versioning, migration and transactional writes are requirements before implementation.

Measurement provenance belongs to individual dimensions, not whole objects: approximate, scan-derived, manually measured, calculated. A calculated value retains dependencies; changing geometry invalidates stale measurement verification. User input needs units, date, source and the value/geometry verified. Verification means provenance, not an engineering guarantee.

RoomPlan import is inherited; native iOS capture is not assumed available. Photo underlay calibration is reliable for plans or suitable orthographic images; scaling a perspective photograph cannot make all its geometry dimensionally accurate.

Local editing must work without login. Disable analytics and cloud uploads locally. Inventory inherited cloud, sharing, assistant and external asset paths before a homeowner release; configuration alone is not proof of full offline behaviour.

Preserve editor functionality initially. Change the homeowner shell and variants before selectively simplifying complex editor components.
