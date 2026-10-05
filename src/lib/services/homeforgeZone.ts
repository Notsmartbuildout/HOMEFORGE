import type { CaptureSession, HomeforgeZone, ZoneEvidence, ZoneFeature, ZoneMeasurement, ZoneScope } from '$lib/models/homeforgeZone';
import { readHomeWorkspace } from '$lib/utils/homeforgeValidation';
import { readHomeforgeZone } from '$lib/utils/homeforgeZoneValidation';
import { readProject } from '$lib/utils/projectValidation';
import { geometryFingerprint, geometryValue } from '$lib/utils/homeforgeCoverage';
import { photoHeader } from '$lib/utils/rasterHeader';
import { isRoomPlanJson, validateRoomPlan } from '$lib/utils/roomplanValidation';
import { HOMEFORGE_EVIDENCE_ASSET_STORE, HOMEFORGE_STORE, HOMEFORGE_ZONE_STORE, notifyLibraryChange, request, transaction, withDatabase } from './localDatabase';

const key = (workspaceId: string, renovationId: string) => JSON.stringify([workspaceId, renovationId]);
const assetKey = (workspaceId: string, renovationId: string, evidenceId: string) => JSON.stringify([workspaceId, renovationId, evidenceId]);
const newId = () => globalThis.crypto?.randomUUID?.() ?? `evidence-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
function uniqueId(used: Set<string>): string {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = newId(); if (!used.has(id)) return id;
  }
  throw new Error('Could not choose a unique zone ID. Retry.');
}
const bytesLimit = 8 * 1024 * 1024;
const zoneLimit = 64 * 1024 * 1024; // ponytail: use a bounded JSON backup first; use a binary archive if real capture needs more room.
async function digest(bytes: Uint8Array): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes)));
  return [...hash].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function createHomeforgeZoneStore() {
  const revisions = new Map<string, string>();
  const current = async (tx: IDBTransaction, workspaceId: string, renovationId: string) => {
    const raw = await request(tx.objectStore(HOMEFORGE_ZONE_STORE).get(key(workspaceId, renovationId)));
    if (typeof raw !== 'string') throw new Error('Renovation zone is unavailable. Download a HOMEFORGE backup for recovery.');
    if (revisions.get(key(workspaceId, renovationId)) !== raw) throw new Error('Zone capture changed in another tab. Reload before adding evidence.');
    const zone = readHomeforgeZone(JSON.parse(raw));
    if (zone.workspaceId !== workspaceId || zone.renovationId !== renovationId) throw new Error('HOMEFORGE zone key does not match its saved record.');
    return zone;
  };
  const checkBinding = async (tx: IDBTransaction, zone: HomeforgeZone, featureKind: ZoneFeature['kind'], binding: ZoneFeature['bindings'][number]) => {
    if (zone.features.some(feature => feature.bindings.some(item => item.variantId === binding.variantId &&
      item.floorId === binding.floorId && item.kind === binding.kind && item.elementId === binding.elementId)))
      throw new Error('This editor element is already bound to a feature.');
    if (({ walls: 'wall', doors: 'door', windows: 'window', stairs: 'stair', rooms: 'landing' } as Record<string, string>)[binding.kind] !== featureKind)
      throw new Error('Feature type does not match its editor element.');
    const workspace = readHomeWorkspace(JSON.parse(await request(tx.objectStore(HOMEFORGE_STORE).get(zone.workspaceId))));
    const renovation = workspace.renovationProjects.find(item => item.id === zone.renovationId);
    const variant = renovation?.variants.find(item => item.id === binding.variantId);
    if (!variant) throw new Error('Feature binding has no saved design variant.');
    const raw = await request(tx.objectStore('projects').get(variant.projectId));
    const project = readProject(JSON.parse(raw));
    const floor = project.floors.find(item => item.id === binding.floorId);
    if (project.id !== variant.projectId || !floor?.[binding.kind].some(item => item.id === binding.elementId))
      throw new Error('Feature binding has no saved editor element.');
  };
  return {
    async load(workspaceId: string, renovationId: string): Promise<HomeforgeZone | null> {
      const raw = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE], 'readonly', async tx =>
        (await request(tx.objectStore(HOMEFORGE_ZONE_STORE).get(key(workspaceId, renovationId)))) ?? null));
      if (raw === null) return null;
      const zone = readHomeforgeZone(JSON.parse(raw));
      if (zone.workspaceId !== workspaceId || zone.renovationId !== renovationId) throw new Error('HOMEFORGE zone key does not match its saved record.');
      revisions.set(key(workspaceId, renovationId), raw);
      return zone;
    },
    async ensure(workspaceId: string, renovationId: string): Promise<HomeforgeZone> {
      const result = await withDatabase(db => transaction(db, [HOMEFORGE_STORE, HOMEFORGE_ZONE_STORE], 'readwrite', async tx => {
        const workspaceRaw = await request(tx.objectStore(HOMEFORGE_STORE).get(workspaceId));
        let workspace;
        try { workspace = readHomeWorkspace(JSON.parse(workspaceRaw)); } catch { throw new Error('Renovation zone is unavailable. Download a HOMEFORGE backup for recovery.'); }
        if (workspace.id !== workspaceId || !workspace.renovationProjects.some(item => item.id === renovationId))
          throw new Error('Renovation zone is unavailable. Download a HOMEFORGE backup for recovery.');
        const store = tx.objectStore(HOMEFORGE_ZONE_STORE), stored = await request(store.get(key(workspaceId, renovationId)));
        if (stored !== undefined) {
          const existing = readHomeforgeZone(JSON.parse(stored));
          if (existing.workspaceId !== workspaceId || existing.renovationId !== renovationId) throw new Error('HOMEFORGE zone key does not match its saved record.');
          return { zone: existing, created: false, raw: stored as string };
        }
        const now = new Date(), zone = readHomeforgeZone({ schemaVersion: 1, workspaceId, renovationId, sessions: [], evidence: [], features: [], measurements: [], createdAt: now, updatedAt: now });
        const raw = JSON.stringify(zone);
        await request(store.add(raw, key(workspaceId, renovationId)));
        return { zone, created: true, raw };
      }));
      revisions.set(key(workspaceId, renovationId), result.raw);
      if (result.created) notifyLibraryChange(workspaceId);
      return result.zone;
    },
    async addSession(workspaceId: string, renovationId: string, note?: string): Promise<CaptureSession> {
      if (note !== undefined && (typeof note !== 'string' || note.length > 1000)) throw new Error('Visit note is too long.');
      const result = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE], 'readwrite', async tx => {
        const zone = await current(tx, workspaceId, renovationId);
        const used = new Set([...zone.sessions, ...zone.evidence, ...zone.features, ...zone.measurements].map(item => item.id));
        const id = uniqueId(used);
        const session: CaptureSession = { id, startedAt: new Date(), ...(note ? { note } : {}) };
        zone.sessions.push(session); zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return { session, raw };
      }));
      revisions.set(key(workspaceId, renovationId), result.raw); notifyLibraryChange(workspaceId);
      return result.session;
    },
    async addFeature(workspaceId: string, renovationId: string, input: Pick<ZoneFeature, 'kind' | 'label' | 'scope'> & {
      description?: string; binding?: ZoneFeature['bindings'][number];
    }): Promise<ZoneFeature> {
      const result = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE, HOMEFORGE_STORE, 'projects'], 'readwrite', async tx => {
        const zone = await current(tx, workspaceId, renovationId);
        if (input.binding) await checkBinding(tx, zone, input.kind, input.binding);
        const used = new Set([...zone.sessions, ...zone.evidence, ...zone.features, ...zone.measurements].map(item => item.id));
        const id = uniqueId(used);
        const feature = { id, kind: input.kind, label: input.label, scope: input.scope,
          ...(input.description ? { description: input.description } : {}), relations: [], bindings: input.binding ? [input.binding] : [] } as ZoneFeature;
        zone.features.push(feature); zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return { feature, raw };
      }));
      revisions.set(key(workspaceId, renovationId), result.raw); notifyLibraryChange(workspaceId);
      return result.feature;
    },
    async bindFeature(workspaceId: string, renovationId: string, featureId: string, binding: ZoneFeature['bindings'][number]): Promise<void> {
      const raw = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE, HOMEFORGE_STORE, 'projects'], 'readwrite', async tx => {
        const zone = await current(tx, workspaceId, renovationId);
        const feature = zone.features.find(item => item.id === featureId);
        if (!feature) throw new Error('Feature is unavailable. Reload before matching.');
        if (feature.bindings.some(item => item.variantId === binding.variantId)) throw new Error('Feature already has a binding in this option.');
        await checkBinding(tx, zone, feature.kind, binding);
        feature.bindings.push(binding);
        zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return raw;
      }));
      revisions.set(key(workspaceId, renovationId), raw); notifyLibraryChange(workspaceId);
    },
    async setSufficient(workspaceId: string, renovationId: string, sufficient: boolean): Promise<void> {
      const raw = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE], 'readwrite', async tx => {
        const zone = await current(tx, workspaceId, renovationId);
        if (sufficient) zone.sufficientAt = new Date(); else delete zone.sufficientAt;
        zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return raw;
      }));
      revisions.set(key(workspaceId, renovationId), raw); notifyLibraryChange(workspaceId);
    },
    async updateFeature(workspaceId: string, renovationId: string, featureId: string, changes: Pick<ZoneFeature, 'label' | 'description'>): Promise<void> {
      const raw = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE], 'readwrite', async tx => {
        const zone = await current(tx, workspaceId, renovationId);
        const feature = zone.features.find(item => item.id === featureId);
        if (!feature) throw new Error('Feature is unavailable. Reload before editing.');
        feature.label = changes.label.trim();
        if (changes.description?.trim()) feature.description = changes.description.trim(); else delete feature.description;
        zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return raw;
      }));
      revisions.set(key(workspaceId, renovationId), raw); notifyLibraryChange(workspaceId);
    },
    async addRelation(workspaceId: string, renovationId: string, featureId: string, relation: ZoneFeature['relations'][number]): Promise<void> {
      const raw = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE], 'readwrite', async tx => {
        const zone = await current(tx, workspaceId, renovationId);
        const feature = zone.features.find(item => item.id === featureId);
        if (!feature) throw new Error('Feature is unavailable. Reload before linking.');
        if (!feature.relations.some(item => item.kind === relation.kind && item.featureId === relation.featureId)) feature.relations.push(relation);
        zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return raw;
      }));
      revisions.set(key(workspaceId, renovationId), raw); notifyLibraryChange(workspaceId);
    },
    async addMeasurement(workspaceId: string, renovationId: string, input: Pick<ZoneMeasurement,
      'featureId' | 'property' | 'enteredValue' | 'unit' | 'source' | 'evidenceIds'> & { dependencies?: string[] }): Promise<ZoneMeasurement> {
      const factors = { cm: 1, m: 100, in: 2.54, ft: 30.48 };
      if (!Object.hasOwn(factors, input.unit) || !Number.isFinite(input.enteredValue) || input.enteredValue <= 0)
        throw new Error('Enter a positive measurement with a supported unit.');
      if (input.source === 'scan-derived' && input.evidenceIds.length === 0)
        throw new Error('Choose saved scan evidence for a scan-derived measurement.');
      const result = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE, HOMEFORGE_STORE, 'projects'], 'readwrite', async tx => {
        const zone = await current(tx, workspaceId, renovationId);
        const used = new Set([...zone.sessions, ...zone.evidence, ...zone.features, ...zone.measurements].map(item => item.id));
        const id = uniqueId(used);
        const measurement: ZoneMeasurement = { id, featureId: input.featureId, property: input.property,
          enteredValue: input.enteredValue, unit: input.unit, valueCm: input.enteredValue * factors[input.unit],
          recordedAt: new Date(), source: input.source, evidenceIds: [...input.evidenceIds], dependencies: [...(input.dependencies ?? [])] };
        if (input.source === 'calculated') {
          if (input.property !== 'stair.riserHeight' || input.unit !== 'cm' || measurement.dependencies.length !== 1)
            throw new Error('Unsupported calculated measurement.');
          const workspace = readHomeWorkspace(JSON.parse(await request(tx.objectStore(HOMEFORGE_STORE).get(workspaceId))));
          const renovation = workspace.renovationProjects.find(item => item.id === renovationId);
          const existing = renovation?.variants.find(item => item.id === renovation.existingVariantId);
          if (!existing) throw new Error('Existing Conditions are unavailable.');
          const project = readProject(JSON.parse(await request(tx.objectStore('projects').get(existing.projectId))));
          const value = geometryValue(zone, measurement, project, existing.id);
          if (value === null || Math.abs(value - measurement.valueCm) > 1e-9)
            throw new Error('Calculated riser height changed. Reload before saving it.');
        }
        zone.measurements.push(measurement); zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return { measurement, raw };
      }));
      revisions.set(key(workspaceId, renovationId), result.raw); notifyLibraryChange(workspaceId);
      return result.measurement;
    },
    async verifyMeasurement(workspaceId: string, renovationId: string, measurementId: string): Promise<ZoneMeasurement> {
      const result = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE, HOMEFORGE_STORE, 'projects'], 'readwrite', async tx => {
        const zone = await current(tx, workspaceId, renovationId), measurement = zone.measurements.find(item => item.id === measurementId);
        if (!measurement) throw new Error('Measurement is unavailable. Reload before verifying.');
        const workspace = readHomeWorkspace(JSON.parse(await request(tx.objectStore(HOMEFORGE_STORE).get(workspaceId))));
        const renovation = workspace.renovationProjects.find(item => item.id === renovationId);
        const existing = renovation?.variants.find(item => item.id === renovation.existingVariantId);
        if (!existing) throw new Error('Existing Conditions are unavailable.');
        const project = readProject(JSON.parse(await request(tx.objectStore('projects').get(existing.projectId))));
        if (project.id !== existing.projectId) throw new Error('Existing Conditions changed. Reload before verifying.');
        const fingerprint = geometryFingerprint(zone, measurement, project, existing.id);
        const valueCm = geometryValue(zone, measurement, project, existing.id);
        if (!fingerprint || valueCm === null) throw new Error('This measurement has no matching Existing geometry to verify.');
        measurement.verified = { valueCm, geometryFingerprint: fingerprint, verifiedAt: new Date() };
        zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return { measurement, raw };
      }));
      revisions.set(key(workspaceId, renovationId), result.raw); notifyLibraryChange(workspaceId);
      return result.measurement;
    },
    async addEvidence(workspaceId: string, renovationId: string, sessionId: string, input: {
      kind: 'photo' | 'plan' | 'sketch' | 'roomplan'; scope: ZoneScope; name: string; mimeType: string; bytes: Uint8Array;
      category?: ZoneEvidence['category']; featureIds?: string[];
    }): Promise<ZoneEvidence> {
      if (!['photo', 'plan', 'sketch', 'roomplan'].includes(input.kind) || !['context', 'focus'].includes(input.scope) ||
        typeof input.name !== 'string' || !input.name.trim() || input.name.length > 180 || !(input.bytes instanceof Uint8Array))
        throw new Error('Choose a named capture file.');
      if (input.category !== undefined && !['overview', 'wall', 'opening', 'detail', 'reference'].includes(input.category))
        throw new Error('Choose a guided capture step.');
      const bytes = input.bytes.slice();
      if (!bytes.length || bytes.length > bytesLimit) throw new Error('Choose a capture file under 8 MiB.');
      if (input.kind === 'roomplan') {
        if (input.mimeType !== 'application/json') throw new Error('Choose a compatible RoomPlan JSON file.');
        try {
          const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
          if (!isRoomPlanJson(data)) throw new Error('Not RoomPlan');
          validateRoomPlan(data);
        }
        catch { throw new Error('Choose a compatible RoomPlan JSON file.'); }
      } else {
        const info = photoHeader(bytes);
        if (!info || info.mime !== input.mimeType || !info.width || !info.height)
          throw new Error('Choose a readable JPG or PNG image under 8 MiB.');
      }
      const sha256 = await digest(bytes);
      const result = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE, HOMEFORGE_EVIDENCE_ASSET_STORE], 'readwrite', async tx => {
        const zone = await current(tx, workspaceId, renovationId);
        if (!zone.sessions.some(item => item.id === sessionId)) throw new Error('Capture session changed. Reload before adding evidence.');
        if ((input.featureIds ?? []).some(id => !zone.features.some(feature => feature.id === id))) throw new Error('Feature link is unavailable. Reload before adding evidence.');
        if (zone.evidence.reduce((total, item) => total + (item.byteLength ?? 0), 0) + bytes.length > zoneLimit)
          throw new Error('This zone has reached its 64 MiB original-file limit. Export a backup before adding more evidence.');
        const used = new Set([...zone.sessions, ...zone.evidence, ...zone.features, ...zone.measurements].map(item => item.id));
        let id = '', attempts = 0;
        do { if (++attempts > 5) throw new Error('Could not choose an evidence ID. Retry.'); id = newId(); } while (used.has(id) || await request(tx.objectStore(HOMEFORGE_EVIDENCE_ASSET_STORE).get(assetKey(workspaceId, renovationId, id))) !== undefined);
        const evidence: ZoneEvidence = { id, sessionId, kind: input.kind, scope: input.scope, name: input.name.trim(),
          capturedAt: new Date(), featureIds: [...new Set(input.featureIds ?? [])],
          ...(input.category ? { category: input.category } : {}), mimeType: input.mimeType, sha256, byteLength: bytes.length };
        zone.evidence.push(evidence); zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_EVIDENCE_ASSET_STORE).add(bytes, assetKey(workspaceId, renovationId, id)));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return { evidence, raw };
      }));
      revisions.set(key(workspaceId, renovationId), result.raw); notifyLibraryChange(workspaceId);
      return result.evidence;
    },
    async linkEvidence(workspaceId: string, renovationId: string, evidenceId: string, featureId: string): Promise<void> {
      const raw = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE], 'readwrite', async tx => {
        const zone = await current(tx, workspaceId, renovationId);
        const evidence = zone.evidence.find(item => item.id === evidenceId);
        if (!evidence || !zone.features.some(item => item.id === featureId)) throw new Error('Evidence or feature is unavailable. Reload before linking.');
        if (!evidence.featureIds.includes(featureId)) evidence.featureIds.push(featureId);
        zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return raw;
      }));
      revisions.set(key(workspaceId, renovationId), raw); notifyLibraryChange(workspaceId);
    },
    async readEvidenceBytes(workspaceId: string, renovationId: string, evidenceId: string): Promise<Uint8Array> {
      const saved = await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE, HOMEFORGE_EVIDENCE_ASSET_STORE], 'readonly', async tx => {
        const raw = await request(tx.objectStore(HOMEFORGE_ZONE_STORE).get(key(workspaceId, renovationId)));
        if (typeof raw !== 'string') throw new Error('Saved zone is unavailable. Download a HOMEFORGE backup for recovery.');
        const zone = readHomeforgeZone(JSON.parse(raw)), evidence = zone.evidence.find(item => item.id === evidenceId);
        if (zone.workspaceId !== workspaceId || zone.renovationId !== renovationId || !evidence) throw new Error('Saved evidence is unavailable. Download a HOMEFORGE backup for recovery.');
        const bytes = await request(tx.objectStore(HOMEFORGE_EVIDENCE_ASSET_STORE).get(assetKey(workspaceId, renovationId, evidenceId)));
        return { evidence, bytes };
      }));
      if (!(saved.bytes instanceof Uint8Array) || saved.bytes.length !== saved.evidence.byteLength || await digest(saved.bytes) !== saved.evidence.sha256)
        throw new Error('Saved evidence bytes are missing or damaged. Download a HOMEFORGE backup for recovery.');
      return saved.bytes.slice();
    },
  };
}
