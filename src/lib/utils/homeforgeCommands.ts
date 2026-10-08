import type { HomeforgeZone } from '$lib/models/homeforgeZone';
import type { Project } from '$lib/models/types';
import type { HomeforgeProposal } from '$lib/models/homeforgeProposal';
import { geometryValue } from './homeforgeCoverage';

const units: Record<string, number> = { cm: 1, centimeter: 1, centimeters: 1, m: 100, meter: 100, meters: 100,
  in: 2.54, inch: 2.54, inches: 2.54, ft: 30.48, foot: 30.48, feet: 30.48 };
const properties: Record<string, Record<string, string>> = {
  wall: { thick: 'wall.thickness' }, door: { wide: 'door.width', high: 'door.height' },
  window: { wide: 'window.width', high: 'window.height' }, stair: { wide: 'stair.width', deep: 'stair.depth' }
};

/** Only a single exact numeric assignment is accepted; all other wording gets a clarification. */
export function prepareNumericCommand(zone: HomeforgeZone, project: Project, variantId: string,
  targetKind: 'existing' | 'option', text: string): HomeforgeProposal {
  if (text.length > 300) throw new Error('Use one short exact dimension command.');
  const match = /^\s*(.+?)\s+is\s+(\d+(?:\.\d+)?)\s*(cm|centimeters?|m|meters?|in|inches?|ft|foot|feet)\s+(wide|high|thick|deep)\.?\s*$/i.exec(text);
  if (!match) throw new Error('Use one exact dimension, such as “D1 is 36 inches wide.” Structural or multi-feature changes need separate review.');
  const [, label, rawValue, unit, adjective] = match;
  const matches = zone.features.filter(item => item.label.toLocaleLowerCase() === label.trim().toLocaleLowerCase());
  if (matches.length !== 1) throw new Error(matches.length ? 'More than one feature has that label. Choose a unique label.' : 'That feature label is unknown. Choose a label from the legend.');
  const feature = matches[0], property = properties[feature.kind]?.[adjective.toLowerCase()];
  if (!property) throw new Error(`“${adjective}” is not a supported dimension for ${feature.label}. Use a shown numeric property.`);
  const binding = feature.bindings.find(item => item.variantId === variantId);
  if (!binding || binding.kind === 'rooms') throw new Error(`${feature.label} is unbound in this design. Review its feature match first.`);
  const afterCm = Number(rawValue) * units[unit.toLowerCase()];
  const dimension = { featureId: feature.id, property, source: 'manually measured' as const, dependencies: [] };
  const beforeCm = geometryValue(zone, dimension, project, variantId);
  if (!Number.isFinite(afterCm) || afterCm <= 0 || beforeCm === null || Math.abs(afterCm - beforeCm) < 1e-6)
    throw new Error('Choose a positive dimension that differs from the saved design.');
  return { workspaceId: zone.workspaceId, renovationId: zone.renovationId, variantId, targetKind, projectId: project.id,
    featureId: feature.id, featureLabel: feature.label, measurementId: null, evidenceIds: [], source: 'numeric command', commandText: text,
    property, floorId: binding.floorId, kind: binding.kind, elementId: binding.elementId, beforeCm, afterCm,
    projectSnapshot: JSON.stringify(project), zoneSnapshot: JSON.stringify(zone) };
}
