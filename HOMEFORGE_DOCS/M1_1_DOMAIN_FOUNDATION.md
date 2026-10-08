# M1.1 — Domain Foundation

Implemented locally on 2026-10-04 in `C:\DEVELOPMENT\HOMEFORGE`. No UI changes, editor mutation enforcement, option creation, cloud work or publication.

## Schema and representation

Types live in `src/lib/models/homeforge.ts`:

```text
HomeWorkspace
  schemaVersion: 1
  id, name: string
  renovationProjects: RenovationProject[]
  createdAt, updatedAt: Date

RenovationProject
  id, name: string
  description?: string
  existingVariantId, activeVariantId: string
  variants: DesignVariant[]
  createdAt, updatedAt: Date

DesignVariant
  id, name: string
  kind: 'existing' | 'option'
  projectId: string (upstream Project ID only)
  createdFromVariantId?: string (another variant in the same renovation)
  baselineProtected: boolean
  createdAt, updatedAt: Date
```

Dates are serialized as canonical ISO strings in JSON and revived into independent Date objects on reads. Wrapper objects cannot contain upstream geometry. Unknown fields are rejected rather than silently discarded. IDs/names must be nonempty strings, following upstream ID conventions. Validation checks required fields, schema version, timestamps and their order, duplicate renovation IDs, duplicate variant IDs within each renovation, pointer targets/kind, source references and the boolean protection flag. It does not infer repairs.

`baselineProtected` records intent. Existing editor mutations do not enforce it in M1.1.

## API

`src/lib/utils/homeforgeValidation.ts` exports:

- `readHomeWorkspace(value: unknown): HomeWorkspace`: validate, clone and revive; throws `Invalid HOMEFORGE metadata: ...` on corruption.

`src/lib/services/homeforge.ts` exports:

- `createHomeWorkspace(name: string): HomeWorkspace`: create a valid empty workspace in memory, with a stable ID and timestamps. Persist it with `save`.
- `CreateRenovationInput`: `{ name, description? }` plus either a new valid `project`, a saved `projectId`, or neither.
- `createHomeforgeStore()`: independent persistence client exposing:
  - `list(): Promise<HomeWorkspace[]>`
  - `load(id): Promise<HomeWorkspace | null>`
  - `save(workspace): Promise<void>`
  - `delete(id): Promise<void>`
  - `createRenovationProject(workspaceId, input): Promise<RenovationProject>`

Creation reads the latest persisted workspace and appends one renovation with one `Existing Conditions` variant, kind `existing`, `baselineProtected: true`, and both pointers set to its ID. With neither project argument, it uses the existing default-project factory and allocates a collision-checked upstream ID. A supplied Project is validated/cloned without mutating its input; its ID must not already be stored. Use `projectId` to reference a saved project without rewriting it. Missing, unreadable or mismatched saved projects fail creation.

New upstream geometry and wrapper metadata commit in one IndexedDB transaction; a failure rolls both back. Concurrent creation requests append to the latest workspace rather than losing earlier renovations. ID allocation has bounded collision retries and a fallback for contexts without `crypto.randomUUID`.

`load`/`list` establish raw metadata revisions. `save`/`delete` reject stale revisions, following the inherited datastore's conflict approach. A fresh client can save a new workspace; it must load/list an existing one before editing or deleting. `save` validates all referenced upstream projects but never rewrites them. Callers explicitly supply metadata timestamps when manually editing; creation advances the workspace timestamp automatically. `delete` removes only the wrapper, leaving upstream projects, previews and history intact. Load/list return clones and reject damaged metadata rather than hiding it.

## IndexedDB migration

Database remains `openplan3d-local`; `DATABASE_VERSION` is now 2. The upgrade transaction explicitly applies:

1. For oldVersion < 1, create inherited `projects`, `thumbnails`, `history`, `meta` stores.
2. For oldVersion < 2, create separate `homeforgeWorkspaces` store, keyed externally by workspace ID with JSON string values.

Version 1 project records and other inherited records are untouched. No existing project is automatically wrapped or destructively migrated. Schema creation remains atomic, and existing blocked-upgrade/version-change handling is retained.

`STORES` intentionally remains the inherited four-store list so legacy migration and current upstream backup semantics retain their scope. `StoreName` additionally accepts `homeforgeWorkspaces`. Legacy import, recovery and library restore behavior is unchanged. Browser test observers now open the current database version, and the connection-release regression explicitly attempts a future version upgrade.

## Verification

- New `tests/homeforge.test.ts`: **25 passing cases**, covering creation cardinality/pointers/protection, ID stability and collisions, fallback IDs, concurrent creation, save/load and Date revival, workspace discovery, input isolation, existing project references and byte preservation, metadata deletion, atomic rollback on quota failure, stale save/delete rejection, additive version 1 migration, invalid shapes/IDs/timestamps/schema/relationships, unreadable JSON and mismatched storage keys.
- Focused command: `npx vitest run tests/homeforge.test.ts tests/localDatabase.test.ts tests/datastore.test.ts tests/libraryRestore.test.ts tests/project-validation.test.ts tests/projectOpening.test.ts`: **150 passed in 6 files**.
- `npm test`: **1,211 passed in 127 files**.
- `npm run check`: **0 errors, 0 warnings**. Initial invocation encountered the inherited Vite production-build guard and Svelte fell back to its config file; exit status was 0. Repeated with process-local `NODE_ENV=production`: clean config loading, **0 errors, 0 warnings**, exit 0. No persistent environment or guard changes.
- `git diff --check`: passed.

No broad browser baseline was repeated. The metadata service has no UI integration yet.

## M1.2 / M2 planning implications

1. **Backup/restore must include HOMEFORGE metadata.** Existing upstream library backup still covers its original stores only. Before dashboard rollout, define a versioned HOMEFORGE bundle and atomic restore/remapping of workspace, renovation, variant and upstream project IDs, including assets. Raw metadata CRUD is not a portable backup workflow.
2. **Referenced-project deletion needs coordination.** Upstream deletion remains unaware of wrappers. It can leave dangling references; wrapper reads preserve those references while subsequent saves/creation validate them. Decide how the dashboard reports missing projects and blocks or coordinates deletion. Metadata deletion deliberately leaves geometry intact.
3. **Baseline protection needs editor integration.** The flag does not enforce read-only geometry or provide baseline-correction approval. M2 must define those transitions alongside independent option copies and asset ownership.
4. **Variant opening needs the existing save/conflict boundary.** Use upstream project opening and autosave coordination, with explicit selection/history reset. The domain creation primitive intentionally does not open a project or change editor state.
5. **Database version upgrades affect older tabs.** Retain the close-other-tabs recovery path and communicate it when shipping the dashboard; old code requesting database version 1 cannot reopen a version 2 database.

These are planning requirements, not implemented M1.2/M2 features. Jesse authorized committing M1.1 and pushing `foundation-remediation` to the HOMEFORGE fork on 2026-10-04. See Git history for the implementation checkpoint. No hosted deployment was requested.
