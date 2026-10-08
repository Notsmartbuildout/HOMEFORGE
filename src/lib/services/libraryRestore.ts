import { parseBackup } from '$lib/utils/parseBackup';
import { readProject } from '$lib/utils/projectValidation';
import { readSnapshotStorage, writeSnapshotStorage } from '$lib/utils/snapshotStorage';
import { readHomeWorkspace } from '$lib/utils/homeforgeValidation';
import type { HomeWorkspace } from '$lib/models/homeforge';
import type { HomeforgeZone } from '$lib/models/homeforgeZone';
import { readHomeforgeZone } from '$lib/utils/homeforgeZoneValidation';
import { HOMEFORGE_EVIDENCE_ASSET_STORE, HOMEFORGE_ZONE_STORE, migrateLegacy, notifyLibraryChange, request, transaction, withDatabase } from './localDatabase';

type StringMap = Record<string, string>;
type Version = { timestamp: number; description: string; data: string; [key: string]: unknown };
type PreparedProject = { sourceId: string; raw: string; thumbnail?: string; versions: Version[] };
export type RestoreEntry = Readonly<{ id: string; name: string; restorable: boolean; versions: number; warnings: readonly string[] }>;
export type RestoreResult = Readonly<{ projects: readonly { id: string; name: string }[]; recoveryArchives: number; workspaces?: readonly { id: string; name: string }[] }>;
export interface LibraryRestorePreview {
  readonly entries: readonly RestoreEntry[];
  readonly projectCount: number;
  readonly workspaceCount?: number;
  readonly recoveryArchives: number;
  readonly warnings: readonly string[];
  restore(signal?: AbortSignal): Promise<RestoreResult>;
}

const newId = () => globalThis.crypto?.randomUUID?.() ?? `restore-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function stringMap(value: unknown, label: string): StringMap {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(raw => typeof raw !== 'string')) {
    throw new Error(`${label} must contain project IDs and saved text. No projects were restored.`);
  }
  return Object.assign(Object.create(null), value);
}

/** Pure validation and preview. Private serialized candidates cannot be changed by
 * UI state while restoration waits for a transaction. No database access here.
 */
export function prepareLibraryRestore(raw: string, sourceName = 'Library backup', suffix = 'Restored copy'): LibraryRestorePreview {
  const copyName = (name: string) => `${name || 'Untitled Project'} (${suffix})`;
  const data = parseBackup(raw);
  const homeforge = data.format === 'homeforge-library';
  const bundle = data.format === 'openplan3d-library' || homeforge;
  if (bundle && !(data.version === 1 || (homeforge && data.version === 2))) throw new Error('This library backup version is not supported. No projects were restored.');
  const projects = stringMap(bundle ? data.projects : data, 'The project library');
  const thumbnails = stringMap(bundle ? data.thumbnails ?? {} : {}, 'Thumbnails');
  const history = stringMap(bundle ? data.history ?? {} : {}, 'Version history');
  const recovery = stringMap(bundle ? data.recovery ?? {} : {}, 'Recovery archives');
  const retainedProjects: StringMap = Object.create(null), retainedThumbnails: StringMap = Object.create(null), retainedHistory: StringMap = Object.create(null);
  const candidates: PreparedProject[] = [], entries: RestoreEntry[] = [], warnings: string[] = [];
  for (const [id, projectRaw] of Object.entries(projects)) {
    const notes: string[] = [];
    let project;
    try {
      project = readProject(JSON.parse(projectRaw));
      if (project.id !== id) throw new Error('The project ID does not match its library entry.');
    } catch (error) {
      retainedProjects[id] = projectRaw;
      entries.push(Object.freeze({ id, name: id, restorable: false, versions: 0,
        warnings: Object.freeze([error instanceof SyntaxError ? 'This saved project is not readable JSON.' : error instanceof Error ? error.message : 'This project could not be read.']) }));
      continue;
    }
    let versions: Version[] = [];
    if (history[id] !== undefined) {
      let damaged = 0;
      try {
        const snapshots = readSnapshotStorage(history[id]) as any[];
        if (!Array.isArray(snapshots)) throw new Error();
        for (const item of snapshots) {
          try {
            if (!item || typeof item.timestamp !== 'number' || !Number.isFinite(item.timestamp) ||
                typeof item.description !== 'string' || typeof item.data !== 'string') throw new Error();
            const version = readProject(JSON.parse(item.data));
            if (version.id !== id) throw new Error();
            versions.push({ ...item, data: JSON.stringify(version) });
          } catch { damaged++; }
        }
        if (damaged) notes.push(`${damaged} damaged version${damaged === 1 ? '' : 's'} kept for recovery.`);
        if (versions.length > 10) notes.push('The latest 10 valid versions will be restored; the full history is kept for recovery.');
        if (damaged || versions.length > 10) retainedHistory[id] = history[id];
        versions = versions.slice(-10);
      } catch {
        retainedHistory[id] = history[id];
        notes.push('Unreadable version history kept for recovery.');
      }
    }
    let thumbnail: string | undefined;
    if (thumbnails[id] !== undefined) {
      if (/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]*={0,2}$/.test(thumbnails[id])) thumbnail = thumbnails[id];
      else { retainedThumbnails[id] = thumbnails[id]; notes.push('Unsupported preview image kept for recovery.'); }
    }
    candidates.push({ sourceId: id, raw: JSON.stringify(project), thumbnail, versions });
    entries.push(Object.freeze({ id, name: project.name || 'Untitled Project', restorable: true, versions: versions.length, warnings: Object.freeze(notes) }));
  }
  const restorableIds = new Set(candidates.map(p => p.sourceId));
  const restorableProjects = new Map(candidates.map(item => [item.sourceId, readProject(JSON.parse(item.raw))]));
  const workspaceCandidates: HomeWorkspace[] = [];
  const retainedWorkspaces: StringMap = Object.create(null);
  if (homeforge) {
    const workspaces = stringMap(data.workspaces, 'HOMEFORGE workspaces');
    for (const [id, raw] of Object.entries(workspaces)) {
      try {
        const workspace = readHomeWorkspace(parseBackup(raw));
        if (workspace.id !== id) throw new Error('Workspace ID does not match its entry');
        if (workspace.renovationProjects.some(r => r.variants.some(v => !restorableIds.has(v.projectId)))) throw new Error('Missing or unreadable upstream project');
        workspaceCandidates.push(workspace);
      } catch {
        retainedWorkspaces[id] = raw;
        warnings.push(`Workspace ${id} has unreadable metadata or unavailable projects and will be kept for recovery.`);
      }
    }
  }
  const zoneCandidates: { raw: string; zone: HomeforgeZone; assets: Map<string, Uint8Array> }[] = [];
  const retainedZones: StringMap = Object.create(null);
  const evidenceAssets = homeforge && data.version === 2 ? stringMap(data.evidenceAssets, 'HOMEFORGE evidence assets') : {};
  const retainedEvidenceAssets: StringMap = Object.assign(Object.create(null), evidenceAssets);
  if (homeforge && data.version === 2) {
    const zones = stringMap(data.zones, 'HOMEFORGE zones');
    for (const [key, raw] of Object.entries(zones)) {
      try {
        const zone = readHomeforgeZone(parseBackup(raw));
        if (key !== JSON.stringify([zone.workspaceId, zone.renovationId])) throw new Error('Zone key mismatch');
        const workspace = workspaceCandidates.find(item => item.id === zone.workspaceId);
        const renovation = workspace?.renovationProjects.find(item => item.id === zone.renovationId);
        if (!renovation || zone.features.some(feature => feature.bindings.some(binding => {
          const variant = renovation.variants.find(item => item.id === binding.variantId);
          const floor = variant && restorableProjects.get(variant.projectId)?.floors.find(item => item.id === binding.floorId);
          return !floor?.[binding.kind].some(item => item.id === binding.elementId);
        })))
          throw new Error('Zone relationships unavailable');
        const assets = new Map<string, Uint8Array>();
        for (const item of zone.evidence) if (item.kind !== 'note') {
          const assetKey = JSON.stringify([zone.workspaceId, zone.renovationId, item.id]);
          const encoded = evidenceAssets[assetKey];
          if (typeof encoded !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new Error('Missing or unreadable evidence bytes');
          const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
          if (bytes.length !== item.byteLength) throw new Error('Evidence length mismatch');
          assets.set(assetKey, bytes);
        }
        zoneCandidates.push({ raw, zone, assets });
        for (const assetKey of assets.keys()) delete retainedEvidenceAssets[assetKey];
      } catch {
        retainedZones[key] = raw;
        warnings.push(`Zone ${key} has unreadable metadata or unavailable evidence and will be kept for recovery.`);
      }
    }
  }
  for (const [id, raw] of Object.entries(history)) if (!restorableIds.has(id)) retainedHistory[id] = raw;
  for (const [id, raw] of Object.entries(thumbnails)) if (!restorableIds.has(id)) retainedThumbnails[id] = raw;
  const unavailable = entries.length - candidates.length;
  if (unavailable) warnings.push(`${unavailable} damaged project${unavailable === 1 ? '' : 's'} will be kept for recovery instead of opened.`);
  const orphans = new Set([...Object.keys(history), ...Object.keys(thumbnails)].filter(id => !Object.hasOwn(projects, id))).size;
  if (orphans) warnings.push(`Attachments for ${orphans} missing project${orphans === 1 ? '' : 's'} will be kept for recovery.`);
  // Carry prior recovery archives as flat opaque records, never nest an entire
  // backup within its next backup or reactivate deleted legacy projects.
  const archives = Object.entries(recovery).map(([id, raw]) => ({ id, raw }));
  const metadata = bundle ? Object.fromEntries(Object.entries(data).filter(([key]) =>
    !['format', 'version', 'projects', 'thumbnails', 'history', 'recovery', ...(homeforge ? ['workspaces', 'zones', 'evidenceAssets'] : [])].includes(key))) : {};
  if (Object.keys(retainedWorkspaces).length) metadata.homeforgeWorkspaces = retainedWorkspaces;
  if (Object.keys(retainedZones).length) metadata.homeforgeZones = retainedZones;
  if (Object.keys(retainedEvidenceAssets).length) metadata.homeforgeEvidenceAssets = retainedEvidenceAssets;
  const legacy = metadata.legacy;
  if (legacy && typeof legacy === 'object' && !Array.isArray(legacy) && Object.values(legacy).every(snapshot =>
      snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) && Object.keys(snapshot).length === 0)) delete metadata.legacy;
  if (Object.keys(retainedProjects).length || Object.keys(retainedHistory).length || Object.keys(retainedThumbnails).length || Object.keys(metadata).length) {
    archives.push({ id: newId(), raw: JSON.stringify({ format: 'openplan3d-recovery', version: 1, sourceName,
      projects: retainedProjects, history: retainedHistory, thumbnails: retainedThumbnails, metadata }) });
  }
  if (archives.length) warnings.push(`${archives.length} recovery archive${archives.length === 1 ? '' : 's'} will be included in future library backups.`);

  let active: Promise<RestoreResult> | undefined, completed: RestoreResult | undefined;
  const restore = (signal?: AbortSignal): Promise<RestoreResult> => {
    if (completed) return Promise.resolve(completed);
    if (active) return active;
    if (signal?.aborted) return Promise.reject(new DOMException('Restore cancelled.', 'AbortError'));
    if (!candidates.length && !workspaceCandidates.length && !archives.length) return Promise.reject(new Error('This backup contains no projects or recovery data.'));
    active = (async () => {
      const restorableZones = [] as typeof zoneCandidates, restoreArchives = [...archives];
      for (const candidate of zoneCandidates) {
        let damaged = false;
        for (const item of candidate.zone.evidence) if (item.kind !== 'note') {
          const bytes = candidate.assets.get(JSON.stringify([candidate.zone.workspaceId, candidate.zone.renovationId, item.id]))!;
          const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes)));
          if ([...hash].map(byte => byte.toString(16).padStart(2, '0')).join('') !== item.sha256) damaged = true;
        }
        if (damaged) {
          const zoneKey = JSON.stringify([candidate.zone.workspaceId, candidate.zone.renovationId]);
          restoreArchives.push({ id: newId(), raw: JSON.stringify({ format: 'openplan3d-recovery', version: 1, sourceName,
            projects: {}, history: {}, thumbnails: {}, metadata: {
              homeforgeZones: { [zoneKey]: candidate.raw },
              homeforgeEvidenceAssets: Object.fromEntries([...candidate.assets.keys()].map(key => [key, evidenceAssets[key]])),
            } }) });
        } else restorableZones.push(candidate);
      }
      return withDatabase(db => transaction(db, ['projects', 'thumbnails', 'history', 'meta', 'homeforgeWorkspaces', HOMEFORGE_ZONE_STORE, HOMEFORGE_EVIDENCE_ASSET_STORE], 'readwrite', async tx => {
      await migrateLegacy(tx, true);
      const saved: { id: string; name: string }[] = [];
      const projectIds = new Map<string, string>();
      const store = tx.objectStore('projects');
      for (const candidate of candidates) {
        let id: string, attempts = 0;
        do {
          if (++attempts > 5) throw new Error('Could not choose a restored project ID. Try restoring again.');
          id = newId();
        } while (await request(store.get(id)) !== undefined || Object.hasOwn(projects, id));
        const project = JSON.parse(candidate.raw);
        project.id = id; project.name = copyName(project.name); project.updatedAt = new Date();
        await request(store.add(JSON.stringify(project), id));
        if (candidate.thumbnail) await request(tx.objectStore('thumbnails').add(candidate.thumbnail, id));
        if (candidate.versions.length) {
          const versions = candidate.versions.map(item => {
            const project = JSON.parse(item.data);
            project.id = id; project.name = copyName(project.name);
            return { ...item, data: JSON.stringify(project) };
          });
          await request(tx.objectStore('history').add(writeSnapshotStorage(versions), id));
        }
        saved.push({ id, name: project.name });
        projectIds.set(candidate.sourceId, id);
      }
      const savedWorkspaces: { id: string; name: string }[] = [];
      if (homeforge) {
        const metadataStore = tx.objectStore('homeforgeWorkspaces');
        const used = new Set([...Object.keys(projects), ...saved.map(p => p.id)]);
        const workspaceIds = new Map<string, string>(), renovationIds = new Map<string, string>(), variantIds = new Map<string, string>();
        // Reserve both source and current wrapper IDs, including nested identities.
        const reserve = (workspace: HomeWorkspace) => {
          used.add(workspace.id);
          for (const r of workspace.renovationProjects) { used.add(r.id); for (const v of r.variants) used.add(v.id); }
        };
        for (const workspace of workspaceCandidates) reserve(workspace);
        for (const { zone } of restorableZones) {
          for (const item of [...zone.sessions, ...zone.evidence, ...zone.features, ...zone.measurements]) used.add(item.id);
        }
        const existingKeys = await request(metadataStore.getAllKeys()), existingValues = await request(metadataStore.getAll());
        for (const [i, key] of existingKeys.entries()) {
          used.add(String(key));
          try { reserve(readHomeWorkspace(JSON.parse(existingValues[i]))); } catch { /* Damaged existing records remain untouched. */ }
        }
        const allocate = () => {
          for (let i = 0; i < 5; i++) {
            const id = newId();
            if (!used.has(id)) { used.add(id); return id; }
          }
          throw new Error('Could not choose a restored HOMEFORGE ID. Try restoring again.');
        };
        for (const candidate of workspaceCandidates) {
          const workspace = structuredClone(candidate);
          workspace.id = allocate(); workspaceIds.set(candidate.id, workspace.id); workspace.name = copyName(workspace.name);
          workspace.updatedAt = new Date(Math.max(Date.now(), workspace.updatedAt.getTime()));
          for (const r of workspace.renovationProjects) {
            const sourceRenovationId = r.id;
            r.id = allocate();
            renovationIds.set(JSON.stringify([candidate.id, sourceRenovationId]), r.id);
            const variants = new Map(r.variants.map(v => [v.id, allocate()]));
            for (const [sourceId, restoredId] of variants) variantIds.set(JSON.stringify([candidate.id, sourceRenovationId, sourceId]), restoredId);
            r.existingVariantId = variants.get(r.existingVariantId)!; r.activeVariantId = variants.get(r.activeVariantId)!;
            for (const v of r.variants) {
              v.id = variants.get(v.id)!; v.projectId = projectIds.get(v.projectId)!;
              if (v.createdFromVariantId !== undefined) v.createdFromVariantId = variants.get(v.createdFromVariantId)!;
            }
          }
          await request(metadataStore.add(JSON.stringify(readHomeWorkspace(workspace)), workspace.id));
          savedWorkspaces.push({ id: workspace.id, name: workspace.name });
        }
        for (const { zone: source, assets } of restorableZones) {
          const zone = structuredClone(source);
          const workspaceId = workspaceIds.get(source.workspaceId)!, renovationId = renovationIds.get(JSON.stringify([source.workspaceId, source.renovationId]))!;
          const sessionIds = new Map(zone.sessions.map(item => [item.id, allocate()]));
          const featureIds = new Map(zone.features.map(item => [item.id, allocate()]));
          const evidenceIds = new Map(zone.evidence.map(item => [item.id, allocate()]));
          const measurementIds = new Map(zone.measurements.map(item => [item.id, allocate()]));
          zone.workspaceId = workspaceId; zone.renovationId = renovationId;
          for (const session of zone.sessions) session.id = sessionIds.get(session.id)!;
          for (const feature of zone.features) {
            feature.id = featureIds.get(feature.id)!;
            for (const relation of feature.relations) relation.featureId = featureIds.get(relation.featureId)!;
            for (const binding of feature.bindings) binding.variantId = variantIds.get(JSON.stringify([source.workspaceId, source.renovationId, binding.variantId]))!;
          }
          for (const item of zone.evidence) {
            const sourceId = item.id; item.id = evidenceIds.get(sourceId)!;
            item.sessionId = sessionIds.get(item.sessionId)!;
            item.featureIds = item.featureIds.map(id => featureIds.get(id)!);
            if (item.kind !== 'note') {
              const bytes = assets.get(JSON.stringify([source.workspaceId, source.renovationId, sourceId]))!;
              await request(tx.objectStore(HOMEFORGE_EVIDENCE_ASSET_STORE).add(bytes,
                JSON.stringify([workspaceId, renovationId, item.id])));
            }
          }
          for (const item of zone.measurements) {
            item.id = measurementIds.get(item.id)!; item.featureId = featureIds.get(item.featureId)!;
            item.evidenceIds = item.evidenceIds.map(id => evidenceIds.get(id)!);
            item.dependencies = item.dependencies.map(id => measurementIds.get(id)!);
          }
          await request(tx.objectStore(HOMEFORGE_ZONE_STORE).add(JSON.stringify(readHomeforgeZone(zone)), JSON.stringify([workspaceId, renovationId])));
        }
      }
      for (const archive of restoreArchives) {
        const meta = tx.objectStore('meta');
        let id = archive.id, attempts = 0;
        while (true) {
          const existing = await request(meta.get(`library-recovery:${id}`));
          if (existing === archive.raw) break;
          if (existing === undefined) { await request(meta.add(archive.raw, `library-recovery:${id}`)); break; }
          if (++attempts > 5) throw new Error('Could not preserve recovery data. Try restoring again.');
          id = newId();
        }
      }
      return Object.freeze({ projects: Object.freeze(saved.map(p => Object.freeze(p))), recoveryArchives: restoreArchives.length,
        ...(homeforge ? { workspaces: Object.freeze(savedWorkspaces.map(w => Object.freeze(w))) } : {}) });
    }, signal), { migrate: false });
    })().then(result => {
      completed = result;
      for (const project of result.projects) notifyLibraryChange(project.id);
      for (const workspace of result.workspaces ?? []) notifyLibraryChange(workspace.id);
      return result;
    }).finally(() => { active = undefined; });
    return active;
  };
  return Object.freeze({ entries: Object.freeze(entries), projectCount: candidates.length, ...(homeforge ? { workspaceCount: workspaceCandidates.length } : {}),
    recoveryArchives: archives.length, warnings: Object.freeze(warnings), restore });
}
