import { beforeEach, expect, it } from 'vitest';
import { createHomeWorkspace, createHomeforgeStore } from '$lib/services/homeforge';
import { readHomeforgeDashboard, resolveExistingProjectId } from '$lib/services/homeforgeDashboard';
import { mockStorage, putRaw } from './fixtures/indexeddb';
import { updateRecord } from '$lib/services/localDatabase';
beforeEach(() => { mockStorage(); });

it('keeps healthy workspaces visible alongside unreadable metadata and reports missing geometry', async () => {
  const client = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await client.save(workspace);
  const renovation = await client.createRenovationProject(workspace.id, { name: 'Entry' }), id = renovation.variants[0].projectId;
  await putRaw('homeforgeWorkspaces', 'broken', '{damaged');
  await updateRecord('projects', id, () => null);
  const state = await readHomeforgeDashboard();
  expect(state.workspaces.map(w => w.id)).toEqual([workspace.id]); expect(state.errors).toHaveLength(1);
  expect(state.projectStatus[id]).toBe('missing');
  await expect(resolveExistingProjectId(workspace.id, renovation.id)).rejects.toThrow(/Existing Conditions/);
});

it('resolves only the exact Existing pointer and rejects malformed or missing relationships', async () => {
  const client = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await client.save(workspace);
  const renovation = await client.createRenovationProject(workspace.id, { name: 'Entry' });
  expect(await resolveExistingProjectId(workspace.id, renovation.id)).toBe(renovation.variants[0].projectId);
  await expect(resolveExistingProjectId(workspace.id, 'missing')).rejects.toThrow(/Existing Conditions/);
  await expect(resolveExistingProjectId('missing', renovation.id)).rejects.toThrow(/Existing Conditions/);
  await putRaw('projects', renovation.variants[0].projectId, '{corrupt');
  expect((await readHomeforgeDashboard()).projectStatus[renovation.variants[0].projectId]).toBe('unreadable');
  await expect(resolveExistingProjectId(workspace.id, renovation.id)).rejects.toThrow(/Existing Conditions/);
});
