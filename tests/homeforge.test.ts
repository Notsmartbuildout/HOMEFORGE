import { beforeEach, expect, it, vi } from 'vitest';
import { createHomeWorkspace, createHomeforgeStore } from '$lib/services/homeforge';
import { readHomeWorkspace } from '$lib/utils/homeforgeValidation';
import { createLocalStore } from '$lib/services/datastore';
import { DATABASE_NAME, STORES, request, transaction, withDatabase } from '$lib/services/localDatabase';
import { mockStorage, rawRecords, putRaw, failWrites } from './fixtures/indexeddb';
import { roomProject } from './fixtures/project';

beforeEach(() => { mockStorage(); });

it('rejects a second Existing variant rather than guessing the baseline', async () => {
  const store = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await store.save(workspace);
  await store.createRenovationProject(workspace.id, { name: 'Entry' });
  const saved = (await store.load(workspace.id))!, renovation = saved.renovationProjects[0];
  renovation.variants.push({ ...renovation.variants[0], id: 'second-existing' });
  expect(() => readHomeWorkspace(saved)).toThrow(/exactly one Existing/);
  await expect(store.save(saved)).rejects.toThrow(/exactly one Existing/);
  await putRaw('homeforgeWorkspaces', workspace.id, JSON.stringify(saved));
  await expect(createHomeforgeStore().load(workspace.id)).rejects.toThrow(/exactly one Existing/);
});

it('retains exactly one baseline while allowing independent option variants', async () => {
  const store = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await store.save(workspace);
  await store.createRenovationProject(workspace.id, { name: 'Entry' });
  const saved = (await store.load(workspace.id))!, renovation = saved.renovationProjects[0];
  renovation.variants.push({ ...renovation.variants[0], id: 'option-a', name: 'Option A', kind: 'option', projectId: 'option-project', baselineProtected: false, createdFromVariantId: renovation.existingVariantId });
  renovation.activeVariantId = 'option-a';
  const validated = readHomeWorkspace(saved).renovationProjects[0];
  expect(validated.variants.filter(v => v.kind === 'existing')).toHaveLength(1);
  expect(validated.existingVariantId).not.toBe(validated.activeVariantId);
});

async function fixture() {
  const store = createHomeforgeStore(), workspace = createHomeWorkspace('My home');
  await store.save(workspace);
  return { store, workspace };
}

it('creates exactly one protected Existing Conditions variant and durably stores its project reference', async () => {
  const { store, workspace } = await fixture();
  const renovation = await store.createRenovationProject(workspace.id, { name: 'Entry' });
  expect(renovation.variants).toHaveLength(1);
  expect(renovation.variants[0]).toMatchObject({ name: 'Existing Conditions', kind: 'existing', baselineProtected: true });
  expect(renovation.existingVariantId).toBe(renovation.variants[0].id);
  expect(renovation.activeVariantId).toBe(renovation.existingVariantId);
  expect(await createLocalStore().load(renovation.variants[0].projectId)).not.toBeNull();
  const loaded = await createHomeforgeStore().load(workspace.id);
  expect(loaded!.renovationProjects).toEqual([renovation]);
  expect(loaded!.createdAt).toBeInstanceOf(Date);
  expect(loaded!.renovationProjects[0].variants[0].updatedAt).toBeInstanceOf(Date);
});

it('keeps IDs stable through save/load and distinct across concurrent creations', async () => {
  const { store, workspace } = await fixture();
  const renovations = await Promise.all(['Entry', 'Basement'].map(name => store.createRenovationProject(workspace.id, { name })));
  const ids = [workspace.id, ...renovations.flatMap(r => [r.id, r.variants[0].id, r.variants[0].projectId])];
  expect(new Set(ids).size).toBe(7);
  const loaded = (await store.load(workspace.id))!;
  await store.save(loaded);
  expect(await createHomeforgeStore().load(workspace.id)).toEqual(loaded);
  expect(loaded.renovationProjects.map(r => r.id).sort()).toEqual(renovations.map(r => r.id).sort());
});

it('accepts a valid project without mutating its input and leaves existing project bytes intact on metadata save/delete', async () => {
  const { store, workspace } = await fixture(), project = roomProject(), before = structuredClone(project);
  const created = await store.createRenovationProject(workspace.id, { name: 'Entry', project });
  expect(project).toEqual(before);
  expect(created.variants[0].projectId).toBe(project.id);
  const raw = await rawRecords();
  const loaded = (await store.load(workspace.id))!;
  loaded.name = 'Renamed'; await store.save(loaded);
  await store.delete(workspace.id);
  expect(await store.load(workspace.id)).toBeNull();
  expect(await rawRecords()).toEqual(raw);
  expect((await createLocalStore().load(project.id))!.floors).toEqual(project.floors);
});

it('references an already saved project without rewriting it', async () => {
  const project = roomProject(); await createLocalStore().save(project);
  const before = await rawRecords(), { store, workspace } = await fixture();
  await store.createRenovationProject(workspace.id, { name: 'Entry', projectId: project.id });
  expect(await rawRecords()).toEqual(before);
  await expect(store.createRenovationProject(workspace.id, { name: 'Missing', projectId: 'missing' })).rejects.toThrow();
  expect((await store.load(workspace.id))!.renovationProjects).toHaveLength(1);
});

it('rolls back the new upstream project if the metadata write fails', async () => {
  const { store, workspace } = await fixture(), before = await store.load(workspace.id);
  const restore = failWrites('homeforgeWorkspaces');
  await expect(store.createRenovationProject(workspace.id, { name: 'Entry' })).rejects.toMatchObject({ name: 'QuotaExceededError' });
  restore();
  expect(await rawRecords()).toEqual({});
  expect(await store.load(workspace.id)).toEqual(before);
});

it('rejects stale metadata saves and deletions rather than overwriting another client', async () => {
  const { store, workspace } = await fixture(), other = createHomeforgeStore();
  const stale = (await other.load(workspace.id))!;
  await store.createRenovationProject(workspace.id, { name: 'Entry' });
  await expect(other.save(stale)).rejects.toThrow(/changed/i);
  await expect(other.delete(workspace.id)).rejects.toThrow(/changed/i);
  expect((await store.load(workspace.id))!.renovationProjects).toHaveLength(1);
});

it('upgrades version 1 while preserving every inherited store and existing project bytes', async () => {
  const project = roomProject(), raw = JSON.stringify(project);
  await new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(DATABASE_NAME, 1);
    open.onupgradeneeded = () => { for (const name of STORES) open.result.createObjectStore(name); };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction([...STORES], 'readwrite');
      for (const name of STORES) tx.objectStore(name).put(name === 'projects' ? raw : `${name}-original`, project.id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  });
  await fixture();
  expect((await createLocalStore().load(project.id))!.floors).toEqual(project.floors);
  await withDatabase(db => transaction(db, [...STORES], 'readonly', async tx => {
    for (const name of STORES) expect(await request(tx.objectStore(name).get(project.id))).toBe(name === 'projects' ? raw : `${name}-original`);
    expect(db.objectStoreNames.contains('homeforgeWorkspaces')).toBe(true);
  }));
});

const corruptions: [string, (value: any) => void][] = [
  ['schema version', w => { w.schemaVersion = 2; }],
  ['duplicate renovation ID', w => { w.renovationProjects.push(structuredClone(w.renovationProjects[0])); }],
  ['duplicate variant ID', w => { w.renovationProjects[0].variants.push(structuredClone(w.renovationProjects[0].variants[0])); }],
  ['missing existing pointer', w => { delete w.renovationProjects[0].existingVariantId; }],
  ['missing active pointer', w => { delete w.renovationProjects[0].activeVariantId; }],
  ['dangling active pointer', w => { w.renovationProjects[0].activeVariantId = 'absent'; }],
  ['wrong existing kind', w => { w.renovationProjects[0].variants[0].kind = 'option'; }],
  ['blank ID', w => { w.id = ' '; }],
  ['bad timestamp', w => { w.createdAt = 'yesterday'; }],
  ['bad shape', w => { w.renovationProjects = {}; }],
  ['embedded project', w => { w.renovationProjects[0].variants[0].project = roomProject(); }],
  ['bad protection state', w => { w.renovationProjects[0].variants[0].baselineProtected = 'yes'; }],
  ['dangling source variant', w => { w.renovationProjects[0].variants[0].createdFromVariantId = 'absent'; }],
];
it.each(corruptions)('rejects corrupt metadata: %s without repairing its input', async (_name, corrupt) => {
  const { store, workspace } = await fixture();
  await store.createRenovationProject(workspace.id, { name: 'Entry' });
  const value = JSON.parse(JSON.stringify(await store.load(workspace.id))); corrupt(value);
  const before = JSON.stringify(value);
  expect(() => readHomeWorkspace(value)).toThrow(/Invalid HOMEFORGE/);
  expect(JSON.stringify(value)).toBe(before);
  await expect(store.save(value)).rejects.toThrow(/Invalid HOMEFORGE/);
  await putRaw('homeforgeWorkspaces', workspace.id, before);
  await expect(createHomeforgeStore().load(workspace.id)).rejects.toThrow(/Invalid HOMEFORGE/);
});

it('fails predictably on unreadable JSON or a mismatched storage key', async () => {
  const { store, workspace } = await fixture();
  await putRaw('homeforgeWorkspaces', workspace.id, '{broken');
  await expect(store.load(workspace.id)).rejects.toThrow(/Invalid HOMEFORGE/);
  await putRaw('homeforgeWorkspaces', workspace.id, JSON.stringify(createHomeWorkspace('Other')));
  await expect(store.load(workspace.id)).rejects.toThrow(/Invalid HOMEFORGE/);
});

it('discovers saved workspaces after restart and never aliases caller metadata', async () => {
  const { store, workspace } = await fixture();
  await store.createRenovationProject(workspace.id, { name: 'Entry' });
  const fresh = createHomeforgeStore(), listed = await fresh.list();
  expect(listed).toHaveLength(1);
  expect(listed[0].id).toBe(workspace.id);
  listed[0].renovationProjects[0].variants[0].name = 'Unsaved';
  expect((await fresh.load(workspace.id))!.renovationProjects[0].variants[0].name).toBe('Existing Conditions');
});

it('rejects reused upstream IDs without overwriting geometry or appending metadata', async () => {
  const { store, workspace } = await fixture(), project = roomProject();
  await createLocalStore().save(project);
  const before = await rawRecords(); project.name = 'Replacement';
  await expect(store.createRenovationProject(workspace.id, { name: 'Entry', project })).rejects.toThrow(/already exists/);
  expect(await rawRecords()).toEqual(before);
  expect((await store.load(workspace.id))!.renovationProjects).toEqual([]);
});

it('detects repeated ID generation and works without randomUUID', async () => {
  const { store, workspace } = await fixture();
  vi.stubGlobal('crypto', { randomUUID: () => workspace.id });
  await expect(store.createRenovationProject(workspace.id, { name: 'Entry' })).rejects.toThrow(/unique/);
  expect(await rawRecords()).toEqual({});
  vi.stubGlobal('crypto', undefined);
  const result = await store.createRenovationProject(workspace.id, { name: 'Entry' });
  expect(new Set([result.id, result.variants[0].id, result.variants[0].projectId]).size).toBe(3);
});

it('preserves invalid creation inputs without leaving an orphan project', async () => {
  const { store, workspace } = await fixture();
  await expect(store.createRenovationProject(workspace.id, { name: ' ' })).rejects.toThrow(/Invalid HOMEFORGE/);
  await expect(store.createRenovationProject(workspace.id, { name: 'Entry', project: { ...roomProject(), floors: [] } })).rejects.toThrow(/Invalid project/);
  expect(await rawRecords()).toEqual({});
  expect((await store.load(workspace.id))!.renovationProjects).toEqual([]);
});
