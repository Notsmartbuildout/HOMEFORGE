# Architecture decision

Foundation: MIT-licensed laanlabs/openPlan3D. Preserve upstream notices and history.

Existing stack: SvelteKit / Svelte 5 / TypeScript / Canvas 2D / Three.js / IndexedDB; Node 24 tooling and adapter-node production build.

Wrap the existing Project → Floor model rather than replacing it. Proposed HomeWorkspace → RenovationProject → DesignVariant → upstream Project. Keep references to Spaces in the wrapper; postpone cross-project shared geometry.

Design alternatives are independent deep copies, including project-owned assets. The baseline is protected from accidental edits; intentional baseline correction needs an explicit action. Variant switching must complete persistence and reset editor selection/history appropriately. Stable IDs, schema versioning, migration and transactional writes are requirements before implementation.

Measurement provenance belongs to individual dimensions, not whole objects: approximate, scan-derived, manually measured, calculated. A calculated value retains dependencies; changing geometry invalidates stale measurement verification. User input needs units, date, source and the value/geometry verified. Verification means provenance, not an engineering guarantee.

RoomPlan import is inherited; native iOS capture is not assumed available. Photo underlay calibration is reliable for plans or suitable orthographic images; scaling a perspective photograph cannot make all its geometry dimensionally accurate.

Local editing must work without login. Disable analytics and cloud uploads locally. Inventory inherited cloud, sharing, assistant and external asset paths before a homeowner release; configuration alone is not proof of full offline behaviour.

Preserve editor functionality initially. Change the homeowner shell and variants before selectively simplifying complex editor components.
