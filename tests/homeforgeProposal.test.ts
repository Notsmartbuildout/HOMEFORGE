import { beforeEach, expect, it } from 'vitest';
import { roomProject } from './fixtures/project';
import type { HomeforgeZone } from '$lib/models/homeforgeZone';
import { acceptDimensionProposal, prepareDimensionProposal } from '$lib/services/homeforgeProposal';
import { createHomeWorkspace, createHomeforgeStore } from '$lib/services/homeforge';
import { createHomeforgeZoneStore } from '$lib/services/homeforgeZone';
import { localStore } from '$lib/services/datastore';
import { baselineProtection, beginBaselineCorrection, endBaselineCorrection } from '$lib/stores/baselineProtection';
import { currentProject, loadProject, undo } from '$lib/stores/project';
import { markClean } from '$lib/stores/saveStatus';
import { get } from 'svelte/store';
import { failWrites, mockStorage } from './fixtures/indexeddb';

beforeEach(() => { mockStorage(); baselineProtection.set({ projectId: null, correcting: false }); });

function doorProject() {
  const project = roomProject();
  project.floors[0].doors.push({ id: 'door-1', wallId: project.floors[0].walls[0].id, position: 0.5,
    width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false });
  return project;
}

async function savedProposal() {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  const project = doorProject(), renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry', project });
  const zones = createHomeforgeZoneStore(); await zones.ensure(workspace.id, renovation.id);
  const feature = await zones.addFeature(workspace.id, renovation.id, { kind: 'door', label: 'D1', scope: 'focus',
    binding: { variantId: renovation.existingVariantId, floorId: project.floors[0].id, kind: 'doors', elementId: 'door-1' } });
  const measurement = await zones.addMeasurement(workspace.id, renovation.id, { featureId: feature.id, property: 'door.width',
    enteredValue: 36, unit: 'in', source: 'manually measured', evidenceIds: [] });
  const saved = (await localStore.load(project.id))!; loadProject(saved, true); markClean();
  const zone = (await zones.load(workspace.id, renovation.id))!;
  return { project, proposal: prepareDimensionProposal(zone, get(currentProject)!, renovation.existingVariantId, measurement.id) };
}

it('previews a manual door correction with exact evidence and leaves the project untouched', () => {
  const project = doorProject();
  const zone: HomeforgeZone = { schemaVersion: 1, workspaceId: 'home', renovationId: 'entry', sessions: [], evidence: [],
    features: [{ id: 'feature-1', kind: 'door', label: 'D1', scope: 'focus', relations: [], bindings: [
      { variantId: 'existing', floorId: project.floors[0].id, kind: 'doors', elementId: 'door-1' }] }],
    measurements: [{ id: 'measurement-1', featureId: 'feature-1', property: 'door.width', enteredValue: 36, unit: 'in',
      valueCm: 91.44, recordedAt: new Date(), source: 'manually measured', evidenceIds: [], dependencies: [] }],
    createdAt: new Date(), updatedAt: new Date() };
  const before = JSON.stringify(project);
  const proposal = prepareDimensionProposal(zone, project, 'existing', 'measurement-1');
  expect(proposal).toMatchObject({ featureLabel: 'D1', property: 'door.width', beforeCm: 90, afterCm: 91.44, elementId: 'door-1' });
  expect(JSON.stringify(project)).toBe(before);
  zone.measurements[0].source = 'scan-derived';
  zone.sessions.push({ id: 'visit', startedAt: new Date() });
  zone.evidence.push({ id: 'photo', sessionId: 'visit', kind: 'photo', scope: 'focus', name: 'Door.png',
    capturedAt: new Date(), featureIds: ['feature-1'], mimeType: 'image/png', sha256: 'a'.repeat(64), byteLength: 10 });
  zone.measurements[0].evidenceIds = ['photo'];
  expect(() => prepareDimensionProposal(zone, project, 'existing', 'measurement-1')).toThrow(/RoomPlan evidence/i);
});

it('requires correction mode, saves an accepted proposal, and keeps one undo step', async () => {
  const { project, proposal } = await savedProposal();
  await expect(acceptDimensionProposal(proposal)).rejects.toThrow(/correction mode/i);
  expect((await localStore.load(project.id))!.floors[0].doors[0].width).toBe(90);
  beginBaselineCorrection(project.id);
  await acceptDimensionProposal(proposal);
  expect((await localStore.load(project.id))!.floors[0].doors[0].width).toBe(91.44);
  undo();
  expect(get(currentProject)!.floors[0].doors[0].width).toBe(90);
  endBaselineCorrection();
});

it('keeps saved Existing geometry unchanged when an accepted proposal cannot be stored', async () => {
  const { project, proposal } = await savedProposal();
  beginBaselineCorrection(project.id);
  const restore = failWrites('projects');
  await expect(acceptDimensionProposal(proposal)).rejects.toThrow(/not saved/i);
  restore();
  expect((await localStore.load(project.id))!.floors[0].doors[0].width).toBe(90);
  endBaselineCorrection();
});

it('rejects a proposal when its zone sources change before acceptance', async () => {
  const { project, proposal } = await savedProposal();
  const zones = createHomeforgeZoneStore(); await zones.load(proposal.workspaceId, proposal.renovationId);
  await zones.addFeature(proposal.workspaceId, proposal.renovationId, { kind: 'other', label: 'New detail', scope: 'focus' });
  beginBaselineCorrection(project.id);
  await expect(acceptDimensionProposal(proposal)).rejects.toThrow(/sources or geometry changed/i);
  expect((await localStore.load(project.id))!.floors[0].doors[0].width).toBe(90);
  endBaselineCorrection();
});
