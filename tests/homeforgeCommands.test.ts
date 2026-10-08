import { expect, it } from 'vitest';
import { roomProject } from './fixtures/project';
import type { HomeforgeZone } from '$lib/models/homeforgeZone';
import { prepareNumericCommand } from '$lib/utils/homeforgeCommands';

it('resolves one exact legend assignment and clarifies ambiguity or unsupported wording', () => {
  const project = roomProject();
  project.floors[0].doors.push({ id: 'door-1', wallId: project.floors[0].walls[0].id, position: 0.5,
    width: 90, height: 210, type: 'single', swingDirection: 'left', flipSide: false });
  const zone: HomeforgeZone = { schemaVersion: 1, workspaceId: 'home', renovationId: 'entry', sessions: [], evidence: [], measurements: [],
    features: [{ id: 'door-feature', kind: 'door', label: 'D1', scope: 'focus', relations: [], bindings: [
      { variantId: 'existing', floorId: project.floors[0].id, kind: 'doors', elementId: 'door-1' }] }],
    createdAt: new Date(), updatedAt: new Date() };
  const proposal = prepareNumericCommand(zone, project, 'existing', 'existing', 'D1 is 36 inches wide.');
  expect(proposal).toMatchObject({ property: 'door.width', beforeCm: 90, afterCm: 91.44,
    featureId: 'door-feature', source: 'numeric command' });
  expect(project.floors[0].doors[0].width).toBe(90);
  expect(() => prepareNumericCommand(zone, project, 'existing', 'existing', 'Remove the wall')).toThrow(/exact dimension/i);
  expect(() => prepareNumericCommand(zone, project, 'existing', 'existing', 'D1 is 36 inches thick.')).toThrow(/not a supported dimension/i);
  expect(() => prepareNumericCommand(zone, project, 'option', 'option', 'D1 is 36 inches wide.')).toThrow(/unbound/i);
  zone.features[0].label = 'Entry door';
  expect(prepareNumericCommand(zone, project, 'existing', 'existing', 'Entry door is 36 inches wide.').featureLabel).toBe('Entry door');
  zone.features[0].label = 'D1';
  zone.features.push({ ...structuredClone(zone.features[0]), id: 'duplicate' });
  expect(() => prepareNumericCommand(zone, project, 'existing', 'existing', 'D1 is 36 inches wide.')).toThrow(/More than one feature/i);
});
