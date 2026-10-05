import { beforeEach, expect, it, vi } from 'vitest';
import { IDBObjectStore } from 'fake-indexeddb';
import { homeforgeBackup, libraryBackup } from '$lib/services/localDatabase';
import { prepareLibraryRestore } from '$lib/services/libraryRestore';
import { createHomeWorkspace, createHomeforgeStore } from '$lib/services/homeforge';
import { createLocalStore } from '$lib/services/datastore';
import { readSnapshotStorage } from '$lib/utils/snapshotStorage';
import { mockStorage, putRaw, rawRecords, failWrites } from './fixtures/indexeddb';
import { roomProject } from './fixtures/project';

beforeEach(() => { mockStorage(); });
async function fixture() {
  const client = createHomeforgeStore(), workspace = createHomeWorkspace('Home');
  await client.save(workspace);
  const project = roomProject();
  project.projectPackage = { version: 1, native: {}, mapping: [], assets: { 'assets/photo.png': 'cGhvdG8=' } };
  await client.createRenovationProject(workspace.id, { name: 'Entry', project });
  return { client, workspace: (await client.load(workspace.id))!, project };
}

it('exports raw metadata and geometry in one consistent read transaction, including damaged bytes', async () => {
  const { workspace, project } = await fixture();
  await putRaw('homeforgeWorkspaces', 'broken', '{unreadable workspace');
  await putRaw('history', project.id, '{unreadable history');
  const data = JSON.parse(await homeforgeBackup());
  expect(data.format).toBe('homeforge-library'); expect(data.version).toBe(2);
  expect(JSON.parse(data.workspaces[workspace.id]).renovationProjects[0].variants[0].projectId).toBe(project.id);
  expect(data.workspaces.broken).toBe('{unreadable workspace');
  expect(data.history[project.id]).toBe('{unreadable history');
  expect(JSON.parse(data.projects[project.id]).floors).toEqual(project.floors);
  expect(JSON.parse(await libraryBackup()).format).toBe('openplan3d-library');
});

it('blocks deletion of referenced projects and permits it after metadata removal', async () => {
  const { client, workspace, project } = await fixture(), upstream = createLocalStore();
  await upstream.list(); const before = await rawRecords();
  await expect(upstream.delete(project.id)).rejects.toThrow(/referenced.*HOMEFORGE/i);
  expect(await rawRecords()).toEqual(before);
  await client.delete(workspace.id); await upstream.delete(project.id);
  expect(await upstream.load(project.id)).toBeNull();
});

it('blocks destructive project deletion when metadata cannot be validated', async () => {
  const project = roomProject(), store = createLocalStore(); await store.save(project);
  await putRaw('homeforgeWorkspaces', 'bad', '{damaged');
  await expect(store.delete(project.id)).rejects.toThrow(/backup|recovery/i);
  expect(await store.load(project.id)).not.toBeNull();
});

it('blocks deletion when duplicate JSON keys obscure a project reference', async () => {
  const { workspace, project } = await fixture(), store = createLocalStore(); await store.list();
  const raw = JSON.stringify(workspace).replace(/}$/, ',"renovationProjects":[]}');
  await putRaw('homeforgeWorkspaces', workspace.id, raw);
  await expect(store.delete(project.id)).rejects.toThrow(/backup|recovery/i);
  expect(await store.load(project.id)).not.toBeNull();
});

it('restores all IDs and shared references without changing original geometry, assets or history', async () => {
  const { client, workspace, project } = await fixture();
  const loaded = (await client.load(workspace.id))!;
  const first = loaded.renovationProjects[0], option = structuredClone(first.variants[0]);
  option.id = 'future-option'; option.name = 'Future option'; option.kind = 'option'; option.createdFromVariantId = first.existingVariantId;
  first.variants.push(option); first.activeVariantId = option.id; await client.save(loaded);
  await putRaw('thumbnails', project.id, 'data:image/gif;base64,AAAA');
  await putRaw('history', project.id, JSON.stringify([{ timestamp: 1, description: 'Original', data: JSON.stringify(project) }]));
  const before = await rawRecords(), metadataBefore = await rawRecords('homeforgeWorkspaces');
  const preview = prepareLibraryRestore(await homeforgeBackup());
  expect(preview.workspaceCount).toBe(1);
  const result = await preview.restore();
  expect(result.workspaces).toHaveLength(1); expect(result.projects).toHaveLength(1);
  const restored = (await createHomeforgeStore().load(result.workspaces![0].id))!;
  expect(restored.id).not.toBe(workspace.id);
  expect(restored.renovationProjects[0].id).not.toBe(first.id);
  const renovation = restored.renovationProjects[0], variants = renovation.variants;
  expect(variants[0].id).not.toBe(first.variants[0].id);
  expect(variants[1].createdFromVariantId).toBe(variants[0].id);
  expect(renovation.existingVariantId).toBe(variants[0].id); expect(renovation.activeVariantId).toBe(variants[1].id);
  expect(variants.map(v => v.projectId)).toEqual([result.projects[0].id, result.projects[0].id]);
  expect((await rawRecords())[project.id]).toBe(before[project.id]);
  expect((await rawRecords('homeforgeWorkspaces'))[workspace.id]).toBe(metadataBefore[workspace.id]);
  expect((await createLocalStore().load(result.projects[0].id))!.floors).toEqual(project.floors);
  expect((await createLocalStore().load(result.projects[0].id))!.projectPackage?.assets).toEqual({ 'assets/photo.png': 'cGhvdG8=' });
  expect((await rawRecords('thumbnails'))[result.projects[0].id]).toBe('data:image/gif;base64,AAAA');
  expect(JSON.parse((readSnapshotStorage((await rawRecords('history'))[result.projects[0].id])[0] as any).data).id).toBe(result.projects[0].id);
  expect(await preview.restore()).toBe(result);
});

it('takes a coherent snapshot when metadata and geometry change during export', async () => {
  const { workspace, project } = await fixture();
  const original = IDBObjectStore.prototype.getAll;
  let mutation: Promise<void> | undefined;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'getAll').mockImplementation(function (this: IDBObjectStore, ...args) {
    const req = original.apply(this, args);
    if (this.name === 'homeforgeWorkspaces' && this.transaction.mode === 'readonly') {
      req.addEventListener('success', () => {
        const tx = this.transaction.db.transaction(['projects', 'homeforgeWorkspaces'], 'readwrite');
        const changedWorkspace = structuredClone(workspace), changedProject = structuredClone(project);
        changedWorkspace.name = 'Changed'; changedProject.name = 'Changed';
        tx.objectStore('homeforgeWorkspaces').put(JSON.stringify(changedWorkspace), workspace.id);
        tx.objectStore('projects').put(JSON.stringify(changedProject), project.id);
        mutation = new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); });
      });
    }
    return req;
  });
  const snapshot = JSON.parse(await homeforgeBackup()); spy.mockRestore(); await mutation;
  expect(JSON.parse(snapshot.workspaces[workspace.id]).name).toBe('Home');
  expect(JSON.parse(snapshot.projects[project.id]).name).toBe('Regression plan');
  const next = JSON.parse(await homeforgeBackup());
  expect(JSON.parse(next.workspaces[workspace.id]).name).toBe('Changed'); expect(JSON.parse(next.projects[project.id]).name).toBe('Changed');
});

it('restores an empty workspace without requiring an upstream project', async () => {
  const store = createHomeforgeStore(), workspace = createHomeWorkspace('Empty'); await store.save(workspace);
  const result = await prepareLibraryRestore(await homeforgeBackup()).restore();
  expect(result.projects).toEqual([]); expect(result.workspaces).toHaveLength(1);
  expect((await store.load(result.workspaces![0].id))!.renovationProjects).toEqual([]);
});

it('archives invalid and dangling wrappers without activating ambiguous relationships', async () => {
  const { workspace } = await fixture();
  const backup = JSON.parse(await homeforgeBackup());
  backup.workspaces.bad = '{damaged';
  const dangling = structuredClone(workspace); dangling.id = 'dangling'; dangling.renovationProjects[0].variants[0].projectId = 'absent';
  backup.workspaces.dangling = JSON.stringify(dangling);
  const preview = prepareLibraryRestore(JSON.stringify(backup));
  expect(preview.workspaceCount).toBe(1); expect(preview.warnings.join(' ')).toMatch(/workspace.*recovery/i);
  const result = await preview.restore(); expect(result.workspaces).toHaveLength(1);
  const archives = JSON.parse(await homeforgeBackup()).recovery;
  const retained = Object.values(archives).map(raw => JSON.parse(raw as string)).find(a => a.metadata?.homeforgeWorkspaces);
  expect(retained.metadata.homeforgeWorkspaces.bad).toBe('{damaged');
  expect(retained.metadata.homeforgeWorkspaces.dangling).toBe(backup.workspaces.dangling);
});

it('rolls back every restored record on metadata quota failure and can retry', async () => {
  await fixture(); const backup = await homeforgeBackup(), before = await rawRecords(), wrappers = await rawRecords('homeforgeWorkspaces');
  const preview = prepareLibraryRestore(backup), restore = failWrites('homeforgeWorkspaces');
  await expect(preview.restore()).rejects.toMatchObject({ name: 'QuotaExceededError' }); restore();
  expect(await rawRecords()).toEqual(before); expect(await rawRecords('homeforgeWorkspaces')).toEqual(wrappers);
  expect((await preview.restore()).workspaces).toHaveLength(1);
});

it('cancels before and during restore without leaving partial records', async () => {
  await fixture(); const preview = prepareLibraryRestore(await homeforgeBackup()), before = await rawRecords();
  const controller = new AbortController(); controller.abort();
  await expect(preview.restore(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  const active = new AbortController(), original = IDBObjectStore.prototype.add;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (this: IDBObjectStore, ...args) {
    const req = original.apply(this, args);
    if (this.name === 'homeforgeWorkspaces') req.addEventListener('success', () => active.abort());
    return req;
  });
  await expect(preview.restore(active.signal)).rejects.toMatchObject({ name: 'AbortError' }); spy.mockRestore();
  expect(await rawRecords()).toEqual(before);
});

it('rejects unsupported envelopes and duplicate backup keys before any storage operation', () => {
  expect(() => prepareLibraryRestore('{"format":"homeforge-library","version":3,"projects":{},"workspaces":{}}')).toThrow(/version/);
  expect(() => prepareLibraryRestore('{"format":"homeforge-library","version":1,"projects":{},"workspaces":{},"workspaces":{}}')).toThrow(/repeats/);
});

it('preserves metadata-only damaged backups as flat recovery archives', async () => {
  await putRaw('homeforgeWorkspaces', 'broken', '{original damaged metadata');
  const preview = prepareLibraryRestore(await homeforgeBackup());
  expect(preview.workspaceCount).toBe(0); expect(preview.projectCount).toBe(0);
  const result = await preview.restore(); expect(result.workspaces).toEqual([]); expect(result.recoveryArchives).toBe(1);
  const data = JSON.parse(await homeforgeBackup());
  expect(JSON.parse(Object.values(data.recovery)[0] as string).metadata.homeforgeWorkspaces.broken).toBe('{original damaged metadata');
});

it('fails bounded ID collisions without committing any restored records', async () => {
  const { workspace } = await fixture(), preview = prepareLibraryRestore(await homeforgeBackup());
  const before = await rawRecords(), metadata = await rawRecords('homeforgeWorkspaces');
  vi.stubGlobal('crypto', { randomUUID: () => workspace.id });
  await expect(preview.restore()).rejects.toThrow(/restored HOMEFORGE ID/);
  expect(await rawRecords()).toEqual(before); expect(await rawRecords('homeforgeWorkspaces')).toEqual(metadata);
});

it('serializes concurrent reference creation and deletion without producing an orphan', async () => {
  const project = roomProject(), upstream = createLocalStore(); await upstream.save(project);
  const client = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await client.save(workspace);
  const results = await Promise.allSettled([
    client.createRenovationProject(workspace.id, { name: 'Entry', projectId: project.id }), upstream.delete(project.id),
  ]);
  expect(results.some(r => r.status === 'rejected')).toBe(true);
  const loaded = (await client.load(workspace.id))!;
  if (loaded.renovationProjects.length) expect(await upstream.load(project.id)).not.toBeNull();
  else expect(await upstream.load(project.id)).toBeNull();
});
