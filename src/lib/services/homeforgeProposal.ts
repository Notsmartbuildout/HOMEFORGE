import type { HomeforgeZone } from '$lib/models/homeforgeZone';
import type { Project } from '$lib/models/types';
import type { HomeforgeProposal } from '$lib/models/homeforgeProposal';
import { geometryValue } from '$lib/utils/homeforgeCoverage';
import { get } from 'svelte/store';
import { baselineProtection } from '$lib/stores/baselineProtection';
import { currentProject, setActiveFloor, beginUndoGroup, endUndoGroup, updateWall, updateDoor, updateWindow, updateStair } from '$lib/stores/project';
import { autoSave, saveState } from '$lib/stores/saveStatus';
import { localStore } from './datastore';
import { createHomeforgeZoneStore } from './homeforgeZone';
import { resolveHomeforgeEditorContext } from './homeforgeDashboard';
import { prepareNumericCommand } from '$lib/utils/homeforgeCommands';

const supported = new Set(['wall.thickness', 'door.width', 'door.height',
  'window.width', 'window.height', 'stair.width', 'stair.depth']);

export function prepareDimensionProposal(zone: HomeforgeZone, project: Project, variantId: string, measurementId: string): HomeforgeProposal {
  const measurement = zone.measurements.find(item => item.id === measurementId);
  const feature = zone.features.find(item => item.id === measurement?.featureId);
  const binding = feature?.bindings.find(item => item.variantId === variantId);
  if (!measurement || !feature || !binding || !supported.has(measurement.property) || binding.kind === 'rooms')
    throw new Error('This measurement has no supported Existing dimension to propose.');
  if (measurement.source === 'calculated') throw new Error('Calculated dimensions are reference values, not direct corrections.');
  if (measurement.source === 'scan-derived' && !measurement.evidenceIds.some(id => zone.evidence.some(item => item.id === id && item.kind === 'roomplan')))
    throw new Error('Scan-derived corrections need compatible RoomPlan evidence; an uncalibrated image cannot establish a metric dimension.');
  const beforeCm = geometryValue(zone, measurement, project, variantId);
  if (beforeCm === null || !Number.isFinite(measurement.valueCm) || measurement.valueCm <= 0 || Math.abs(beforeCm - measurement.valueCm) < 1e-6)
    throw new Error('The saved Existing dimension is unavailable or already matches this observation.');
  return { workspaceId: zone.workspaceId, renovationId: zone.renovationId, variantId, targetKind: 'existing', projectId: project.id,
    featureId: feature.id, featureLabel: feature.label, measurementId, evidenceIds: [...measurement.evidenceIds],
    source: measurement.source, property: measurement.property, floorId: binding.floorId,
    kind: binding.kind, elementId: binding.elementId, beforeCm, afterCm: measurement.valueCm,
    projectSnapshot: JSON.stringify(project), zoneSnapshot: JSON.stringify(zone) };
}

/** Accept only a current, explicitly authorized Existing correction through shared editor mutations. */
export async function acceptDimensionProposal(proposal: HomeforgeProposal): Promise<void> {
  const project = get(currentProject), permission = get(baselineProtection);
  if (!project || project.id !== proposal.projectId) throw new Error('The proposal target is no longer open.');
  if (proposal.targetKind === 'existing' && (permission.projectId !== project.id || !permission.correcting))
    throw new Error('Begin Existing Conditions correction mode before accepting a proposal.');
  if (get(saveState) !== 'saved' || JSON.stringify(project) !== proposal.projectSnapshot)
    throw new Error('The editor changed. Save or reload before accepting this proposal.');
  await localStore.assertCurrent(project.id);
  const context = await resolveHomeforgeEditorContext(proposal.workspaceId, proposal.renovationId, proposal.variantId);
  if (context.variant.id !== proposal.variantId || context.variant.projectId !== project.id || context.variant.kind !== proposal.targetKind)
    throw new Error('The Existing Conditions target changed. Reload before accepting.');
  const zoneClient = createHomeforgeZoneStore();
  const zone = await zoneClient.load(proposal.workspaceId, proposal.renovationId);
  if (!zone || JSON.stringify(zone) !== proposal.zoneSnapshot || JSON.stringify(get(currentProject)) !== proposal.projectSnapshot ||
    JSON.stringify(proposal.commandText
      ? prepareNumericCommand(zone, project, proposal.variantId, proposal.targetKind, proposal.commandText)
      : prepareDimensionProposal(zone, project, proposal.variantId, proposal.measurementId!)) !== JSON.stringify(proposal))
    throw new Error('Proposal sources or geometry changed. Review a fresh proposal.');
  for (const evidenceId of proposal.evidenceIds)
    await zoneClient.readEvidenceBytes(proposal.workspaceId, proposal.renovationId, evidenceId);
  const currentPermission = get(baselineProtection);
  if ((proposal.targetKind === 'existing' && (currentPermission.projectId !== project.id || !currentPermission.correcting)) || get(saveState) !== 'saved')
    throw new Error('Correction mode ended or the editor changed. Review a fresh proposal.');
  setActiveFloor(proposal.floorId);
  beginUndoGroup();
  try {
    if (proposal.property === 'wall.thickness') updateWall(proposal.elementId, { thickness: proposal.afterCm });
    else if (proposal.property === 'door.width') updateDoor(proposal.elementId, { width: proposal.afterCm });
    else if (proposal.property === 'door.height') updateDoor(proposal.elementId, { height: proposal.afterCm });
    else if (proposal.property === 'window.width') updateWindow(proposal.elementId, { width: proposal.afterCm });
    else if (proposal.property === 'window.height') updateWindow(proposal.elementId, { height: proposal.afterCm });
    else if (proposal.property === 'stair.width') updateStair(proposal.elementId, { width: proposal.afterCm });
    else if (proposal.property === 'stair.depth') updateStair(proposal.elementId, { depth: proposal.afterCm });
  } finally { endUndoGroup(`Accepted ${proposal.featureLabel} ${proposal.property} proposal`); }
  const changed = get(currentProject);
  const dimension = { featureId: proposal.featureId, property: proposal.property, source: 'manually measured' as const, dependencies: [] };
  if (!changed || geometryValue(zone, dimension, changed, proposal.variantId) !== proposal.afterCm)
    throw new Error('The editor could not apply this dimension. Review the target and retry.');
  if (!await autoSave() || get(saveState) !== 'saved')
    throw new Error('The proposed edit remains visible but was not saved. Resolve the save error before leaving the editor.');
}
