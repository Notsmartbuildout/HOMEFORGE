import type { Project } from '$lib/models/types';
import type { HomeforgeZone, ZoneMeasurement } from '$lib/models/homeforgeZone';
import { wallLength } from './wallEditing';

type Priority = 'needed for useful geometry' | 'recommended' | 'optional';
export type CoveragePrompt = { featureId: string; property: string; priority: Priority; reason: string; met: boolean };

const suggestions: Record<string, [string, Priority, string][]> = {
  wall: [['wall.length', 'needed for useful geometry', 'Sets the measured wall span.'],
    ['wall.height', 'recommended', 'Helps place openings and elevation details.'],
    ['wall.thickness', 'optional', 'Adds detail when wall build-up matters.']],
  door: [['door.width', 'needed for useful geometry', 'Sets the clear opening width.'],
    ['door.height', 'recommended', 'Helps check the elevation.']],
  window: [['window.width', 'needed for useful geometry', 'Sets the window opening width.'],
    ['window.height', 'recommended', 'Helps check the elevation.']],
  stair: [['stair.totalRise', 'needed for useful geometry', 'Needed to describe the change in floor height.'],
    ['stair.width', 'needed for useful geometry', 'Sets the stair span.'],
    ['stair.depth', 'recommended', 'Helps check the stair run.']],
  landing: [['landing.depth', 'recommended', 'Helps check usable space at the stair.']],
};

export function coveragePrompts(zone: HomeforgeZone): CoveragePrompt[] {
  return zone.features.filter(feature => feature.scope === 'focus').flatMap(feature =>
    (suggestions[feature.kind] ?? []).map(([property, priority, reason]) => ({ featureId: feature.id, property,
      priority, reason, met: zone.measurements.some(item => item.featureId === feature.id && item.property === property) })));
}

export function geometryValue(zone: HomeforgeZone, measurement: Pick<ZoneMeasurement, 'featureId' | 'property' | 'source' | 'dependencies'>, project: Project, variantId: string): number | null {
  const feature = zone.features.find(item => item.id === measurement.featureId);
  if (!feature) return null;
  const binding = feature.bindings.find(item => item.variantId === variantId);
  if (!binding) return null;
  const floor = project.floors.find(item => item.id === binding.floorId);
  if (!floor) return null;
  if (measurement.source === 'calculated') {
    if (measurement.property !== 'stair.riserHeight' || binding.kind !== 'stairs' || measurement.dependencies.length !== 1) return null;
    const input = zone.measurements.find(item => item.id === measurement.dependencies[0] && item.featureId === feature.id && item.property === 'stair.totalRise');
    const count = floor.stairs.find(item => item.id === binding.elementId)?.riserCount;
    return input && count && Number.isFinite(count) && count > 0 ? input.valueCm / count : null;
  }
  let value: number | undefined;
  if (binding.kind === 'walls') {
    const wall = floor.walls.find(item => item.id === binding.elementId);
    if (wall) value = measurement.property === 'wall.length' ? wallLength(wall)
      : measurement.property === 'wall.height' ? wall.height
      : measurement.property === 'wall.thickness' ? wall.thickness : undefined;
  } else if (binding.kind === 'doors') {
    const door = floor.doors.find(item => item.id === binding.elementId);
    if (door) value = measurement.property === 'door.width' ? door.width : measurement.property === 'door.height' ? door.height : undefined;
  } else if (binding.kind === 'windows') {
    const window = floor.windows.find(item => item.id === binding.elementId);
    if (window) value = measurement.property === 'window.width' ? window.width : measurement.property === 'window.height' ? window.height : undefined;
  } else if (binding.kind === 'stairs') {
    const stair = floor.stairs.find(item => item.id === binding.elementId);
    if (stair) value = measurement.property === 'stair.width' ? stair.width : measurement.property === 'stair.depth' ? stair.depth : undefined;
  }
  return value === undefined || !Number.isFinite(value) ? null : value;
}

/** Fingerprint only the bound dimension and calculation inputs, not unrelated project edits. */
export function geometryFingerprint(zone: HomeforgeZone, measurement: ZoneMeasurement, project: Project, variantId: string): string | null {
  const dependencies = measurement.dependencies.map(id => zone.measurements.find(item => item.id === id));
  if (dependencies.some(item => !item)) return null;
  const binding = zone.features.find(item => item.id === measurement.featureId)?.bindings.find(item => item.variantId === variantId);
  const value = geometryValue(zone, measurement, project, variantId);
  return !binding || value === null ? null
    : JSON.stringify([binding.floorId, binding.kind, binding.elementId, measurement.property, value,
      dependencies.map(item => [item!.id, item!.valueCm])]);
}

export function measurementStatus(zone: HomeforgeZone, measurement: ZoneMeasurement, project: Project, variantId: string): 'unverified' | 'unavailable' | 'current' | 'stale' {
  if (!measurement.verified) return 'unverified';
  if (measurement.source === 'calculated' && measurement.property === 'stair.riserHeight') {
    const latestRise = zone.measurements.filter(item => item.featureId === measurement.featureId && item.property === 'stair.totalRise').at(-1);
    if (latestRise && !measurement.dependencies.includes(latestRise.id)) return 'stale';
  }
  const fingerprint = geometryFingerprint(zone, measurement, project, variantId);
  return fingerprint === null ? 'unavailable' : fingerprint === measurement.verified.geometryFingerprint ? 'current' : 'stale';
}
