import { beforeEach, expect, it, vi } from 'vitest';
import { IDBObjectStore } from 'fake-indexeddb';
import { get } from 'svelte/store';
import { createHomeWorkspace, createHomeforgeStore } from '$lib/services/homeforge';
import { createLocalStore, localStore } from '$lib/services/datastore';
import { initAutoSave, markClean, saveState, autoSave } from '$lib/stores/saveStatus';
import { alignElements } from '$lib/utils/alignment';
import { isProtectedBaseline } from '$lib/services/homeforgeReferences';
import { baselineProtection, beginBaselineCorrection, endBaselineCorrection } from '$lib/stores/baselineProtection';
import { currentProject, loadProject, updateProjectName, addWall, moveWallEndpoint, addFloor, setActiveFloor, undo, createDefaultFloor, commitItemDetails, importFloorIntoCurrentProject } from '$lib/stores/project';
import { restoreSnapshot, saveSnapshot, deleteAllSnapshots } from '$lib/stores/versionHistory';
import { mockStorage, rawRecords, putRaw } from './fixtures/indexeddb';
import { PROJECTS_STORAGE_KEY } from '$lib/services/localDatabase';
import { roomProject } from './fixtures/project';

beforeEach(() => { mockStorage(); baselineProtection.set({ projectId: null, correcting: false }); });

async function fixture() {
  const client = createHomeforgeStore(), workspace = createHomeWorkspace('Home');
  await client.save(workspace);
  const project = roomProject(); project.floors.push(createDefaultFloor(1));
  const renovation = await client.createRenovationProject(workspace.id, { name: 'Entry', project });
  const store = createLocalStore(), saved = (await store.load(project.id))!;
  loadProject(saved, await isProtectedBaseline(project.id));
  return { client, workspace, renovation, store, saved };
}

it('blocks shared mutations, history and writable callbacks without changing published geometry', async () => {
  const { saved } = await fixture();
  const before = JSON.stringify(get(currentProject));
  updateProjectName('Accidental'); addWall({ x: 0, y: 0 }, { x: 90, y: 0 });
  moveWallEndpoint(saved.floors[0].walls[0].id, 'start', { x: 999, y: 999 });
  addFloor(); undo();
  alignElements(new Set(saved.floors[0].walls.map(w => w.id)), 'align-left');
  importFloorIntoCurrentProject(saved.floors[0]);
  expect(() => commitItemDetails(get(currentProject)!, { ...saved, name: 'Details bypass' }, 'Changed details')).toThrow(/protected/i);
  let called = false; currentProject.update(p => { called = true; return p; });
  currentProject.set({ ...saved, name: 'Bypass' });
  expect(called).toBe(false); expect(JSON.stringify(get(currentProject))).toBe(before);
  expect(() => { get(currentProject)!.floors[0].walls.push(saved.floors[0].walls[0]); }).toThrow();
  expect(await saveSnapshot(saved, 'Blocked')).toBe(false);
  await putRaw('history', saved.id, JSON.stringify([{ timestamp: Date.now(), description: 'Old', data: JSON.stringify({ ...saved, name: 'Old' }) }]));
  expect(await restoreSnapshot(saved.id, 0)).toBe(false);
  await expect(deleteAllSnapshots(saved.id)).rejects.toThrow(/protected/i);
  expect(JSON.stringify(get(currentProject))).toBe(before);
});

it('does not autosave protected view changes or falsely mark pending edits as saved', async () => {
  const { saved } = await fixture(); markClean();
  const stop = initAutoSave(), spy = vi.spyOn(localStore, 'save').mockResolvedValue();
  try {
    setActiveFloor(saved.floors[1].id);
    expect(get(saveState)).toBe('saved'); expect(await autoSave()).toBe(true);
    saveState.set('unsaved'); expect(await autoSave()).toBe(false);
    expect(get(saveState)).toBe('unsaved'); expect(spy).not.toHaveBeenCalled();
  } finally { stop(); spy.mockRestore(); }
});

it('rechecks correction authorization after awaited metadata reads and detaches old editable aliases', async () => {
  const { store, saved } = await fixture();
  const before = await rawRecords();
  beginBaselineCorrection(saved.id); updateProjectName('Pending');
  const edited = get(currentProject)!;
  const original = IDBObjectStore.prototype.getAll;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'getAll').mockImplementation(function(this: IDBObjectStore, ...args) {
    const req = original.apply(this, args);
    if (this.name === 'homeforgeWorkspaces') req.addEventListener('success', () => endBaselineCorrection());
    return req;
  });
  await expect(store.save(edited)).rejects.toThrow(/protected/i); spy.mockRestore();
  expect(await rawRecords()).toEqual(before);
  edited.floors[0].walls[0].start.x += 1000;
  expect(get(currentProject)!.floors[0].walls[0].start).not.toEqual(edited.floors[0].walls[0].start);
});

it('allows view-only floor navigation, explicit corrections and independent options', async () => {
  const { client, workspace, renovation, store, saved } = await fixture();
  const before = await rawRecords();
  setActiveFloor(saved.floors[1].id);
  expect(get(currentProject)!.activeFloorId).toBe(saved.floors[1].id);
  expect(await rawRecords()).toEqual(before);
  beginBaselineCorrection(saved.id); updateProjectName('Corrected');
  await store.save(get(currentProject)!); endBaselineCorrection();
  updateProjectName('Blocked'); expect(get(currentProject)!.name).toBe('Corrected');
  const option = await client.cloneVariant(workspace.id, renovation.id, renovation.existingVariantId, 'Option A');
  loadProject((await store.load(option.projectId))!, await isProtectedBaseline(option.projectId));
  updateProjectName('Editable option'); await store.save(get(currentProject)!);
  expect((await store.load(saved.id))!.name).toBe('Corrected');
  expect((await store.load(option.projectId))!.name).toBe('Editable option');
});

it('enforces persisted baseline references for standalone saves and expires correction on loading', async () => {
  const { store, saved } = await fixture();
  saved.name = 'Bypass';
  await expect(store.save(saved)).rejects.toThrow(/protected/i);
  beginBaselineCorrection(saved.id); loadProject(saved, true);
  await expect(store.save(saved)).rejects.toThrow(/protected/i);
  const before = await rawRecords();
  await putRaw('homeforgeWorkspaces', 'damaged', '{broken');
  await expect(store.save(saved)).rejects.toThrow(/metadata/i);
  expect(await rawRecords()).toEqual(before);
});

it('preserves an adopted baseline when an older tab updates its recovery copy', async () => {
  const data = mockStorage(), project = roomProject();
  data.set(PROJECTS_STORAGE_KEY, JSON.stringify({ [project.id]: JSON.stringify(project) }));
  const store = createLocalStore(); await store.load(project.id);
  project.name = 'First old-tab edit';
  data.set(PROJECTS_STORAGE_KEY, JSON.stringify({ [project.id]: JSON.stringify(project) }));
  const recovery = (await store.list()).find(p => p.id !== project.id)!;
  const client = createHomeforgeStore(), workspace = createHomeWorkspace('Home');
  await client.save(workspace); await client.createRenovationProject(workspace.id, { name: 'Entry', projectId: recovery.id });
  const protectedRaw = (await rawRecords())[recovery.id];
  project.name = 'Second old-tab edit';
  data.set(PROJECTS_STORAGE_KEY, JSON.stringify({ [project.id]: JSON.stringify(project) }));
  expect(await store.list()).toHaveLength(3);
  expect((await rawRecords())[recovery.id]).toBe(protectedRaw);
});
