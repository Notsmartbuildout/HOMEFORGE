import type { CaptureSession, HomeforgeZone, ZoneEvidence, ZoneScope } from '$lib/models/homeforgeZone';
import { readHomeWorkspace } from '$lib/utils/homeforgeValidation';
import { readHomeforgeZone } from '$lib/utils/homeforgeZoneValidation';
import { photoHeader } from '$lib/utils/rasterHeader';
import { isRoomPlanJson, validateRoomPlan } from '$lib/utils/roomplanValidation';
import { HOMEFORGE_EVIDENCE_ASSET_STORE, HOMEFORGE_STORE, HOMEFORGE_ZONE_STORE, notifyLibraryChange, request, transaction, withDatabase } from './localDatabase';

const key = (workspaceId: string, renovationId: string) => JSON.stringify([workspaceId, renovationId]);
const assetKey = (workspaceId: string, renovationId: string, evidenceId: string) => JSON.stringify([workspaceId, renovationId, evidenceId]);
const newId = () => globalThis.crypto?.randomUUID?.() ?? `evidence-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
        const zone = await current(tx, workspaceId, renovationId), used = new Set(zone.sessions.map(item => item.id));
        let id = '', attempts = 0;
        do { if (++attempts > 5) throw new Error('Could not choose a capture session ID. Retry.'); id = newId(); } while (used.has(id));
        const session: CaptureSession = { id, startedAt: new Date(), ...(note ? { note } : {}) };
        zone.sessions.push(session); zone.updatedAt = new Date(Math.max(Date.now(), zone.updatedAt.getTime()));
        const raw = JSON.stringify(readHomeforgeZone(zone));
        await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(raw, key(workspaceId, renovationId)));
        return { session, raw };
      }));
      revisions.set(key(workspaceId, renovationId), result.raw); notifyLibraryChange(workspaceId);
      return result.session;
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
        const used = new Set(zone.evidence.map(item => item.id));
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
