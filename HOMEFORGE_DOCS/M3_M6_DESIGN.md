# M3–M6 homeowner workflow design

Status: working design for the next phase. Starting point: `foundation-remediation` at `76e774d` (M1.1–M2.5 complete). Implementation status is recorded in `HANDOFF.md` and `ROADMAP.md`; this design does not itself claim M3–M6 are complete.

## Intended result

A homeowner can work on one renovation area without surveying the whole house: capture evidence, model and correct Existing Conditions, record which dimensions were checked, make independent options, compare them, and export useful dimensions with their sources. The first practical area is the front entrance and stairs. Measurement verification is evidence provenance, not a structural or code approval.

## Navigation and ownership

Use the existing `RenovationProject` as the user-facing **Renovation Zone**. One zone has one Existing baseline and its options; `HomeWorkspace` remains the project dashboard grouping. Do not add a second zone/container layer. A zone may cross rooms and floors. Mark captured items and spatial features as `context` or `focus`; a drawn zone boundary is not needed for the first workflow. Linking zones and shared geometry come after practical validation.

Navigation: **Dashboard → Zone overview → Capture → Existing → Options → Compare / Export**. The zone overview shows the current step, evidence/measurement gaps, Existing status and options. The existing editor remains available from Existing and each option. Preserve its 2D, elevation, 3D, direct manipulation and expert tools; make common numeric controls easier to reach. M3 can ship this shell without a storage migration. Do not show a feature legend as persistent until its identity registry exists.

Existing Conditions is the physical baseline. It stays protected by the M2.4 shared mutation and write guards; correcting it remains an explicit session action. A new capture or proposal cannot silently change it. Options retain M2.2 complete-copy ownership, M2.3 save/switch/reset semantics and M2.5 removal/recovery behavior.

## Zone record and local assets (M4)

Keep the strict workspace wrapper focused on relationships. Add a versioned zone record keyed by `(workspaceId, renovationId)` with capture sessions, evidence metadata, feature identities, measurements and coverage decisions. Add an evidence asset store keyed by stable evidence ID for original local bytes. This is an additive IndexedDB v3 migration; old projects and schema-1 wrappers stay readable without rewriting. Use the existing transaction/revision pattern. Never mutate a partial zone record after a failed write.

Each capture session records ID, zone ID, start/end timestamps and optional visit note. Evidence records have ID, session ID, kind (`photo`, `plan`, `sketch`, `roomplan` or `note`), source filename/type, captured or imported time, `context`/`focus`, optional feature IDs, original asset hash and optional preview reference. Original photo/file bytes are retained locally; previews are labeled derivatives. Validate type, size, and readable content before admitting assets; check available storage and show a backup/retry path on quota failure. A missing or damaged asset is reported as unavailable and retained for recovery, not silently dropped.

HOMEFORGE backup format v2 must include zone records and original evidence bytes, while restore continues to accept v1. Restore remaps workspace, renovation, variant and feature references in one coordinated operation and retains damaged/unmatched raw data in recovery. Backup/export must round-trip original bytes. Do not put original evidence into every option's project package or history. An inherited project-only export remains a project-only export and must say that it omits zone evidence.

## Guided capture and measurement

Capture guides the homeowner through context/overview, wall-by-wall views, doors/windows/stairs/openings, focus details, manual dimensions, and optional plan/sketch/RoomPlan import. Order is suggested, not enforced. Imported files become evidence first. The inherited RoomPlan importer can produce a draft project, but accepting that draft into Existing requires the protected proposal review path. A perspective photograph is visual evidence; a single scale does not make all its geometry accurate. A calibrated orthographic plan can support metric drafting.

Coverage is computed from the features present and the chosen front-entry/stair template, not a fixed number of photos. Each suggested measurement has a reason and one of `needed for useful geometry`, `recommended` or `optional`. The homeowner may mark capture `sufficient for now`; gaps remain visible and never block editing. Stair dependencies can reduce redundant prompts: total rise and riser count can calculate nominal riser height, marked calculated rather than individually measured.

Measurements are zone-owned evidence about Existing Conditions. Store the entered value/unit and a canonical centimetre value, measurement date, source/evidence IDs, feature ID plus semantic property (for example `door.width` or `stair.totalRise`), and dependencies for calculated values. A verification records the specific geometry value and a fingerprint of the relevant geometry/dependencies. Recompute status on read/export: changed geometry or inputs make the verification stale while retaining the original observation. An option's designed dimension may be compared with the Existing measurement, but is not automatically marked physically verified. Use shared mutation APIs and persistence guards for every correction.

## Spatial identity and legend

The zone record owns stable feature IDs, types, descriptions, labels and explicit relationships (`replaces`, `splitFrom`, `mergedFrom`). A feature ID represents the same physical/conceptual feature across variants; each variant binding points to its own floor, element kind and element ID. A removed feature has no binding in that option; a replacement gets a new feature ID and a relationship to its predecessor. Never infer identity solely from a visible letter.

Generate an initial label order from floor, feature type and spatial position, then persist labels so later discoveries do not renumber earlier ones. Permit unique user-edited labels and descriptions. Existing pre-M4 options may be suggested as matches using type and saved element ID, but uncertain matches remain unresolved until reviewed. New option clones copy confirmed bindings in the same transaction as the option. Save/restore must remap variant IDs; geometry element IDs remain variant-local. Legend overlays and comparison controls read the registry, and clearly mark unbound or removed features.

## Proposal and correction path (M5)

A proposal is a draft change set with source evidence IDs, proposed geometry/values, confidence wording and a before/after preview. It is never the verified baseline. The first local proposal sources are calibrated plan geometry, compatible RoomPlan imports and manual measurements. Photos may support review, but photo-only metric inference is not claimed. Accepting a proposal checks current saved revisions and baseline correction permission, applies through existing editor mutation/save boundaries, and groups the change for undo. Rejecting leaves Existing intact. Reload recovers the saved baseline, not an unaccepted draft.

The first language commands are a small deterministic grammar for exact numeric assignments to a unique legend label/property, such as “C is 36 inches wide.” Show the resolved feature and value; an unambiguous simple edit is applied through the same guarded, undoable mutation as a numeric field. If a label/property is ambiguous, ask for the missing target/value. Multi-element changes require a computed preview and explicit acceptance; unsupported structural commands explain what information is missing. Never execute generated code or alter drawing pixels directly. Optional AI interpretation is a later, separately authorized adapter that produces the same validated proposal type; offline/manual use remains complete without it. No external provider call, key or paid service is part of M3–M6 by default.

## Milestones and acceptance

| Milestone | Smallest useful result | Exit evidence |
|---|---|---|
| M3 | Zone overview and task navigation; clearer variant identity; compact numeric editing using existing mutation APIs | Protected Existing stays read-only; option edits remain undoable and independent; save-before-navigation/switch survives failure; desktop/mobile browser checks |
| M4 | Guided capture, original local assets, coverage, measurements, feature registry/legend and import-as-evidence | Additive migration; v1/v2 backup restore; byte-exact evidence round-trip; clone/restore identity mapping; stale verification; quota/conflict/recovery checks |
| M5 | Local proposal/review and exact numeric legend corrections | Proposal never auto-applies; accept is guarded and undoable; stale revisions reject; photo-only input cannot claim metric accuracy; unsupported commands do not mutate |
| M6 | Real front-entry/stair pilot, comparison and dimensioned export review | A user can capture context/focus, model Existing, verify key dimensions, create two independent options, compare 2D/elevation/3D, export provenance and restore a backup |

Focused unit and browser tests should cover each new boundary. Run `npm run check`, `npm test`, production build and relevant Chromium/Firefox/WebKit cases for changed UI/storage paths; retain historical broad-suite evidence rather than repeating it without a new risk. Do not relax M1/M2 assertions. Revisit offline/external-service paths before homeowner release.

## Deliberately later

Linked zones/shared geometry, a whole-house survey requirement, automatic perspective-photo reconstruction, native iPhone capture, generalized AI chat, estimates, structural/code calculations, and hosted deployment are outside these slices. Compatible LiDAR/RoomPlan files enter through the same evidence/import boundary; no native capture companion is required.
