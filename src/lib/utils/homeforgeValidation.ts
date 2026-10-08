import type { HomeWorkspace } from '$lib/models/homeforge';

/** Validate and clone untrusted metadata; never infer or repair relationships. */
export function readHomeWorkspace(value: unknown): HomeWorkspace {
  const fail = (path: string, reason: string): never => { throw new Error(`Invalid HOMEFORGE metadata: ${path} ${reason}.`); };
  const record = (value: unknown, path: string, keys: string[]): Record<string, any> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
    for (const key of Object.keys(value as object)) if (!keys.includes(key)) fail(`${path}.${key}`, 'is unsupported');
    return value as Record<string, any>;
  };
  const text = (value: unknown, path: string, nonempty = true) => {
    if (typeof value !== 'string' || (nonempty && !value.trim())) fail(path, 'must be text' + (nonempty ? ' with a nonempty value' : ''));
  };
  const list = (value: unknown, path: string): any[] => {
    if (!Array.isArray(value)) fail(path, 'must be an array');
    return value as any[];
  };
  const dates = (owner: Record<string, any>, path: string) => {
    for (const key of ['createdAt', 'updatedAt']) {
      const value = owner[key];
      // JSON dates must be canonical ISO strings, not permissively parsed prose or numbers.
      if (!(value instanceof Date) && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value))) fail(`${path}.${key}`, 'must be a timestamp');
      const date = new Date(value);
      if (!Number.isFinite(date.getTime()) || (typeof value === 'string' && date.toISOString() !== value)) fail(`${path}.${key}`, 'must be a valid ISO timestamp');
      owner[key] = date;
    }
    if (owner.updatedAt < owner.createdAt) fail(path, 'has updatedAt before createdAt');
  };
  let clone: unknown;
  try { clone = structuredClone(value); } catch { fail('document', 'could not be read'); }
  const workspace = record(clone, 'workspace', ['schemaVersion', 'id', 'name', 'renovationProjects', 'createdAt', 'updatedAt']);
  if (workspace.schemaVersion !== 1) fail('schemaVersion', 'is unsupported');
  text(workspace.id, 'id'); text(workspace.name, 'name'); dates(workspace, 'workspace');
  const renovationIds = new Set<string>();
  for (const [i, input] of list(workspace.renovationProjects, 'renovationProjects').entries()) {
    const path = `renovationProjects[${i}]`;
    const renovation = record(input, path, ['id', 'name', 'description', 'existingVariantId', 'activeVariantId', 'variants', 'createdAt', 'updatedAt']);
    text(renovation.id, `${path}.id`); text(renovation.name, `${path}.name`); dates(renovation, path);
    if (renovationIds.has(renovation.id)) fail(`${path}.id`, 'duplicates another renovation project');
    renovationIds.add(renovation.id);
    if (renovation.description !== undefined) text(renovation.description, `${path}.description`, false);
    text(renovation.existingVariantId, `${path}.existingVariantId`); text(renovation.activeVariantId, `${path}.activeVariantId`);
    const variants = list(renovation.variants, `${path}.variants`), ids = new Set<string>();
    for (const [j, input] of variants.entries()) {
      const variantPath = `${path}.variants[${j}]`;
      const variant = record(input, variantPath, ['id', 'name', 'kind', 'projectId', 'createdFromVariantId', 'baselineProtected', 'createdAt', 'updatedAt']);
      for (const key of ['id', 'name', 'projectId']) text(variant[key], `${variantPath}.${key}`);
      if (ids.has(variant.id)) fail(`${variantPath}.id`, 'duplicates another variant');
      ids.add(variant.id);
      if (!['existing', 'option'].includes(variant.kind)) fail(`${variantPath}.kind`, 'is unsupported');
      if (typeof variant.baselineProtected !== 'boolean') fail(`${variantPath}.baselineProtected`, 'must be a boolean');
      if (variant.createdFromVariantId !== undefined) text(variant.createdFromVariantId, `${variantPath}.createdFromVariantId`);
      dates(variant, variantPath);
    }
    if (variants.filter(v => v.kind === 'existing').length !== 1) fail(`${path}.variants`, 'must contain exactly one Existing variant');
    if (!variants.some(v => v.id === renovation.existingVariantId && v.kind === 'existing')) fail(`${path}.existingVariantId`, 'must reference an existing variant');
    if (!ids.has(renovation.activeVariantId)) fail(`${path}.activeVariantId`, 'must reference a variant');
    for (const variant of variants) if (variant.createdFromVariantId !== undefined && (!ids.has(variant.createdFromVariantId) || variant.createdFromVariantId === variant.id)) fail(`${path}.createdFromVariantId`, 'must reference another variant');
  }
  return workspace as HomeWorkspace;
}
