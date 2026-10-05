import { beforeEach, expect, it, vi } from 'vitest';
import { createHomeWorkspace, createHomeforgeStore } from '$lib/services/homeforge';
import { createLocalStore } from '$lib/services/datastore';
import { readSnapshotStorage, writeSnapshotStorage } from '$lib/utils/snapshotStorage';
import { mockStorage, putRaw, rawRecords, failWrites } from './fixtures/indexeddb';
import { roomProject } from './fixtures/project';

beforeEach(() => { mockStorage(); });

it('activates only a valid saved target and persists the pointer without changing geometry', async () => {
  const { client, workspace, renovation, source } = await fixture();
  const option = await client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A');
  const before = await rawRecords();
  expect((await client.activateVariant(workspace.id, renovation.id, option.id)).id).toBe(option.projectId);
  const saved = (await createHomeforgeStore().load(workspace.id))!.renovationProjects[0];
  expect(saved.activeVariantId).toBe(option.id); expect(saved.existingVariantId).toBe(source.id);
  expect(await rawRecords()).toEqual(before);
  await putRaw('projects', source.projectId, '{damaged');
  const metadata = await rawRecords('homeforgeWorkspaces');
  await expect(client.activateVariant(workspace.id, renovation.id, source.id)).rejects.toThrow();
  expect(await rawRecords('homeforgeWorkspaces')).toEqual(metadata);
});

it('keeps the old active pointer on target conflicts and failed activation writes', async () => {
  const { client, workspace, renovation, source } = await fixture();
  const option = await client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A');
  const upstream = createLocalStore(), expected = (await upstream.load(option.projectId))!;
  const changed = structuredClone(expected); changed.name = 'Changed elsewhere'; await upstream.save(changed);
  const metadata = await rawRecords('homeforgeWorkspaces');
  await expect(client.activateVariant(workspace.id, renovation.id, option.id, expected)).rejects.toThrow(/changed/);
  expect(await rawRecords('homeforgeWorkspaces')).toEqual(metadata);
  const restore = failWrites('homeforgeWorkspaces');
  await expect(client.activateVariant(workspace.id, renovation.id, option.id)).rejects.toThrow();
  restore(); expect(await rawRecords('homeforgeWorkspaces')).toEqual(metadata);
  expect((await client.load(workspace.id))!.renovationProjects[0].activeVariantId).toBe(source.id);
});
async function fixture() {
  const client = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await client.save(workspace);
  const project = roomProject();
  project.projectPackage = { version: 1, native: { note: 'source' }, mapping: [], assets: { 'assets/photo.png': 'cGhvdG8=' } };
  project.floors[0].walls[0].details = { photos: ['photo.png'], note: 'Measured' };
  const renovation = await client.createRenovationProject(workspace.id, { name: 'Entry', project });
  await putRaw('thumbnails', project.id, 'data:image/png;base64,cGhvdG8=');
  await putRaw('history', project.id, writeSnapshotStorage([{ timestamp: 1, description: 'Measured', data: JSON.stringify(project) }]));
  return { client, workspace, project, renovation, source: renovation.variants[0] };
}

it('clones the complete saved project, assets, thumbnail and history into independent option identities', async () => {
  const { client, workspace, project, renovation, source } = await fixture();
  const before = await rawRecords(), metadata = await rawRecords('homeforgeWorkspaces');
  const option = await client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A', project);
  expect(option).toMatchObject({ name: 'Option A', kind: 'option', baselineProtected: false, createdFromVariantId: source.id });
  expect(option.id).not.toBe(source.id); expect(option.projectId).not.toBe(source.projectId);
  const upstream = createLocalStore(), copy = (await upstream.load(option.projectId))!;
  expect(copy.floors).toEqual(project.floors); expect(copy.projectPackage).toEqual(project.projectPackage);
  expect((await rawRecords())[source.projectId]).toBe(before[source.projectId]);
  expect((await rawRecords('thumbnails'))[option.projectId]).toBe((await rawRecords('thumbnails'))[source.projectId]);
  const snapshots = readSnapshotStorage((await rawRecords('history'))[option.projectId]) as any[];
  expect(JSON.parse(snapshots[0].data).id).toBe(option.projectId);
  expect(JSON.parse(snapshots[0].data).projectPackage.assets).toEqual(project.projectPackage!.assets);
  copy.projectPackage!.assets['assets/photo.png'] = 'Y2hhbmdlZA=='; copy.floors[0].walls[0].start.x += 50;
  await upstream.save(copy);
  expect((await upstream.load(source.projectId))!.projectPackage).toEqual(project.projectPackage);
  expect((await upstream.load(source.projectId))!.floors).toEqual(project.floors);
  const saved = (await client.load(workspace.id))!.renovationProjects[0];
  expect(saved.existingVariantId).toBe(source.id); expect(saved.activeVariantId).toBe(source.id);
  expect(saved.variants).toHaveLength(2); expect(metadata[workspace.id]).not.toBe((await rawRecords('homeforgeWorkspaces'))[workspace.id]);
});

it('supports cloning an option while preserving source provenance and unique IDs', async () => {
  const { client, workspace, renovation, source } = await fixture();
  const a = await client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A');
  const b = await client.cloneVariant(workspace.id, renovation.id, a.id, 'Option B');
  expect(b.createdFromVariantId).toBe(a.id);
  expect(new Set([source.id, a.id, b.id, source.projectId, a.projectId, b.projectId]).size).toBe(6);
  expect((await client.load(workspace.id))!.renovationProjects[0].variants.filter(v => v.kind === 'existing')).toHaveLength(1);
});

it('rejects stale workspace or source revisions without partial copies', async () => {
  const { client, workspace, renovation, source, project } = await fixture();
  const other = createHomeforgeStore(), edited = (await other.load(workspace.id))!;
  edited.name = 'Changed elsewhere'; await other.save(edited);
  const before = await rawRecords();
  await expect(client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A')).rejects.toThrow(/changed/);
  expect(await rawRecords()).toEqual(before);
  await client.load(workspace.id);
  const upstream = createLocalStore(), changed = (await upstream.load(source.projectId))!;
  changed.floors[0].walls[0].start.x += 10; await upstream.save(changed);
  const updated = await rawRecords();
  await expect(client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A', project)).rejects.toThrow(/changed/);
  expect(await rawRecords()).toEqual(updated);
});

it('rolls back geometry, assets and metadata on a late write failure, then retries', async () => {
  const { client, workspace, renovation, source } = await fixture();
  const before = await rawRecords(), metadata = await rawRecords('homeforgeWorkspaces'), history = await rawRecords('history');
  const restore = failWrites('homeforgeWorkspaces');
  await expect(client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A')).rejects.toThrow();
  restore(); expect(await rawRecords()).toEqual(before); expect(await rawRecords('history')).toEqual(history);
  expect(await rawRecords('homeforgeWorkspaces')).toEqual(metadata);
  await expect(client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A')).resolves.toMatchObject({ kind: 'option' });
});

it('rejects missing sources, empty names and unreadable history without repairing records', async () => {
  const { client, workspace, renovation, source } = await fixture(); const before = await rawRecords();
  await expect(client.cloneVariant(workspace.id, renovation.id, 'missing', 'Option A')).rejects.toThrow();
  await expect(client.cloneVariant(workspace.id, renovation.id, source.id, ' ')).rejects.toThrow();
  await putRaw('history', source.projectId, '{damaged');
  await expect(client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A')).rejects.toThrow(/history/i);
  expect(await rawRecords()).toEqual(before); expect((await rawRecords('history'))[source.projectId]).toBe('{damaged');
});

it('bounds ID collisions without overwriting the source', async () => {
  const { client, workspace, renovation, source } = await fixture(), before = await rawRecords();
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(source.projectId as `${string}-${string}-${string}-${string}-${string}`);
  await expect(client.cloneVariant(workspace.id, renovation.id, source.id, 'Option A')).rejects.toThrow(/unique/);
  expect(await rawRecords()).toEqual(before);
});
