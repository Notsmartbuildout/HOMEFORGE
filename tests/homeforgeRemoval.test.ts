import { beforeEach, expect, it, vi } from 'vitest';
import { IDBObjectStore } from 'fake-indexeddb';
import { createHomeWorkspace, createHomeforgeStore } from '$lib/services/homeforge';
import { HOMEFORGE_STORE, homeforgeBackup, request, transaction, withDatabase } from '$lib/services/localDatabase';
import { prepareLibraryRestore } from '$lib/services/libraryRestore';
import { writeSnapshotStorage } from '$lib/utils/snapshotStorage';
import { mockStorage, putRaw, rawRecords, failWrites } from './fixtures/indexeddb';
import { roomProject } from './fixtures/project';

beforeEach(() => { mockStorage(); });

async function fixture() {
  const client = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await client.save(workspace);
  const project = roomProject();
  project.projectPackage = { version: 1, native: { note: 'Original' }, mapping: [], assets: { 'assets/photo.png': 'cGhvdG8=' } };
  const renovation = await client.createRenovationProject(workspace.id, { name: 'Entry', project });
  const source = renovation.variants[0];
  await putRaw('thumbnails', project.id, 'data:image/png;base64,cGhvdG8=');
  await putRaw('history', project.id, writeSnapshotStorage([{ timestamp: 1, description: 'Measured', data: JSON.stringify(project) }]));
  const option = await client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A');
  return { client, workspace, renovation, source, option };
}

async function upstreamBytes() {
  return { projects: await rawRecords(), thumbnails: await rawRecords('thumbnails'), history: await rawRecords('history') };
}

it('protects Existing and a source option until its descendant is removed', async () => {
  const { client, workspace, renovation, source, option } = await fixture();
  const descendant = await client.cloneVariant(workspace.id, renovation.id, option.id, 'Option B');
  const before = await rawRecords(HOMEFORGE_STORE), upstream = await upstreamBytes();
  await expect(client.removeVariant(workspace.id, renovation.id, source.id)).rejects.toThrow(/Existing/);
  await expect(client.removeVariant(workspace.id, renovation.id, option.id)).rejects.toThrow(/descendant.*first/i);
  expect(await rawRecords(HOMEFORGE_STORE)).toEqual(before);
  await client.removeVariant(workspace.id, renovation.id, descendant.id);
  await client.removeVariant(workspace.id, renovation.id, option.id);
  expect((await client.load(workspace.id))!.renovationProjects[0].variants.map(v => v.id)).toEqual([source.id]);
  expect(await upstreamBytes()).toEqual(upstream);
});

it('falls back to Existing when removing the active option and retains all upstream bytes after reload and backup restore', async () => {
  const { client, workspace, renovation, source, option } = await fixture();
  await client.activateVariant(workspace.id, renovation.id, option.id);
  const upstream = await upstreamBytes();
  await client.removeVariant(workspace.id, renovation.id, option.id);
  const saved = (await createHomeforgeStore().load(workspace.id))!.renovationProjects[0];
  expect(saved.activeVariantId).toBe(source.id); expect(saved.existingVariantId).toBe(source.id);
  expect(saved.variants).toHaveLength(1); expect(await upstreamBytes()).toEqual(upstream);
  const restored = await prepareLibraryRestore(await homeforgeBackup()).restore();
  const copy = (await createHomeforgeStore().load(restored.workspaces![0].id))!.renovationProjects[0];
  expect(copy.variants).toHaveLength(1); expect(copy.activeVariantId).toBe(copy.existingVariantId);
});

it.each(['missing', 'corrupt'])('removes metadata safely when option and baseline geometry are %s', async damage => {
  const { client, workspace, renovation, source, option } = await fixture();
  for (const id of [source.projectId, option.projectId]) {
    if (damage === 'corrupt') await putRaw('projects', id, '{damaged geometry');
    else await withDatabase(db => transaction(db, ['projects'], 'readwrite', async tx => { await request(tx.objectStore('projects').delete(id)); }));
  }
  const upstream = await upstreamBytes();
  await client.removeVariant(workspace.id, renovation.id, option.id);
  expect((await client.load(workspace.id))!.renovationProjects[0].variants).toHaveLength(1);
  expect(await upstreamBytes()).toEqual(upstream);
});

it('rejects stale clients, missing targets and invalid wrappers without writes', async () => {
  const { client, workspace, renovation, option } = await fixture(), stale = createHomeforgeStore();
  await stale.load(workspace.id); await client.activateVariant(workspace.id, renovation.id, option.id);
  const before = await rawRecords(HOMEFORGE_STORE);
  await expect(stale.removeVariant(workspace.id, renovation.id, option.id)).rejects.toThrow(/changed/);
  await expect(client.removeVariant(workspace.id, 'missing', option.id)).rejects.toThrow(/missing/i);
  await expect(client.removeVariant(workspace.id, renovation.id, 'missing')).rejects.toThrow(/missing/i);
  expect(await rawRecords(HOMEFORGE_STORE)).toEqual(before);
  const broken = JSON.parse(before[workspace.id]); broken.renovationProjects[0].activeVariantId = 'missing';
  await putRaw(HOMEFORGE_STORE, workspace.id, JSON.stringify(broken));
  await expect(createHomeforgeStore().load(workspace.id)).rejects.toThrow(/Invalid HOMEFORGE/);
  // A new client cannot claim an unreadable revision; strict removal never repairs it.
  await expect(client.removeVariant(workspace.id, renovation.id, option.id)).rejects.toThrow();
  expect((await rawRecords(HOMEFORGE_STORE))[workspace.id]).toBe(JSON.stringify(broken));
});

it('rolls back failed metadata removal and permits retry without reloading', async () => {
  const { client, workspace, renovation, option } = await fixture(), before = await rawRecords(HOMEFORGE_STORE);
  const restore = failWrites(HOMEFORGE_STORE);
  await expect(client.removeVariant(workspace.id, renovation.id, option.id)).rejects.toMatchObject({ name: 'QuotaExceededError' });
  restore(); expect(await rawRecords(HOMEFORGE_STORE)).toEqual(before);
  await expect(client.removeVariant(workspace.id, renovation.id, option.id)).resolves.toBeUndefined();
});

it('removes metadata without migrating pending old-tab geometry or blocking on damaged legacy data', async () => {
  const { client, workspace, renovation, source, option } = await fixture(), upstream = await upstreamBytes();
  const olderTab = JSON.parse(upstream.projects[source.projectId]); olderTab.name = 'Changed in older tab';
  localStorage.setItem('floorplan_projects', JSON.stringify({ [source.projectId]: JSON.stringify(olderTab) }));
  await client.removeVariant(workspace.id, renovation.id, option.id);
  // Backup bypasses migration and observes the exact committed upstream bytes.
  const backup = JSON.parse(await homeforgeBackup());
  expect({ projects: backup.projects, thumbnails: backup.thumbnails, history: backup.history }).toEqual(upstream);
  localStorage.setItem('floorplan_projects', '{damaged older tab');
  await expect(client.removeVariant(workspace.id, renovation.id, option.id)).rejects.toThrow(/missing/i);
});

it.each(['{damaged wrapper', '', '{"schemaVersion":2}', '{"id":"first","id":"second"}', JSON.stringify(createHomeWorkspace('Wrong storage key'))])('archives an unreadable wrapper as opaque backup recovery bytes: %s', async raw => {
  const { client, workspace } = await fixture(), upstream = await upstreamBytes();
  await putRaw(HOMEFORGE_STORE, workspace.id, raw);
  await client.archiveUnreadableWorkspace(workspace.id, raw);
  expect(await client.load(workspace.id)).toBeNull(); expect(await upstreamBytes()).toEqual(upstream);
  const backup = JSON.parse(await homeforgeBackup());
  const archive = JSON.parse(Object.values(backup.recovery)[0] as string);
  expect(archive).toMatchObject({ format: 'openplan3d-recovery', version: 1, metadata: { homeforgeWorkspaces: { [workspace.id]: raw } } });
  const restored = await prepareLibraryRestore(JSON.stringify(backup)).restore();
  expect(restored.workspaces).toEqual([]); expect(restored.recoveryArchives).toBe(1);
});

it('rejects healthy, stale, and missing archive targets without storing recovery records', async () => {
  const { client, workspace } = await fixture(), raw = (await rawRecords(HOMEFORGE_STORE))[workspace.id];
  const projectId = JSON.parse(raw).renovationProjects[0].variants[0].projectId;
  await withDatabase(db => transaction(db, ['projects'], 'readwrite', async tx => { await request(tx.objectStore('projects').delete(projectId)); }));
  await expect(client.archiveUnreadableWorkspace(workspace.id, raw)).rejects.toThrow(/readable|healthy/i);
  await putRaw(HOMEFORGE_STORE, workspace.id, '{new damaged bytes');
  await expect(client.archiveUnreadableWorkspace(workspace.id, '{old damaged bytes')).rejects.toThrow(/changed/);
  await expect(client.archiveUnreadableWorkspace('missing', '{damaged')).rejects.toThrow(/missing/i);
  expect(JSON.parse(await homeforgeBackup()).recovery).toEqual({});
  expect((await rawRecords(HOMEFORGE_STORE))[workspace.id]).toBe('{new damaged bytes');
});

it('bounds archive ID collisions without replacing prior recovery bytes or removing the workspace', async () => {
  const { client, workspace } = await fixture(), raw = '{damaged';
  await putRaw(HOMEFORGE_STORE, workspace.id, raw);
  await putRaw('meta', 'library-recovery:occupied', 'original recovery bytes');
  vi.stubGlobal('crypto', { randomUUID: () => 'occupied' });
  await expect(client.archiveUnreadableWorkspace(workspace.id, raw)).rejects.toThrow(/unique/);
  const backup = JSON.parse(await homeforgeBackup());
  expect(backup.workspaces[workspace.id]).toBe(raw); expect(backup.recovery).toEqual({ occupied: 'original recovery bytes' });
  vi.stubGlobal('crypto', undefined);
  await client.archiveUnreadableWorkspace(workspace.id, raw);
  expect(JSON.parse(await homeforgeBackup()).recovery.occupied).toBe('original recovery bytes');
});

it('rolls back both archive and removal when either write fails, then retries', async () => {
  const { client, workspace } = await fixture(), raw = '{damaged'; await putRaw(HOMEFORGE_STORE, workspace.id, raw);
  // Recovery intentionally bypasses migration, even if inherited localStorage is unreadable.
  localStorage.setItem('floorplan_projects', '{legacy damaged');
  const restore = failWrites('meta');
  await expect(client.archiveUnreadableWorkspace(workspace.id, raw)).rejects.toMatchObject({ name: 'QuotaExceededError' });
  restore();
  const original = IDBObjectStore.prototype.delete;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(function (this: IDBObjectStore, ...args) {
    if (this.name === HOMEFORGE_STORE) throw new DOMException('Full', 'QuotaExceededError');
    return original.apply(this, args);
  });
  await expect(client.archiveUnreadableWorkspace(workspace.id, raw)).rejects.toMatchObject({ name: 'QuotaExceededError' });
  spy.mockRestore();
  const backup = JSON.parse(await homeforgeBackup());
  expect(backup.workspaces[workspace.id]).toBe(raw); expect(backup.recovery).toEqual({});
  await expect(client.archiveUnreadableWorkspace(workspace.id, raw)).resolves.toBeUndefined();
  expect(JSON.parse(await homeforgeBackup()).workspaces).toEqual({});
});
