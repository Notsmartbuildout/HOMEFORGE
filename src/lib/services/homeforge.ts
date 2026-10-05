import type { DesignVariant, HomeWorkspace, RenovationProject } from '$lib/models/homeforge';
import type { Project } from '$lib/models/types';
import { createDefaultProject } from '$lib/stores/project';
import { readHomeWorkspace } from '$lib/utils/homeforgeValidation';
import { readHomeforgeZone } from '$lib/utils/homeforgeZoneValidation';
import { readProject } from '$lib/utils/projectValidation';
import { parseBackup } from '$lib/utils/parseBackup';
import { readSnapshotStorage, writeSnapshotStorage } from '$lib/utils/snapshotStorage';
import { HOMEFORGE_STORE, HOMEFORGE_ZONE_STORE, notifyLibraryChange, records, request, transaction, withDatabase } from './localDatabase';

const newId = () => globalThis.crypto?.randomUUID?.() ?? `homeforge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
function allocateId(used: Set<string>) {
  for (let i = 0; i < 5; i++) {
    const id = newId();
    if (!used.has(id)) { used.add(id); return id; }
  }
  throw new Error('Could not allocate a unique HOMEFORGE ID. Retry creation.');
}

export function createHomeWorkspace(name: string): HomeWorkspace {
  const now = new Date();
  return readHomeWorkspace({ schemaVersion: 1, id: newId(), name, renovationProjects: [], createdAt: now, updatedAt: now });
}

export type CreateRenovationInput = { name: string; description?: string } & (
  | { project: Project; projectId?: never }
  | { projectId: string; project?: never }
  | { project?: undefined; projectId?: undefined }
);

function decode(raw: string, id: string): HomeWorkspace {
  let value: unknown;
  try { value = parseBackup(raw); } catch { throw new Error('Invalid HOMEFORGE metadata: unreadable or ambiguous JSON.'); }
  const workspace = readHomeWorkspace(value);
  if (workspace.id !== id) throw new Error('Invalid HOMEFORGE metadata: ID does not match its storage key.');
  return workspace;
}

function referencedProject(raw: unknown, id: string): Project {
  if (typeof raw !== 'string') throw new Error(`Referenced upstream project ${id} is missing.`);
  const project = readProject(JSON.parse(raw));
  if (project.id !== id) throw new Error('Referenced upstream project ID does not match its storage key.');
  return project;
}

/** Independent clients track raw revisions, like the inherited project datastore. */
export function createHomeforgeStore() {
  const revisions = new Map<string, string | null>();
  const check = (id: string, raw: string | null) => {
    if (raw !== (revisions.get(id) ?? null)) throw new Error('HOMEFORGE metadata changed in another operation. Reload before saving or deleting.');
  };
  return {
    async list(): Promise<HomeWorkspace[]> {
      const saved = await withDatabase(db => transaction(db, [HOMEFORGE_STORE], 'readonly', tx => records(tx, HOMEFORGE_STORE)));
      const workspaces = Object.entries(saved).map(([id, raw]) => decode(raw, id));
      for (const [id, raw] of Object.entries(saved)) revisions.set(id, raw);
      return workspaces;
    },
    async load(id: string): Promise<HomeWorkspace | null> {
      const raw = await withDatabase(db => transaction(db, [HOMEFORGE_STORE], 'readonly', async tx =>
        (await request(tx.objectStore(HOMEFORGE_STORE).get(id))) ?? null));
      const result = raw === null ? null : decode(raw, id);
      revisions.set(id, raw);
      return result;
    },
    async save(value: HomeWorkspace): Promise<void> {
      const workspace = readHomeWorkspace(value), raw = JSON.stringify(workspace);
      await withDatabase(db => transaction(db, [HOMEFORGE_STORE, 'projects'], 'readwrite', async tx => {
        const metadata = tx.objectStore(HOMEFORGE_STORE);
        check(workspace.id, (await request(metadata.get(workspace.id))) ?? null);
        for (const renovation of workspace.renovationProjects) for (const variant of renovation.variants)
          referencedProject(await request(tx.objectStore('projects').get(variant.projectId)), variant.projectId);
        await request(metadata.put(raw, workspace.id));
      }));
      revisions.set(workspace.id, raw);
      notifyLibraryChange(workspace.id);
    },
    async delete(id: string): Promise<void> {
      await withDatabase(db => transaction(db, [HOMEFORGE_STORE], 'readwrite', async tx => {
        const metadata = tx.objectStore(HOMEFORGE_STORE);
        check(id, (await request(metadata.get(id))) ?? null);
        await request(metadata.delete(id));
      }));
      revisions.set(id, null);
      notifyLibraryChange(id);
    },
    /** Remove relationships only; upstream geometry and recovery assets remain saved. */
    async removeVariant(workspaceId: string, renovationId: string, variantId: string): Promise<void> {
      const raw = await withDatabase(db => transaction(db, [HOMEFORGE_STORE, HOMEFORGE_ZONE_STORE], 'readwrite', async tx => {
        const metadata = tx.objectStore(HOMEFORGE_STORE), stored = (await request(metadata.get(workspaceId))) ?? null;
        check(workspaceId, stored);
        if (stored === null) throw new Error('HOMEFORGE workspace is missing.');
        const workspace = decode(stored, workspaceId), renovation = workspace.renovationProjects.find(r => r.id === renovationId);
        const variant = renovation?.variants.find(v => v.id === variantId);
        if (!renovation || !variant) throw new Error('Design variant is missing. Reload before removing.');
        if (variant.kind === 'existing') throw new Error('Existing Conditions cannot be removed.');
        if (renovation.variants.some(v => v.createdFromVariantId === variant.id)) throw new Error('Remove descendant options first before removing their source option.');
        renovation.variants = renovation.variants.filter(v => v.id !== variant.id);
        if (renovation.activeVariantId === variant.id) renovation.activeVariantId = renovation.existingVariantId;
        renovation.updatedAt = workspace.updatedAt = new Date(Math.max(Date.now(), workspace.updatedAt.getTime(), renovation.updatedAt.getTime()));
        const zoneKey = JSON.stringify([workspaceId, renovationId]), zoneStore = tx.objectStore(HOMEFORGE_ZONE_STORE);
        const zoneRaw = await request(zoneStore.get(zoneKey));
        if (zoneRaw !== undefined) {
          const zone = readHomeforgeZone(JSON.parse(zoneRaw));
          if (zone.workspaceId !== workspaceId || zone.renovationId !== renovationId) throw new Error('Zone identity changed. Reload before removing an option.');
          for (const feature of zone.features) feature.bindings = feature.bindings.filter(binding => binding.variantId !== variant.id);
          zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
          await request(zoneStore.put(JSON.stringify(readHomeforgeZone(zone)), zoneKey));
        }
        const raw = JSON.stringify(readHomeWorkspace(workspace));
        await request(metadata.put(raw, workspaceId));
        return raw;
      }), { migrate: false });
      revisions.set(workspaceId, raw); notifyLibraryChange(workspaceId);
    },
    /** Archive unreadable wrapper bytes before removing the live metadata entry. */
    async archiveUnreadableWorkspace(id: string, expectedRaw: string): Promise<void> {
      if (typeof id !== 'string' || !id.trim() || typeof expectedRaw !== 'string') throw new Error('Workspace ID and exact saved metadata text are required for recovery.');
      await withDatabase(db => transaction(db, [HOMEFORGE_STORE, 'meta'], 'readwrite', async tx => {
        const metadata = tx.objectStore(HOMEFORGE_STORE), stored = await request(metadata.get(id));
        if (stored === undefined) throw new Error('HOMEFORGE workspace is missing.');
        if (stored !== expectedRaw) throw new Error('HOMEFORGE metadata changed in another operation. Reload before archiving.');
        let readable = false;
        try { decode(stored, id); readable = true; } catch {}
        if (readable) throw new Error('This HOMEFORGE workspace is readable and cannot be archived as unreadable.');
        const meta = tx.objectStore('meta'), used = new Set((await request(meta.getAllKeys())).map(key => String(key).replace(/^library-recovery:/, '')));
        const archiveId = allocateId(used);
        await request(meta.add(JSON.stringify({ format: 'openplan3d-recovery', version: 1, sourceName: 'Unreadable HOMEFORGE workspace',
          projects: {}, history: {}, thumbnails: {}, metadata: { homeforgeWorkspaces: { [id]: stored } } }), `library-recovery:${archiveId}`));
        await request(metadata.delete(id));
      }), { migrate: false });
      revisions.set(id, null); notifyLibraryChange(id);
    },
    async activateVariant(workspaceId: string, renovationId: string, variantId: string, expectedProject?: Project): Promise<Project> {
      const expected = expectedProject === undefined ? undefined : JSON.stringify(readProject(expectedProject));
      const result = await withDatabase(db => transaction(db, [HOMEFORGE_STORE, 'projects'], 'readwrite', async tx => {
        const metadata = tx.objectStore(HOMEFORGE_STORE), stored = (await request(metadata.get(workspaceId))) ?? null;
        check(workspaceId, stored);
        if (stored === null) throw new Error('HOMEFORGE workspace is missing.');
        const workspace = decode(stored, workspaceId), renovation = workspace.renovationProjects.find(r => r.id === renovationId);
        const variant = renovation?.variants.find(v => v.id === variantId);
        if (!renovation || !variant) throw new Error('Design variant is missing. Reload before switching.');
        const project = referencedProject(await request(tx.objectStore('projects').get(variant.projectId)), variant.projectId);
        if (expected !== undefined && JSON.stringify(project) !== expected) throw new Error('Target project changed. Reload before switching.');
        renovation.activeVariantId = variant.id;
        renovation.updatedAt = workspace.updatedAt = new Date(Math.max(Date.now(), workspace.updatedAt.getTime(), renovation.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeWorkspace(workspace));
        await request(metadata.put(raw, workspaceId));
        return { project, raw };
      }));
      revisions.set(workspaceId, result.raw); notifyLibraryChange(workspaceId);
      return result.project;
    },
    /** Copy complete saved state; one commit owns geometry, history and relationships. */
    async cloneVariant(workspaceId: string, renovationId: string, sourceVariantId: string, name: string, expectedProject?: Project): Promise<DesignVariant> {
      if (typeof name !== 'string' || !name.trim()) throw new Error('Option name must be nonempty text.');
      const expected = expectedProject === undefined ? undefined : JSON.stringify(readProject(expectedProject));
      const result = await withDatabase(db => transaction(db, [HOMEFORGE_STORE, HOMEFORGE_ZONE_STORE, 'projects', 'thumbnails', 'history'], 'readwrite', async tx => {
        const metadata = tx.objectStore(HOMEFORGE_STORE), projects = tx.objectStore('projects');
        const stored = (await request(metadata.get(workspaceId))) ?? null;
        check(workspaceId, stored);
        if (stored === null) throw new Error('HOMEFORGE workspace is missing.');
        const workspace = decode(stored, workspaceId), renovation = workspace.renovationProjects.find(r => r.id === renovationId);
        const source = renovation?.variants.find(v => v.id === sourceVariantId);
        if (!renovation || !source) throw new Error('Source variant is missing. Reload before creating an option.');
        const copy = referencedProject(await request(projects.get(source.projectId)), source.projectId);
        if (expected !== undefined && JSON.stringify(copy) !== expected) throw new Error('Source project changed. Reload before creating an option.');
        const used = new Set([workspace.id, ...workspace.renovationProjects.flatMap(r => [r.id, ...r.variants.flatMap(v => [v.id, v.projectId])]),
          ...(await request(projects.getAllKeys())).map(String)]);
        copy.id = allocateId(used); copy.name = name;
        const now = new Date(Math.max(Date.now(), workspace.updatedAt.getTime(), renovation.updatedAt.getTime(), copy.updatedAt.getTime()));
        copy.createdAt = copy.updatedAt = now;
        const variant: DesignVariant = { id: allocateId(used), name, kind: 'option', projectId: copy.id,
          createdFromVariantId: source.id, baselineProtected: false, createdAt: now, updatedAt: now };
        const history = tx.objectStore('history'), historyRaw = await request(history.get(source.projectId));
        let copiedHistory: string | undefined;
        if (historyRaw !== undefined) {
          try {
            const snapshots = readSnapshotStorage(historyRaw) as any[];
            copiedHistory = writeSnapshotStorage(snapshots.map(item => {
              if (!item || typeof item.timestamp !== 'number' || !Number.isFinite(item.timestamp) ||
                  typeof item.description !== 'string' || typeof item.data !== 'string') throw new Error();
              const project = referencedProject(item.data, source.projectId);
              project.id = copy.id; project.name = name;
              return { timestamp: item.timestamp, description: item.description, data: JSON.stringify(project) };
            }));
          } catch { throw new Error('Source version history is unreadable. Download a HOMEFORGE backup for recovery before creating an option.'); }
        }
        const thumbnail = await request(tx.objectStore('thumbnails').get(source.projectId));
        const zoneKey = JSON.stringify([workspaceId, renovationId]);
        const zoneStore = tx.objectStore(HOMEFORGE_ZONE_STORE), zoneRaw = await request(zoneStore.get(zoneKey));
        let zone: ReturnType<typeof readHomeforgeZone> | undefined;
        if (zoneRaw !== undefined) {
          zone = readHomeforgeZone(JSON.parse(zoneRaw));
          if (zone.workspaceId !== workspaceId || zone.renovationId !== renovationId) throw new Error('Zone identity changed. Reload before creating an option.');
          for (const feature of zone.features) {
            const binding = feature.bindings.find(item => item.variantId === source.id);
            if (binding) feature.bindings.push({ ...binding, variantId: variant.id });
          }
          zone.updatedAt = new Date(Math.max(now.getTime(), zone.updatedAt.getTime()));
        }
        renovation.variants.push(variant); renovation.updatedAt = workspace.updatedAt = now;
        const raw = JSON.stringify(readHomeWorkspace(workspace));
        await request(projects.add(JSON.stringify(copy), copy.id));
        if (thumbnail !== undefined) await request(tx.objectStore('thumbnails').add(thumbnail, copy.id));
        if (copiedHistory !== undefined) await request(history.add(copiedHistory, copy.id));
        if (zone) await request(zoneStore.put(JSON.stringify(readHomeforgeZone(zone)), zoneKey));
        await request(metadata.put(raw, workspace.id));
        return { variant, raw };
      }));
      revisions.set(workspaceId, result.raw); notifyLibraryChange(workspaceId);
      return result.variant;
    },
    async createRenovationProject(workspaceId: string, input: CreateRenovationInput): Promise<RenovationProject> {
      // Clone input before asynchronous storage work. Never open or mutate the editor.
      if (input.project !== undefined && input.projectId !== undefined) throw new Error('Choose an upstream project or projectId, not both.');
      const supplied = input.project !== undefined;
      const candidate = input.projectId === undefined ? readProject(supplied ? input.project : createDefaultProject(input.name)) : null;
      const name = input.name, description = input.description, referenceId = input.projectId;
      const result = await withDatabase(db => transaction(db, [HOMEFORGE_STORE, 'projects'], 'readwrite', async tx => {
        const metadata = tx.objectStore(HOMEFORGE_STORE), projects = tx.objectStore('projects');
        const existing = await request(metadata.get(workspaceId));
        if (existing === undefined) throw new Error('HOMEFORGE workspace is missing. Save it before creating a renovation project.');
        const workspace = decode(existing, workspaceId);
        const used = new Set([workspace.id, ...workspace.renovationProjects.flatMap(r => [r.id, ...r.variants.flatMap(v => [v.id, v.projectId])])]);
        const allocate = () => allocateId(used);
        let projectId: string;
        if (candidate) {
          if (supplied) {
            if (await request(projects.get(candidate.id)) !== undefined) throw new Error('Upstream project ID already exists. Use projectId to reference the saved project.');
          } else {
            let available = false;
            for (let i = 0; i < 5; i++) {
              candidate.id = allocate();
              if (await request(projects.get(candidate.id)) === undefined) { available = true; break; }
            }
            if (!available) throw new Error('Could not allocate a unique upstream project ID. Retry creation.');
          }
          projectId = candidate.id;
        } else {
          if (typeof referenceId !== 'string' || !referenceId.trim()) throw new Error('Upstream projectId must be nonempty text.');
          projectId = referenceId;
          referencedProject(await request(projects.get(projectId)), projectId);
        }
        used.add(projectId);
        // Monotonic update even if a device clock moved backwards.
        const now = new Date(Math.max(Date.now(), workspace.updatedAt.getTime()));
        const variantId = allocate();
        const renovation: RenovationProject = {
          id: allocate(), name, ...(description === undefined ? {} : { description }),
          existingVariantId: variantId, activeVariantId: variantId,
          variants: [{ id: variantId, name: 'Existing Conditions', kind: 'existing', projectId, baselineProtected: true, createdAt: now, updatedAt: now }],
          createdAt: now, updatedAt: now,
        };
        workspace.renovationProjects.push(renovation); workspace.updatedAt = now;
        const raw = JSON.stringify(readHomeWorkspace(workspace));
        if (candidate) await request(projects.add(JSON.stringify(candidate), projectId));
        await request(metadata.put(raw, workspaceId));
        return { renovation, raw };
      }));
      revisions.set(workspaceId, result.raw);
      notifyLibraryChange(workspaceId);
      return result.renovation;
    },
  };
}
