import { expect, it } from 'vitest';
import { roomProject } from './fixtures/project';
import type { HomeforgeZone, ZoneMeasurement } from '$lib/models/homeforgeZone';
import { coveragePrompts, geometryFingerprint, geometryValue, measurementStatus } from '$lib/utils/homeforgeCoverage';
import { readHomeforgeZone } from '$lib/utils/homeforgeZoneValidation';

const project = roomProject();
const baselineId = 'existing-variant';
const wall = project.floors[0].walls[0];
const zone: HomeforgeZone = {
  schemaVersion: 1, workspaceId: 'home', renovationId: 'entry', createdAt: new Date(), updatedAt: new Date(),
  sessions: [], evidence: [], measurements: [],
  features: [{ id: 'wall-feature', kind: 'wall', label: 'W1', scope: 'focus', relations: [],
    bindings: [{ variantId: baselineId, floorId: project.floors[0].id, kind: 'walls', elementId: wall.id }] },
    { id: 'stair-feature', kind: 'stair', label: 'S1', scope: 'focus', relations: [], bindings: [] }],
};
const measured: ZoneMeasurement = { id: 'wall-length', featureId: 'wall-feature', property: 'wall.length', enteredValue: 100,
  unit: 'cm', valueCm: 100, recordedAt: new Date(), source: 'manually measured', evidenceIds: [], dependencies: [] };

it('keeps relevant verification current across unrelated edits and marks a changed wall stale', () => {
  const saved = structuredClone(project), current = structuredClone(zone), measurement = structuredClone(measured);
  const fingerprint = geometryFingerprint(current, measurement, saved, baselineId);
  expect(fingerprint).toBeTruthy();
  measurement.verified = { valueCm: 100, geometryFingerprint: fingerprint!, verifiedAt: new Date() };
  current.measurements.push(measurement);
  expect(measurementStatus(current, measurement, saved, baselineId)).toBe('current');
  saved.name = 'Renamed project';
  expect(measurementStatus(current, measurement, saved, baselineId)).toBe('current');
  saved.floors[0].walls[0].end.x += 25;
  expect(measurementStatus(current, measurement, saved, baselineId)).toBe('stale');
});

it('marks calculated measurements stale when a dependency value changes', () => {
  const current = structuredClone(zone), input = { ...structuredClone(measured), featureId: 'stair-feature', property: 'stair.totalRise', valueCm: 280, enteredValue: 280 };
  const saved = structuredClone(project);
  saved.floors[0].stairs.push({ id: 'stair-1', position: { x: 0, y: 0 }, rotation: 0, width: 100, depth: 300, riserCount: 14, direction: 'up', stairType: 'straight' });
  current.features[1].bindings.push({ variantId: baselineId, floorId: saved.floors[0].id, kind: 'stairs', elementId: 'stair-1' });
  const calculated: ZoneMeasurement = { ...structuredClone(measured), id: 'derived', property: 'stair.riserHeight',
    featureId: 'stair-feature', source: 'calculated', dependencies: [input.id], valueCm: 20, enteredValue: 20 };
  current.measurements = [input, calculated];
  expect(geometryValue(current, calculated, saved, baselineId)).toBe(20);
  calculated.verified = { valueCm: 20, geometryFingerprint: geometryFingerprint(current, calculated, saved, baselineId)!, verifiedAt: new Date() };
  expect(measurementStatus(current, calculated, saved, baselineId)).toBe('current');
  input.valueCm = 294;
  expect(geometryValue(current, calculated, saved, baselineId)).toBe(21);
  expect(measurementStatus(current, calculated, saved, baselineId)).toBe('stale');
  input.valueCm = 280; saved.floors[0].stairs[0].riserCount = 10;
  expect(geometryValue(current, calculated, saved, baselineId)).toBe(28);
  expect(measurementStatus(current, calculated, saved, baselineId)).toBe('stale');
  saved.floors[0].stairs[0].riserCount = 14;
  current.measurements.push({ ...input, id: 'new-rise', enteredValue: 294, valueCm: 294 });
  expect(measurementStatus(current, calculated, saved, baselineId)).toBe('stale');
});

it('rejects circular measurement dependencies in saved zone records', () => {
  const first = { ...structuredClone(measured), id: 'a', dependencies: ['b'] };
  const second = { ...structuredClone(measured), id: 'b', dependencies: ['a'] };
  expect(() => readHomeforgeZone({ ...zone, measurements: [first, second] })).toThrow(/cycle/i);
});

it('suggests feature-specific front-entry measurements without a fixed photo count', () => {
  const prompts = coveragePrompts(zone);
  expect(prompts).toContainEqual(expect.objectContaining({ featureId: 'wall-feature', property: 'wall.length', priority: 'needed for useful geometry', met: false }));
  expect(prompts).toContainEqual(expect.objectContaining({ featureId: 'stair-feature', property: 'stair.totalRise', priority: 'needed for useful geometry', met: false }));
  const withMeasurement = { ...zone, measurements: [measured], sufficientAt: new Date() };
  expect(coveragePrompts(withMeasurement).find(item => item.property === 'wall.length')?.met).toBe(true);
  expect(coveragePrompts(withMeasurement).some(item => !item.met)).toBe(true);
});
