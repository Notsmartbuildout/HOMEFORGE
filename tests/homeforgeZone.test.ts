import { beforeEach, expect, it } from 'vitest';
import { DATABASE_NAME, HOMEFORGE_STORE, HOMEFORGE_ZONE_STORE, STORES, homeforgeBackup, request, transaction, withDatabase } from '$lib/services/localDatabase';
import { mockStorage } from './fixtures/indexeddb';
import { readFile } from 'node:fs/promises';
import { failWrites } from './fixtures/indexeddb';
import { createHomeWorkspace, createHomeforgeStore } from '$lib/services/homeforge';
import { createHomeforgeZoneStore } from '$lib/services/homeforgeZone';
import { readHomeforgeZone } from '$lib/utils/homeforgeZoneValidation';
import { prepareLibraryRestore } from '$lib/services/libraryRestore';

beforeEach(() => { mockStorage(); });

it('adds zone and evidence stores to a version 2 database without changing saved records', async () => {
  await new Promise<void>((resolve, reject) => {
    const open = indexedDB.open(DATABASE_NAME, 2);
    open.onupgradeneeded = () => {
      for (const name of [...STORES, HOMEFORGE_STORE]) open.result.createObjectStore(name);
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction(HOMEFORGE_STORE, 'readwrite');
      tx.objectStore(HOMEFORGE_STORE).put('original bytes', 'workspace-1');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  });
  await withDatabase(db => transaction(db, [HOMEFORGE_STORE], 'readonly', async tx => {
    expect(db.objectStoreNames.contains('homeforgeZones')).toBe(true);
    expect(db.objectStoreNames.contains('homeforgeEvidenceAssets')).toBe(true);
    expect(await request(tx.objectStore(HOMEFORGE_STORE).get('workspace-1'))).toBe('original bytes');
  }));
});

it('creates one validated zone record for an existing renovation and rejects a wrong target', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home');
  await homeforge.save(workspace);
  const renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const zones = createHomeforgeZoneStore();
  const record = await zones.ensure(workspace.id, renovation.id);
  expect(record).toMatchObject({ schemaVersion: 1, workspaceId: workspace.id, renovationId: renovation.id,
    sessions: [], evidence: [], features: [], measurements: [] });
  expect(await zones.ensure(workspace.id, renovation.id)).toEqual(record);
  expect(await createHomeforgeZoneStore().load(workspace.id, renovation.id)).toEqual(record);
  await expect(zones.ensure(workspace.id, 'wrong')).rejects.toThrow(/unavailable/i);
  expect(() => readHomeforgeZone({ ...record, schemaVersion: 2 })).toThrow(/schemaVersion/);
});

it('commits original photo bytes and their zone evidence record together', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  const renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const zones = createHomeforgeZoneStore(); await zones.ensure(workspace.id, renovation.id);
  const session = await zones.addSession(workspace.id, renovation.id);
  const bytes = new Uint8Array(await readFile('tests/fixtures/item-photo.png'));
  const evidence = await zones.addEvidence(workspace.id, renovation.id, session.id,
    { kind: 'photo', scope: 'context', name: 'Front doorway.png', mimeType: 'image/png', bytes });
  bytes.fill(0);
  expect((await zones.load(workspace.id, renovation.id))!.evidence[0]).toEqual(evidence);
  expect(await zones.readEvidenceBytes(workspace.id, renovation.id, evidence.id)).toEqual(new Uint8Array(await readFile('tests/fixtures/item-photo.png')));
});

it('keeps zone metadata and bytes unchanged when the asset write fails', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  const renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const zones = createHomeforgeZoneStore(); await zones.ensure(workspace.id, renovation.id);
  const session = await zones.addSession(workspace.id, renovation.id), before = await zones.load(workspace.id, renovation.id);
  const restore = failWrites('homeforgeEvidenceAssets');
  await expect(zones.addEvidence(workspace.id, renovation.id, session.id,
    { kind: 'photo', scope: 'focus', name: 'Landing.png', mimeType: 'image/png', bytes: new Uint8Array(await readFile('tests/fixtures/item-photo.png')) }))
    .rejects.toMatchObject({ name: 'QuotaExceededError' });
  restore();
  expect(await zones.load(workspace.id, renovation.id)).toEqual(before);
});

it('rejects unreadable images and incompatible RoomPlan input without saving metadata', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  const renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const zones = createHomeforgeZoneStore(); await zones.ensure(workspace.id, renovation.id);
  const session = await zones.addSession(workspace.id, renovation.id);
  await expect(zones.addEvidence(workspace.id, renovation.id, session.id,
    { kind: 'photo', scope: 'focus', name: 'bad.png', mimeType: 'image/png', bytes: new Uint8Array([1, 2, 3]) })).rejects.toThrow(/readable JPG or PNG/);
  await expect(zones.addEvidence(workspace.id, renovation.id, session.id,
    { kind: 'roomplan', scope: 'focus', name: 'bad.json', mimeType: 'application/json', bytes: new TextEncoder().encode('{"walls":[]}') })).rejects.toThrow(/compatible RoomPlan/);
  expect((await zones.load(workspace.id, renovation.id))!.evidence).toEqual([]);
});

it('includes original zone photo bytes in a versioned HOMEFORGE backup', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  const renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const zones = createHomeforgeZoneStore(); await zones.ensure(workspace.id, renovation.id);
  const session = await zones.addSession(workspace.id, renovation.id);
  const bytes = new Uint8Array(await readFile('tests/fixtures/item-photo.png'));
  const evidence = await zones.addEvidence(workspace.id, renovation.id, session.id,
    { kind: 'photo', scope: 'context', name: 'Front.png', mimeType: 'image/png', bytes });
  const backup = JSON.parse(await homeforgeBackup());
  expect(backup.version).toBe(2);
  expect(JSON.parse(backup.zones[JSON.stringify([workspace.id, renovation.id])]).evidence[0].id).toBe(evidence.id);
  expect(new Uint8Array(Buffer.from(backup.evidenceAssets[JSON.stringify([workspace.id, renovation.id, evidence.id])], 'base64'))).toEqual(bytes);
});

it('restores a zone as an independent copy with original evidence bytes', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  const renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const zones = createHomeforgeZoneStore(); await zones.ensure(workspace.id, renovation.id);
  const session = await zones.addSession(workspace.id, renovation.id);
  const bytes = new Uint8Array(await readFile('tests/fixtures/item-photo.png'));
  await zones.addEvidence(workspace.id, renovation.id, session.id,
    { kind: 'photo', scope: 'context', name: 'Front.png', mimeType: 'image/png', bytes });
  const result = await prepareLibraryRestore(await homeforgeBackup()).restore();
  const copiedWorkspace = (await createHomeforgeStore().load(result.workspaces![0].id))!;
  const copiedZone = (await createHomeforgeZoneStore().load(copiedWorkspace.id, copiedWorkspace.renovationProjects[0].id))!;
  expect(copiedZone.workspaceId).not.toBe(workspace.id);
  expect(copiedZone.evidence[0].id).not.toBe((await zones.load(workspace.id, renovation.id))!.evidence[0].id);
  expect(await createHomeforgeZoneStore().readEvidenceBytes(copiedZone.workspaceId, copiedZone.renovationId, copiedZone.evidence[0].id)).toEqual(bytes);
});

it('remaps populated zone relationships without changing live workspace or project records', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  const renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const option = await homeforge.cloneVariant(workspace.id, renovation.id, renovation.existingVariantId, 'Option A');
  const zones = createHomeforgeZoneStore(), zone = await zones.ensure(workspace.id, renovation.id);
  const session = await zones.addSession(workspace.id, renovation.id);
  const evidence = await zones.addEvidence(workspace.id, renovation.id, session.id,
    { kind: 'photo', scope: 'focus', name: 'Entry.png', mimeType: 'image/png', bytes: new Uint8Array(await readFile('tests/fixtures/item-photo.png')) });
  const feature = { id: 'door-feature', kind: 'door', label: 'D1', scope: 'focus', relations: [],
    bindings: [{ variantId: renovation.existingVariantId, floorId: 'floor-1', kind: 'doors', elementId: 'door-1' },
      { variantId: option.id, floorId: 'floor-1', kind: 'doors', elementId: 'door-1' }] };
  const measurement = { id: 'door-width', featureId: feature.id, property: 'door.width', enteredValue: 36, unit: 'in',
    valueCm: 91.44, recordedAt: new Date(), source: 'manually measured', evidenceIds: [evidence.id], dependencies: [],
    verified: { valueCm: 91.44, geometryFingerprint: 'door-width-91.44', verifiedAt: new Date() } };
  const enriched = readHomeforgeZone({ ...zone, sessions: [session], evidence: [evidence], features: [feature], measurements: [measurement] });
  await withDatabase(db => transaction(db, [HOMEFORGE_ZONE_STORE], 'readwrite', async tx => {
    await request(tx.objectStore(HOMEFORGE_ZONE_STORE).put(JSON.stringify(enriched), JSON.stringify([workspace.id, renovation.id])));
  }));
  const before = JSON.parse(await homeforgeBackup());
  const result = await prepareLibraryRestore(JSON.stringify(before)).restore();
  const copiedWorkspace = (await createHomeforgeStore().load(result.workspaces![0].id))!;
  const copiedRenovation = copiedWorkspace.renovationProjects[0];
  const copiedZone = (await createHomeforgeZoneStore().load(copiedWorkspace.id, copiedRenovation.id))!;
  expect(copiedZone.features[0].id).not.toBe(feature.id);
  expect(copiedZone.features[0].bindings.map(item => item.variantId)).toEqual(copiedRenovation.variants.map(item => item.id));
  expect(copiedZone.measurements[0]).toMatchObject({ featureId: copiedZone.features[0].id,
    evidenceIds: [copiedZone.evidence[0].id], valueCm: 91.44 });
  expect(await createHomeforgeZoneStore().readEvidenceBytes(copiedWorkspace.id, copiedRenovation.id, copiedZone.evidence[0].id))
    .toEqual(new Uint8Array(await readFile('tests/fixtures/item-photo.png')));
  const after = JSON.parse(await homeforgeBackup());
  for (const key of ['projects', 'workspaces', 'zones', 'evidenceAssets'])
    for (const [id, raw] of Object.entries(before[key])) expect(after[key][id]).toEqual(raw);
});

it('restores an older HOMEFORGE backup without inventing capture records', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const older = JSON.parse(await homeforgeBackup());
  older.version = 1; delete older.zones; delete older.evidenceAssets;
  const result = await prepareLibraryRestore(JSON.stringify(older)).restore();
  const restored = (await createHomeforgeStore().load(result.workspaces![0].id))!;
  expect(await createHomeforgeZoneStore().load(restored.id, restored.renovationProjects[0].id)).toBeNull();
});

it('keeps damaged evidence with its zone in recovery instead of opening an incomplete capture', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  const renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const zones = createHomeforgeZoneStore(); await zones.ensure(workspace.id, renovation.id);
  const session = await zones.addSession(workspace.id, renovation.id);
  const item = await zones.addEvidence(workspace.id, renovation.id, session.id,
    { kind: 'photo', scope: 'focus', name: 'Stair.png', mimeType: 'image/png', bytes: new Uint8Array(await readFile('tests/fixtures/item-photo.png')) });
  const backup = JSON.parse(await homeforgeBackup()), assetKey = JSON.stringify([workspace.id, renovation.id, item.id]);
  backup.evidenceAssets[assetKey] = 'not-base64';
  const preview = prepareLibraryRestore(JSON.stringify(backup));
  expect(preview.warnings.some(message => /Zone .* kept for recovery/.test(message))).toBe(true);
  const result = await preview.restore();
  const restored = (await createHomeforgeStore().load(result.workspaces![0].id))!;
  expect(await createHomeforgeZoneStore().load(restored.id, restored.renovationProjects[0].id)).toBeNull();
  expect((await homeforgeBackup())).toContain('not-base64');
});

it('archives an evidence asset whose bytes changed without changing its length', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  const renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const zones = createHomeforgeZoneStore(); await zones.ensure(workspace.id, renovation.id);
  const session = await zones.addSession(workspace.id, renovation.id);
  const item = await zones.addEvidence(workspace.id, renovation.id, session.id,
    { kind: 'photo', scope: 'focus', name: 'Stair.png', mimeType: 'image/png', bytes: new Uint8Array(await readFile('tests/fixtures/item-photo.png')) });
  const backup = JSON.parse(await homeforgeBackup()), assetKey = JSON.stringify([workspace.id, renovation.id, item.id]);
  const altered = Buffer.from(backup.evidenceAssets[assetKey], 'base64'); altered[altered.length - 1] ^= 1;
  backup.evidenceAssets[assetKey] = altered.toString('base64');
  const result = await prepareLibraryRestore(JSON.stringify(backup)).restore();
  const restored = (await createHomeforgeStore().load(result.workspaces![0].id))!;
  expect(await createHomeforgeZoneStore().load(restored.id, restored.renovationProjects[0].id)).toBeNull();
  expect(result.recoveryArchives).toBeGreaterThan(0);
  expect((await homeforgeBackup())).toContain(backup.evidenceAssets[assetKey]);
});

it('rolls back a late restore asset failure with all related records', async () => {
  const homeforge = createHomeforgeStore(), workspace = createHomeWorkspace('Home'); await homeforge.save(workspace);
  const renovation = await homeforge.createRenovationProject(workspace.id, { name: 'Entry' });
  const zones = createHomeforgeZoneStore(); await zones.ensure(workspace.id, renovation.id);
  const session = await zones.addSession(workspace.id, renovation.id);
  await zones.addEvidence(workspace.id, renovation.id, session.id,
    { kind: 'photo', scope: 'context', name: 'Front.png', mimeType: 'image/png', bytes: new Uint8Array(await readFile('tests/fixtures/item-photo.png')) });
  const before = JSON.parse(await homeforgeBackup()), restore = failWrites('homeforgeEvidenceAssets');
  await expect(prepareLibraryRestore(JSON.stringify(before)).restore()).rejects.toMatchObject({ name: 'QuotaExceededError' });
  restore();
  const after = JSON.parse(await homeforgeBackup());
  expect(after.projects).toEqual(before.projects);
  expect(after.workspaces).toEqual(before.workspaces);
  expect(after.zones).toEqual(before.zones);
  expect(after.evidenceAssets).toEqual(before.evidenceAssets);
});
