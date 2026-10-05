import type { HomeWorkspace, RenovationProject } from '$lib/models/homeforge';
import type { Project } from '$lib/models/types';
import { createDefaultProject } from '$lib/stores/project';
import { readHomeWorkspace } from '$lib/utils/homeforgeValidation';
import { readProject } from '$lib/utils/projectValidation';
import { parseBackup } from '$lib/utils/parseBackup';
import { HOMEFORGE_STORE, notifyLibraryChange, records, request, transaction, withDatabase } from './localDatabase';

const newId = () => globalThis.crypto?.randomUUID?.() ?? `homeforge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

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
        const allocate = () => {
          for (let i = 0; i < 5; i++) {
            const id = newId();
            if (!used.has(id)) { used.add(id); return id; }
          }
          throw new Error('Could not allocate a unique HOMEFORGE ID. Retry creation.');
        };
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
