import type { RenovationProject } from '$lib/models/homeforge';
import type { HomeforgeZone } from '$lib/models/homeforgeZone';
import type { Project } from '$lib/models/types';
import { geometryValue, measurementStatus } from './homeforgeCoverage';

export function compareZone(zone: HomeforgeZone, renovation: RenovationProject, projects: Record<string, Project | null>) {
  const variants = renovation.variants;
  const features = zone.features.map(feature => ({
    id: feature.id, label: feature.label, kind: feature.kind,
    relations: feature.relations.map(link => `${link.kind} ${zone.features.find(item => item.id === link.featureId)?.label ?? 'unknown feature'}`).join('; '),
    states: variants.map(variant => {
      const binding = feature.bindings.find(item => item.variantId === variant.id);
      const project = projects[variant.projectId];
      if (!project) return 'saved plan unavailable';
      if (!binding) return 'unbound or removed';
      const floor = project.floors.find(item => item.id === binding.floorId);
      if (!floor || !floor[binding.kind].some(item => item.id === binding.elementId)) return 'bound element missing';
      return 'bound';
    })
  }));
  const dimensions = zone.measurements.map(measurement => {
    const feature = zone.features.find(item => item.id === measurement.featureId);
    const existing = renovation.variants.find(item => item.id === renovation.existingVariantId);
    const existingProject = existing && projects[existing.projectId];
    return {
      feature: feature?.label ?? 'Unknown feature', property: measurement.property,
      observed: measurement.enteredValue, unit: measurement.unit, source: measurement.source,
      recordedAt: measurement.recordedAt.toISOString().slice(0, 10),
      status: existingProject ? measurementStatus(zone, measurement, existingProject, renovation.existingVariantId) : 'unavailable',
      evidence: measurement.evidenceIds.map(id => zone.evidence.find(item => item.id === id)?.name ?? 'unavailable file').join('; '),
      values: variants.map(variant => {
        const project = projects[variant.projectId];
        return project && measurement.source !== 'calculated' ? geometryValue(zone, measurement, project, variant.id) : null;
      })
    };
  });
  return { variants, features, dimensions };
}

const cell = (value: string | number) => {
  const raw = String(value);
  const safe = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};

export function comparisonCsv(zoneName: string, comparison: ReturnType<typeof compareZone>): string {
  const rows: (string | number)[][] = [
    ['Zone', 'Feature', 'Relationship', 'Property', 'Observed', 'Unit', 'Source', 'Recorded date', 'Existing verification', 'Evidence',
      ...comparison.variants.flatMap(variant => [`${variant.name} saved cm`, `${variant.name} binding`])],
    ...comparison.dimensions.map(dimension => {
      const feature = comparison.features.find(item => item.label === dimension.feature);
      return [zoneName, dimension.feature, feature?.relations ?? '', dimension.property, dimension.observed, dimension.unit, dimension.source,
        dimension.recordedAt, dimension.status, dimension.evidence,
        ...dimension.values.flatMap((value, index) => [value ?? '', feature?.states[index] ?? 'unavailable'])];
    })
  ];
  return rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
