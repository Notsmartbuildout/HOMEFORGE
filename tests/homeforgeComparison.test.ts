import { expect, it } from 'vitest';
import { roomProject } from './fixtures/project';
import type { HomeforgeZone } from '$lib/models/homeforgeZone';
import type { RenovationProject } from '$lib/models/homeforge';
import { compareZone, comparisonCsv } from '$lib/utils/homeforgeComparison';

it('compares a replaced opening without inventing an option measurement and exports stale provenance', () => {
  const existing = roomProject(), option = structuredClone(existing);
  existing.id = 'existing-project'; option.id = 'option-project';
  const door = { id: 'door-1', wallId: existing.floors[0].walls[0].id, position: 0.5,
    width: 95, height: 210, type: 'single' as const, swingDirection: 'left' as const, flipSide: false };
  existing.floors[0].doors.push(door);
  option.floors[0].doors.push({ ...door, id: 'door-2', width: 100 });
  const now = new Date('2026-10-08T12:00:00Z');
  const renovation: RenovationProject = { id: 'entry', name: 'Entry', existingVariantId: 'existing', activeVariantId: 'existing',
    variants: [{ id: 'existing', name: 'Existing Conditions', kind: 'existing', projectId: existing.id, baselineProtected: true, createdAt: now, updatedAt: now },
      { id: 'option', name: 'Option A', kind: 'option', projectId: option.id, baselineProtected: false, createdAt: now, updatedAt: now }],
    createdAt: now, updatedAt: now };
  const zone: HomeforgeZone = { schemaVersion: 1, workspaceId: 'home', renovationId: 'entry', sessions: [], evidence: [], sufficientAt: now,
    features: [{ id: 'd1', kind: 'door', label: 'D1', scope: 'focus', relations: [], bindings: [
      { variantId: 'existing', floorId: existing.floors[0].id, kind: 'doors', elementId: 'door-1' }] },
      { id: 'd2', kind: 'door', label: 'D2', scope: 'focus', relations: [{ kind: 'replaces', featureId: 'd1' }], bindings: [
        { variantId: 'option', floorId: option.floors[0].id, kind: 'doors', elementId: 'door-2' }] }],
    measurements: [{ id: 'm1', featureId: 'd1', property: 'door.width', enteredValue: 36, unit: 'in', valueCm: 91.44,
      source: 'manually measured', recordedAt: now, evidenceIds: [], dependencies: [],
      verified: { valueCm: 90, geometryFingerprint: 'earlier geometry', verifiedAt: now } }], createdAt: now, updatedAt: now };
  const comparison = compareZone(zone, renovation, { [existing.id]: existing, [option.id]: option });
  expect(comparison.features.map(item => item.states)).toEqual([['bound', 'unbound or removed'], ['unbound or removed', 'bound']]);
  expect(comparison.features[1].relations).toBe('replaces D1');
  expect(comparison.dimensions[0]).toMatchObject({ status: 'stale', observed: 36, source: 'manually measured', values: [95, null] });
  const csv = comparisonCsv('=Entry', comparison);
  expect(csv).toContain('"\'=Entry"');
  expect(comparisonCsv('  =Entry', comparison)).toContain('"\'  =Entry"');
  expect(csv).toContain('"stale"');
  expect(csv).toContain('"95"');
  expect(csv).toContain('"unbound or removed"');
  zone.features[0].bindings.push({ variantId: 'option', floorId: option.floors[0].id, kind: 'doors', elementId: 'removed-door' });
  expect(compareZone(zone, renovation, { [existing.id]: existing, [option.id]: option }).features[0].states[1]).toBe('bound element missing');
  expect(compareZone(zone, renovation, { [existing.id]: existing, [option.id]: null }).features[0].states[1]).toBe('saved plan unavailable');
  for (const project of [existing, option]) project.floors[0].stairs.push({ id: 'stair-1', position: { x: 100, y: 100 },
    rotation: 0, width: 100, depth: 300, riserCount: 14, direction: 'up', stairType: 'straight' });
  zone.features.push({ id: 's1', kind: 'stair', label: 'S1', scope: 'focus', relations: [], bindings: renovation.variants.map(variant =>
    ({ variantId: variant.id, floorId: existing.floors[0].id, kind: 'stairs', elementId: 'stair-1' })) });
  zone.measurements.push({ id: 'rise', featureId: 's1', property: 'stair.totalRise', enteredValue: 280, unit: 'cm', valueCm: 280,
    source: 'manually measured', recordedAt: now, evidenceIds: [], dependencies: [] },
  { id: 'riser', featureId: 's1', property: 'stair.riserHeight', enteredValue: 20, unit: 'cm', valueCm: 20,
    source: 'calculated', recordedAt: now, evidenceIds: [], dependencies: ['rise'] });
  expect(compareZone(zone, renovation, { [existing.id]: existing, [option.id]: option }).dimensions.at(-1)?.values).toEqual([null, null]);
});
