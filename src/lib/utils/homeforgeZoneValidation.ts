import type { HomeforgeZone } from '$lib/models/homeforgeZone';

export function readHomeforgeZone(_value: unknown): HomeforgeZone {
  const fail = (path: string): never => { throw new Error(`Invalid HOMEFORGE zone: ${path}.`); };
  const obj = (value: unknown, path: string, keys: string[]): Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail(path);
    return value as Record<string, any>;
  };
  const id = (value: unknown, path: string) => { if (typeof value !== 'string' || !value.trim() || value.length > 180) fail(path); };
  const list = (value: unknown, path: string): any[] => { if (!Array.isArray(value)) fail(path); return value as any[]; };
  const choice = (value: unknown, path: string, options: string[]) => { if (!options.includes(value as string)) fail(path); };
  const positive = (value: unknown, path: string) => { if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) fail(path); };
  const date = (owner: Record<string, any>, key: string, path: string) => {
    const value = owner[key];
    if (!(value instanceof Date) && typeof value !== 'string') fail(path);
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime()) || (typeof value === 'string' && value !== parsed.toISOString())) fail(path);
    owner[key] = parsed;
  };
  const unique = (items: any[], path: string) => {
    const ids = new Set<string>();
    for (const item of items) { id(item.id, `${path}.id`); if (ids.has(item.id)) fail(`${path}.id duplicates another record`); ids.add(item.id); }
    return ids;
  };
  let copy: unknown;
  try { copy = structuredClone(_value); } catch { fail('document could not be read'); }
  const zone = obj(copy, 'document', ['schemaVersion', 'workspaceId', 'renovationId', 'sessions', 'evidence', 'features', 'measurements', 'sufficientAt', 'createdAt', 'updatedAt']);
  if (zone.schemaVersion !== 1) fail('schemaVersion');
  id(zone.workspaceId, 'workspaceId'); id(zone.renovationId, 'renovationId');
  date(zone, 'createdAt', 'createdAt'); date(zone, 'updatedAt', 'updatedAt');
  if (zone.updatedAt < zone.createdAt) fail('updatedAt before createdAt');
  if (zone.sufficientAt !== undefined) date(zone, 'sufficientAt', 'sufficientAt');
  const sessions = list(zone.sessions, 'sessions').map((value, i) => {
    const path = `sessions[${i}]`, item = obj(value, path, ['id', 'startedAt', 'endedAt', 'note']);
    date(item, 'startedAt', `${path}.startedAt`);
    if (item.endedAt !== undefined) { date(item, 'endedAt', `${path}.endedAt`); if (item.endedAt < item.startedAt) fail(`${path}.endedAt`); }
    if (item.note !== undefined && typeof item.note !== 'string') fail(`${path}.note`);
    return item;
  });
  const sessionIds = unique(sessions, 'sessions');
  const features = list(zone.features, 'features').map((value, i) => {
    const path = `features[${i}]`, item = obj(value, path, ['id', 'kind', 'label', 'description', 'scope', 'relations', 'bindings']);
    choice(item.kind, `${path}.kind`, ['wall', 'door', 'window', 'stair', 'landing', 'opening', 'other']);
    choice(item.scope, `${path}.scope`, ['context', 'focus']); id(item.label, `${path}.label`);
    if (item.description !== undefined && typeof item.description !== 'string') fail(`${path}.description`);
    list(item.relations, `${path}.relations`).forEach((value, j) => {
      const relation = obj(value, `${path}.relations[${j}]`, ['kind', 'featureId']);
      choice(relation.kind, `${path}.relations[${j}].kind`, ['replaces', 'splitFrom', 'mergedFrom']); id(relation.featureId, `${path}.relations[${j}].featureId`);
    });
    const bindings = list(item.bindings, `${path}.bindings`);
    for (const [j, value] of bindings.entries()) {
      const binding = obj(value, `${path}.bindings[${j}]`, ['variantId', 'floorId', 'kind', 'elementId']);
      for (const key of ['variantId', 'floorId', 'elementId']) id(binding[key], `${path}.bindings[${j}].${key}`);
      choice(binding.kind, `${path}.bindings[${j}].kind`, ['walls', 'doors', 'windows', 'stairs', 'rooms']);
    }
    if (new Set(bindings.map(b => b.variantId)).size !== bindings.length) fail(`${path}.bindings duplicates a variant`);
    return item;
  });
  const featureIds = unique(features, 'features'), labels = new Set<string>();
  for (const feature of features) {
    const label = feature.label.toLocaleLowerCase(); if (labels.has(label)) fail('features.label duplicates another label'); labels.add(label);
    for (const relation of feature.relations) if (!featureIds.has(relation.featureId) || relation.featureId === feature.id) fail('features.relations');
  }
  const evidence = list(zone.evidence, 'evidence').map((value, i) => {
    const path = `evidence[${i}]`, item = obj(value, path, ['id', 'sessionId', 'kind', 'scope', 'name', 'capturedAt', 'featureIds', 'category', 'mimeType', 'sha256', 'byteLength']);
    id(item.sessionId, `${path}.sessionId`); if (!sessionIds.has(item.sessionId)) fail(`${path}.sessionId`);
    choice(item.kind, `${path}.kind`, ['photo', 'plan', 'sketch', 'roomplan', 'note']); choice(item.scope, `${path}.scope`, ['context', 'focus']);
    if (item.category !== undefined) choice(item.category, `${path}.category`, ['overview', 'wall', 'opening', 'detail', 'reference']);
    id(item.name, `${path}.name`); date(item, 'capturedAt', `${path}.capturedAt`);
    for (const featureId of list(item.featureIds, `${path}.featureIds`)) if (!featureIds.has(featureId)) fail(`${path}.featureIds`);
    if (item.kind !== 'note') {
      id(item.mimeType, `${path}.mimeType`); positive(item.byteLength, `${path}.byteLength`);
      if (typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256)) fail(`${path}.sha256`);
    }
    return item;
  });
  const evidenceIds = unique(evidence, 'evidence');
  const measurements = list(zone.measurements, 'measurements').map((value, i) => {
    const path = `measurements[${i}]`, item = obj(value, path, ['id', 'featureId', 'property', 'enteredValue', 'unit', 'valueCm', 'recordedAt', 'source', 'evidenceIds', 'dependencies', 'verified']);
    if (!featureIds.has(item.featureId)) fail(`${path}.featureId`);
    id(item.property, `${path}.property`); positive(item.enteredValue, `${path}.enteredValue`); positive(item.valueCm, `${path}.valueCm`);
    choice(item.unit, `${path}.unit`, ['cm', 'm', 'in', 'ft']);
    choice(item.source, `${path}.source`, ['approximate', 'scan-derived', 'manually measured', 'calculated']);
    date(item, 'recordedAt', `${path}.recordedAt`);
    for (const evidenceId of list(item.evidenceIds, `${path}.evidenceIds`)) if (!evidenceIds.has(evidenceId)) fail(`${path}.evidenceIds`);
    for (const dependency of list(item.dependencies, `${path}.dependencies`)) id(dependency, `${path}.dependencies`);
    if (item.verified !== undefined) {
      const verified = obj(item.verified, `${path}.verified`, ['valueCm', 'geometryFingerprint', 'verifiedAt']);
      positive(verified.valueCm, `${path}.verified.valueCm`); id(verified.geometryFingerprint, `${path}.verified.geometryFingerprint`);
      date(verified, 'verifiedAt', `${path}.verified.verifiedAt`);
    }
    return item;
  });
  const measurementIds = unique(measurements, 'measurements');
  for (const item of measurements) for (const dependency of item.dependencies)
    if (!measurementIds.has(dependency) || dependency === item.id) fail('measurements.dependencies');
  return zone as HomeforgeZone;
}
