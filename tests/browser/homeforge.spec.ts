import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { savedProjects, storedRecords } from './storage';

async function createWorkspace(page: Page, name = 'My home') {
  await page.getByRole('button', { name: 'New home workspace', exact: true }).click();
  await page.getByLabel('Workspace name', { exact: true }).fill(name);
  await page.getByLabel('Workspace name', { exact: true }).press('Enter');
  await expect(page.getByLabel('Home workspace', { exact: true })).toContainText(name);
}
async function createRenovation(page: Page, name = 'Front entry', projectId?: string) {
  await page.getByRole('button', { name: 'New renovation', exact: true }).click();
  await page.getByLabel('Renovation name', { exact: true }).fill(name);
  if (projectId) await page.getByLabel('Starting plan', { exact: true }).selectOption(projectId);
  await page.getByRole('button', { name: 'Create renovation', exact: true }).click();
  await expect(page.getByRole('article', { name, exact: true })).toBeVisible();
}

test.beforeEach(async ({ context }, testInfo) => {
  if (!testInfo.title.startsWith('first visit')) await context.addInitScript(() => { localStorage.setItem('hasSeenWelcome', 'true'); });
});

test('zone overview opens the exact Existing plan and survives reload', async ({ page }) => {
  await page.goto('/'); await createWorkspace(page); await createRenovation(page, 'Front entry and stairs');
  const workspace: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
  const zone = workspace.renovationProjects[0];
  await page.getByRole('article', { name: zone.name }).getByRole('link', { name: 'Open zone' }).click();
  await expect(page).toHaveURL(new RegExp(`/zone\\?workspace=${workspace.id}&renovation=${zone.id}`));
  await expect(page.getByRole('heading', { name: zone.name })).toBeVisible();
  await expect(page.getByText('Editor JSON and project-package exports omit zone capture evidence.')).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Open Existing Conditions' }).click();
  await expect(page).toHaveURL(new RegExp(`id=${zone.variants[0].projectId}`));
  await expect(page.getByRole('navigation', { name: 'HOMEFORGE editor context' })).toContainText(zone.name);
});

test('zone feature label and measured wall survive reload', async ({ page }) => {
  const source: any = JSON.parse(JSON.parse(await readFile('tests/fixtures/library-backup.json', 'utf8')).projects['qa-library-restore']);
  await page.addInitScript(project => { localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) })); }, source);
  await page.goto('/'); await createWorkspace(page); await createRenovation(page, 'Entry', source.id);
  await page.getByRole('article', { name: 'Entry' }).getByRole('link', { name: 'Open zone' }).click();
  await page.getByLabel('Existing element').selectOption({ index: 1 });
  await page.getByLabel('Feature label').fill('W1');
  await page.getByRole('button', { name: 'Save feature' }).click();
  await expect(page.getByRole('list', { name: 'Feature legend' })).toContainText('W1');
  await page.getByLabel('Measurement property').selectOption('wall.length');
  await page.getByLabel('Measured value').fill('36');
  await page.getByLabel('Measurement unit').selectOption('in');
  await page.getByRole('button', { name: 'Save measurement' }).click();
  await expect(page.getByRole('list', { name: 'Feature legend' })).toContainText('36 in');
  await page.getByRole('button', { name: 'Verify against Existing' }).click();
  await expect(page.getByRole('list', { name: 'Feature legend' })).toContainText('current');
  await page.getByRole('button', { name: 'Mark sufficient for now' }).click();
  await expect(page.getByText('Sufficient for now; remaining gaps stay visible.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('list', { name: 'Feature legend' })).toContainText('W1');
  await expect(page.getByRole('list', { name: 'Feature legend' })).toContainText('36 in');
  await expect(page.getByRole('list', { name: 'Feature legend' })).toContainText('current');
  await expect(page.getByText('Sufficient for now; remaining gaps stay visible.')).toBeVisible();
  await page.getByRole('link', { name: 'Open Existing Conditions' }).click();
  await expect(page.getByRole('complementary', { name: 'Feature legend' })).toContainText('W1');
});

for (const width of [1440, 390]) test(`guided capture retains an original photo and exports it at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  await createWorkspace(page); await createRenovation(page);
  const workspace: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
  const renovation = workspace.renovationProjects[0];
  await page.getByRole('article', { name: renovation.name }).getByRole('link', { name: 'Open zone' }).click();
  await page.getByRole('link', { name: 'Capture Existing Conditions' }).click();
  await page.getByRole('button', { name: 'Start capture visit' }).click();
  await page.getByLabel('Capture step').selectOption('overview');
  const original = await readFile('tests/fixtures/item-photo.png');
  await page.getByLabel('Photo or import file').setInputFiles({ name: 'item-photo.png', mimeType: 'image/png', buffer: original });
  await page.getByRole('button', { name: 'Save evidence' }).click();
  await expect(page.getByText('item-photo.png')).toBeVisible();
  await page.getByRole('button', { name: 'Show derived preview' }).click();
  await expect(page.getByRole('img', { name: 'Derived preview of item-photo.png' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('item-photo.png')).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download HOMEFORGE backup' }).click();
  const backup = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  const [asset] = Object.values(backup.evidenceAssets as Record<string, string>);
  expect(Buffer.from(asset, 'base64')).toEqual(original);
  await page.goto('/');
  await page.getByRole('button', { name: 'Restore HOMEFORGE backup', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Restore library backup', exact: true });
  const choose = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Choose backup file', exact: true }).click();
  await (await choose).setFiles({ name: 'homeforge.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await dialog.getByRole('button', { name: 'Restore as copies', exact: true }).click();
  await expect(dialog).toContainText('1 HOMEFORGE workspace restored');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  const restored = Object.values(await storedRecords(page, 'homeforgeZones')).map(raw => JSON.parse(raw));
  expect(restored).toHaveLength(2);
  expect(restored.find(zone => zone.workspaceId !== workspace.id)?.evidence[0].name).toBe('item-photo.png');
  const anotherDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download HOMEFORGE backup', exact: true }).click();
  const copiedBackup = JSON.parse(await readFile((await (await anotherDownload).path())!, 'utf8'));
  expect(Object.values(copiedBackup.evidenceAssets as Record<string, string>).map(encoded => Buffer.from(encoded, 'base64')))
    .toEqual([original, original]);
});

test('RoomPlan evidence opens a draft review without changing Existing', async ({ page }) => {
  const source: any = JSON.parse(JSON.parse(await readFile('tests/fixtures/library-backup.json', 'utf8')).projects['qa-library-restore']);
  await page.addInitScript(project => { localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) })); }, source);
  await page.goto('/'); await createWorkspace(page); await createRenovation(page, 'Entry', source.id);
  const before = await savedProjects(page);
  const workspace: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
  const renovation = workspace.renovationProjects[0];
  await page.getByRole('article', { name: renovation.name }).getByRole('link', { name: 'Open zone' }).click();
  const element = page.getByLabel('Existing element');
  await element.selectOption((await element.locator('option').filter({ hasText: 'door 1' }).getAttribute('value'))!);
  await page.getByLabel('Feature label').fill('D1');
  await page.getByRole('button', { name: 'Save feature' }).click();
  await page.getByRole('link', { name: 'Capture Existing Conditions' }).click();
  await page.getByRole('button', { name: 'Start capture visit' }).click();
  await page.getByLabel('Evidence type').selectOption('roomplan');
  await page.getByLabel('Photo or import file').setInputFiles({ name: 'handoff-roomplan.json', mimeType: 'application/json',
    buffer: await readFile('tests/fixtures/handoff-roomplan.json') });
  await page.getByRole('button', { name: 'Save evidence' }).click();
  await page.getByRole('button', { name: 'Review RoomPlan draft' }).click();
  await expect(page.getByRole('region', { name: 'RoomPlan draft review' })).toContainText('Draft only');
  await page.getByLabel('RoomPlan dimension').selectOption((await page.getByLabel('RoomPlan dimension').locator('option').filter({ hasText: 'door 1 width' }).getAttribute('value'))!);
  await page.getByLabel('Matching Existing feature').selectOption({ label: 'D1' });
  await page.getByRole('button', { name: 'Record RoomPlan dimension' }).click();
  await expect(page.getByRole('status')).toContainText('Draft dimension recorded');
  const zones = Object.values(await storedRecords(page, 'homeforgeZones')).map(raw => JSON.parse(raw));
  expect(zones[0].measurements[0]).toMatchObject({ source: 'scan-derived', property: 'door.width', evidenceIds: [zones[0].evidence[0].id] });
  await page.getByRole('link', { name: 'Zone overview' }).click();
  await page.getByRole('link', { name: 'Open Existing Conditions' }).click();
  await page.getByRole('button', { name: 'Review door.width observation' }).click();
  const review = page.getByRole('dialog', { name: 'Review Existing correction proposal' });
  await expect(review).toContainText('scan-derived');
  await expect(review).toContainText('handoff-roomplan.json');
  await review.getByRole('button', { name: 'Cancel' }).click();
  expect(await savedProjects(page)).toEqual(before);
});

test('manual dimension proposal previews, cancels and saves only in correction mode', async ({ page }) => {
  const source: any = JSON.parse(JSON.parse(await readFile('tests/fixtures/library-backup.json', 'utf8')).projects['qa-library-restore']);
  await page.addInitScript(project => { localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) })); }, source);
  await page.goto('/'); await createWorkspace(page); await createRenovation(page, 'Entry', source.id);
  await page.getByRole('article', { name: 'Entry' }).getByRole('link', { name: 'Open zone' }).click();
  const element = page.getByLabel('Existing element');
  await element.selectOption((await element.locator('option').filter({ hasText: 'door 1' }).getAttribute('value'))!);
  await page.getByLabel('Feature label').fill('D1');
  await page.getByRole('button', { name: 'Save feature' }).click();
  await page.getByLabel('Measurement property').selectOption('door.width');
  await page.getByLabel('Measured value').fill('36');
  await page.getByLabel('Measurement unit').selectOption('in');
  await page.getByRole('button', { name: 'Save measurement' }).click();
  const before = (await savedProjects(page))[source.id].floors[0].doors[0].width;
  await page.getByRole('link', { name: 'Open Existing Conditions' }).click();
  await page.getByRole('button', { name: 'Review door.width observation' }).click();
  const review = page.getByRole('dialog', { name: 'Review Existing correction proposal' });
  await expect(review).toContainText('Proposed geometry');
  await review.getByRole('button', { name: 'Cancel' }).click();
  expect((await savedProjects(page))[source.id].floors[0].doors[0].width).toBe(before);
  await page.getByLabel('Exact legend command').fill('D1 is 36 inches wide.');
  await page.getByRole('button', { name: 'Review command' }).click();
  await review.getByRole('button', { name: 'Accept and save correction' }).click();
  await expect(review.getByRole('alert')).toContainText('correction mode');
  await review.getByRole('button', { name: 'Cancel' }).click();
  expect((await savedProjects(page))[source.id].floors[0].doors[0].width).toBe(before);
  await page.getByRole('button', { name: 'Begin correction', exact: true }).click();
  await page.getByRole('button', { name: 'Start correction', exact: true }).click();
  await page.getByRole('button', { name: 'Review door.width observation' }).click();
  await review.getByRole('button', { name: 'Accept and save correction' }).click();
  await expect(review).not.toBeVisible();
  await expect.poll(async () => (await savedProjects(page))[source.id].floors[0].doors[0].width).toBe(91.44);
  await page.getByRole('button', { name: 'Clone to option', exact: true }).click();
  await page.getByRole('dialog', { name: 'Create design option' }).getByRole('button', { name: 'Create option' }).click();
  await expect(page.getByRole('navigation', { name: 'HOMEFORGE editor context' })).toContainText('Option A');
  const metadata: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
  const option = metadata.renovationProjects[0].variants.find((item: any) => item.kind === 'option');
  await expect(page.getByLabel('Design variant')).toHaveValue(option.id);
  await expect(page.getByLabel('Exact legend command')).toBeEnabled();
  await page.getByLabel('Exact legend command').fill('D1 is 40 inches wide.');
  await expect(page.getByLabel('Exact legend command')).toHaveValue('D1 is 40 inches wide.');
  await page.getByRole('button', { name: 'Review command' }).click();
  const optionReview = page.getByRole('dialog', { name: 'Review option edit proposal' });
  await optionReview.getByRole('button', { name: 'Accept and save edit' }).click();
  await expect(optionReview).not.toBeVisible();
  await expect.poll(async () => (await savedProjects(page))[option.projectId].floors[0].doors[0].width).toBe(101.6);
  expect((await savedProjects(page))[source.id].floors[0].doors[0].width).toBe(91.44);
  await page.getByRole('button', { name: 'Back to zone' }).click();
  const comparison = page.getByRole('region', { name: 'Compare and export' });
  await expect(comparison).toContainText('D1 · door.width');
  await expect(comparison).toContainText('101.60');
  const download = page.waitForEvent('download');
  await comparison.getByRole('button', { name: 'Download dimension comparison CSV' }).click();
  const csv = await readFile((await (await download).path())!, 'utf8');
  expect(csv).toContain('"D1","","door.width","36","in","manually measured"');
  expect(csv).toContain('"91.44","bound","101.6","bound"');
});

test('sample front entry and stair workflow compares two options and restores capture', async ({ page }) => {
  test.setTimeout(120_000);
  const externalRequests: string[] = [];
  page.on('request', request => {
    if (request.url().startsWith('http') && new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url());
  });
  const source: any = JSON.parse(JSON.parse(await readFile('tests/fixtures/library-backup.json', 'utf8')).projects['qa-library-restore']);
  source.floors[0].stairs.push({ id: 'qa-stair', position: { x: 120, y: 120 }, rotation: 0, width: 100,
    depth: 300, riserCount: 14, direction: 'up', stairType: 'straight' });
  await page.addInitScript(project => { localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) })); }, source);
  await page.goto('/'); await createWorkspace(page); await createRenovation(page, 'Sample front entry and stairs', source.id);
  await page.getByRole('article', { name: 'Sample front entry and stairs' }).getByRole('link', { name: 'Open zone' }).click();
  for (const [element, label] of [['Ground Floor / door 1', 'D1'], ['Ground Floor / stair 1', 'S1']]) {
    await page.getByLabel('Existing element').selectOption({ label: element });
    await page.getByLabel('Feature label').fill(label);
    await page.getByRole('button', { name: 'Save feature' }).click();
    await expect(page.getByRole('list', { name: 'Feature legend' })).toContainText(label);
  }
  for (const [feature, property, value] of [['D1', 'door.width', '90.5'], ['S1', 'stair.width', '100'], ['S1', 'stair.totalRise', '280']]) {
    await page.getByRole('combobox', { name: 'Feature', exact: true }).selectOption({ label: feature });
    await page.getByLabel('Measurement property').selectOption(property);
    await page.getByLabel('Measured value').fill(value);
    await page.getByRole('button', { name: 'Save measurement' }).click();
    await expect(page.getByRole('list', { name: 'Feature legend' })).toContainText(`${property}: ${value} cm`);
  }
  await page.getByRole('list', { name: 'Feature legend' }).getByRole('button', { name: 'Verify against Existing' }).first().click();
  await expect(page.getByRole('list', { name: 'Feature legend' })).toContainText('current');
  await page.getByRole('link', { name: 'Capture Existing Conditions' }).click();
  await page.getByRole('button', { name: 'Start capture visit' }).click();
  const photo = await readFile('tests/fixtures/item-photo.png');
  for (const [category, scope, name] of [['overview', 'context', 'entry-overview.png'], ['opening', 'focus', 'stair-detail.png']]) {
    await page.getByLabel('Capture step').selectOption(category);
    await page.getByLabel('Area').selectOption(scope);
    await page.getByLabel('Photo or import file').setInputFiles({ name, mimeType: 'image/png', buffer: photo });
    await page.getByRole('button', { name: 'Save evidence' }).click();
    await expect(page.getByRole('region', { name: 'Saved evidence' })).toContainText(name);
  }
  await page.getByRole('link', { name: 'Zone overview' }).click();
  for (const optionName of ['Option A', 'Option B']) {
    await page.getByRole('link', { name: 'Open Existing Conditions', exact: true }).click();
    await page.getByRole('button', { name: 'Clone to option', exact: true }).click();
    await page.getByRole('dialog', { name: 'Create design option' }).getByRole('button', { name: 'Create option' }).click();
    await expect(page.getByRole('navigation', { name: 'HOMEFORGE editor context' })).toContainText(optionName);
    await page.getByRole('button', { name: 'Back to zone' }).click();
  }
  await page.getByRole('link', { name: 'Open Option A' }).click();
  await page.getByLabel('Exact legend command').fill('S1 is 110 centimeters wide.');
  await page.getByRole('button', { name: 'Review command' }).click();
  const proposal = page.getByRole('dialog', { name: 'Review option edit proposal' });
  await proposal.getByRole('button', { name: 'Accept and save edit' }).click();
  await expect(proposal).not.toBeVisible();
  await page.getByRole('button', { name: 'Back to zone' }).click();
  const comparison = page.getByRole('region', { name: 'Compare and export' });
  await expect(comparison).toContainText('S1 · stair.width');
  await expect(comparison).toContainText('Option B saved cm');
  await expect(comparison.getByRole('row', { name: /S1 · stair.width/ })).toContainText('110.00');
  const csvDownload = page.waitForEvent('download');
  await comparison.getByRole('button', { name: 'Download dimension comparison CSV' }).click();
  const csv = await readFile((await (await csvDownload).path())!, 'utf8');
  expect(csv).toContain('"S1","","stair.width","100","cm","manually measured"');
  expect(csv).toContain('"D1","","door.width","90.5","cm","manually measured"');
  expect(csv).toContain('"100","bound","110","bound","100","bound"');
  await page.getByRole('link', { name: 'Open Option A' }).click();
  await expect(page.getByRole('button', { name: '2D', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('button', { name: '3D', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).press('l');
  await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
  await page.getByRole('button', { name: 'Elevation', exact: true }).first().click();
  await expect(page.getByLabel('Wall elevation editor canvas', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to zone' }).click();
  const backupDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download HOMEFORGE backup', exact: true }).click();
  const backup = JSON.parse(await readFile((await (await backupDownload).path())!, 'utf8'));
  expect(Object.values(backup.evidenceAssets as Record<string, string>).map(value => Buffer.from(value, 'base64')))
    .toEqual([photo, photo]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Restore HOMEFORGE backup', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Restore library backup', exact: true });
  const chooser = page.waitForEvent('filechooser');
  await dialog.getByRole('button', { name: 'Choose backup file', exact: true }).click();
  await (await chooser).setFiles({ name: 'sample-homeforge.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await dialog.getByRole('button', { name: 'Restore as copies' }).click();
  await expect(dialog).toContainText('1 HOMEFORGE workspace restored');
  expect(externalRequests).toEqual([]);
});

test('phone stair width stays reachable while Existing remains protected', async ({ page }) => {
  const source: any = JSON.parse(JSON.parse(await readFile('tests/fixtures/library-backup.json', 'utf8')).projects['qa-library-restore']);
  source.floors[0].stairs.push({ id: 'qa-stair', position: { x: 120, y: 120 }, rotation: 0, width: 100,
    depth: 300, riserCount: 14, direction: 'up', stairType: 'straight' });
  await page.addInitScript(project => { localStorage.setItem('floorplan_projects', JSON.stringify({ [project.id]: JSON.stringify(project) })); }, source);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await createWorkspace(page); await createRenovation(page, 'Phone stairs', source.id);
  await page.getByRole('article', { name: 'Phone stairs' }).getByRole('link', { name: 'Open Existing Conditions', exact: true }).click();
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('button', { name: '🪜 Stair 1' }).click();
  const width = page.locator('[data-plan-properties]').getByLabel('Width (cm)');
  await expect(width).toBeVisible();
  await expect(width).toHaveValue('100');
  await expect(page.getByRole('region', { name: 'Baseline protection' })).toContainText('Protected');
  await page.getByRole('button', { name: 'Clone to option', exact: true }).click();
  await page.getByRole('dialog', { name: 'Create design option' }).getByRole('button', { name: 'Create option' }).click();
  await expect(page.getByRole('navigation', { name: 'HOMEFORGE editor context' })).toContainText('Option A');
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('button', { name: '🪜 Stair 1' }).click();
  await width.fill('110');
  await expect.poll(async () => Object.values(await savedProjects(page)).some((project: any) => project.id !== source.id && project.floors[0].stairs[0].width === 110)).toBe(true);
  expect((await savedProjects(page))[source.id].floors[0].stairs[0].width).toBe(100);
});

test('zone overview does not open missing or unrelated geometry', async ({ page }) => {
  await page.goto('/'); await createWorkspace(page); await createRenovation(page);
  const workspace: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
  const zone = workspace.renovationProjects[0];
  await page.evaluate(async id => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('openplan3d-local');
      opening.onsuccess = () => resolve(opening.result); opening.onerror = () => reject(opening.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').delete(id);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, zone.variants[0].projectId);
  await page.goto(`/zone?workspace=${workspace.id}&renovation=${zone.id}`);
  await expect(page.getByRole('alert')).toContainText('missing');
  await expect(page.getByRole('link', { name: 'Open Existing Conditions' })).toHaveCount(0);
  await page.goto('/zone?workspace=wrong&renovation=wrong');
  await expect(page.getByRole('alert')).toContainText('unavailable');
  await expect(page.getByRole('link', { name: 'Open Existing Conditions' })).toHaveCount(0);
});

for (const width of [1440, 700, 390]) {
  test(`workspace and Existing Conditions persist and open the exact editor project at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 }); await page.goto('/');
    await createWorkspace(page); await createRenovation(page);
    const metadata = await storedRecords(page, 'homeforgeWorkspaces');
    const workspace: any = JSON.parse(Object.values(metadata)[0]);
    const id = workspace.renovationProjects[0].variants[0].projectId;
    const before = await savedProjects(page);
    await page.reload(); await expect(page.getByRole('article', { name: 'Front entry', exact: true })).toBeVisible();
    await testInfo.attach('homeforge-dashboard', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
    await page.getByRole('article', { name: 'Front entry', exact: true }).getByRole('link', { name: 'Open Existing Conditions', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`id=${encodeURIComponent(id)}`));
    await expect(page.getByRole('application')).toBeVisible();
    const identity = page.getByRole('navigation', { name: 'HOMEFORGE editor context' });
    await expect(identity).toContainText('My home');
    await expect(identity).toContainText('Front entry');
    await expect(identity).toContainText('Existing Conditions');
    if (width < 768) {
      await page.getByRole('button', { name: 'Toggle tools panel', exact: true }).click();
      expect(await page.locator('div.max-md\\:fixed').evaluate(el => el.getBoundingClientRect().top)).toBe(192);
      await page.getByRole('button', { name: 'Toggle tools panel', exact: true }).click();
    }
    if (testInfo.project.name === 'chromium' && width === 1440)
      await page.screenshot({ path: 'HOMEFORGE_DOCS/EVIDENCE/M2_5_EDITOR.png' });
    expect(Object.keys(await savedProjects(page))).toEqual(Object.keys(before)); expect(errors).toEqual([]);
    expect((await savedProjects(page))[id].floors).toEqual(before[id].floors);
    await identity.getByRole('button', { name: 'Return to renovations' }).click();
    await expect(page.getByRole('article', { name: 'Front entry', exact: true })).toBeVisible();
  });

  test(`HOMEFORGE backup restores independent workspace copies at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/');
    await createWorkspace(page); await createRenovation(page);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download HOMEFORGE backup', exact: true }).click();
    const download = await pending, raw = await readFile((await download.path())!, 'utf8');
    expect(JSON.parse(raw).format).toBe('homeforge-library');
    await page.getByRole('button', { name: 'Restore HOMEFORGE backup', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Restore library backup', exact: true });
    const choose = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: 'Choose backup file', exact: true }).click();
    await (await choose).setFiles({ name: 'homeforge.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
    await expect(dialog).toContainText('1 HOMEFORGE workspace ready');
    await dialog.getByRole('button', { name: 'Restore as copies', exact: true }).click();
    await expect(dialog).toContainText('1 HOMEFORGE workspace restored');
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(page.getByLabel('Home workspace', { exact: true })).toContainText('My home (Restored copy)');
    expect(Object.keys(await storedRecords(page, 'homeforgeWorkspaces'))).toHaveLength(2);
    expect(Object.keys(await savedProjects(page))).toHaveLength(2);
  });
}

test('adopts standalone geometry and metadata removal retains the saved editor project', async ({ page }) => {
  const source: any = JSON.parse(JSON.parse(await readFile('tests/fixtures/library-backup.json', 'utf8')).projects['qa-library-restore']);
  await page.addInitScript(source => { localStorage.setItem('floorplan_projects', JSON.stringify({ [source.id]: JSON.stringify(source) })); }, source);
  await page.goto('/'); await expect(page.getByRole('link', { name: source.name, exact: true })).toBeVisible();
  const before = await storedRecords(page);
  await createWorkspace(page); await createRenovation(page, 'Entry', source.id);
  expect(await storedRecords(page)).toEqual(before);
  await page.getByRole('button', { name: 'Remove workspace metadata', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Remove workspace metadata', exact: true });
  await expect(dialog).toContainText('Saved editor projects, photos and history are retained');
  await dialog.getByRole('button', { name: 'Remove metadata', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('Home workspace', { exact: true })).toHaveCount(0);
  expect(await storedRecords(page, 'homeforgeWorkspaces')).toEqual({}); expect(await storedRecords(page)).toEqual(before);
  await expect(page.getByRole('link', { name: source.name, exact: true })).toBeVisible();
  await page.getByRole('link', { name: source.name, exact: true }).click();
  await expect(page.getByRole('application')).toBeVisible();
});

test('unchanged workspace selection retains a renovation draft', async ({ page }) => {
  await page.goto('/'); await createWorkspace(page);
  const workspace: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
  await page.getByRole('button', { name: 'New renovation', exact: true }).click();
  await page.getByLabel('Renovation name', { exact: true }).fill('Draft entry');
  await page.getByLabel('Home workspace', { exact: true }).selectOption(workspace.id);
  await expect(page.getByLabel('Renovation name', { exact: true })).toHaveValue('Draft entry');
});

test('background refresh does not move the renovation opening link during a click', async ({ page }) => {
  await page.goto('/'); await createWorkspace(page); await createRenovation(page);
  await expect(page.getByRole('status').filter({ hasText: 'Loading workspaces' })).toHaveCount(0);
  const bounds = await page.evaluate(async () => {
    const link = [...document.querySelectorAll('a')].find(a => a.textContent === 'Open Existing Conditions')!;
    const before = link.getBoundingClientRect().y;
    window.dispatchEvent(new Event('focus'));
    await Promise.resolve(); await Promise.resolve();
    return { before, after: link.getBoundingClientRect().y };
  });
  expect(bounds.after).toBe(bounds.before);
});

test('options switch with saved edits, reset tools and survive editor and dashboard reload', async ({ page }, testInfo) => {
  await page.goto('/'); await createWorkspace(page); await createRenovation(page);
  await page.getByRole('link', { name: 'Open Existing Conditions', exact: true }).click();
  await page.getByRole('button', { name: /^Draw Wall/ }).click();
  await page.getByRole('button', { name: 'Clone to option', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create design option' });
  await dialog.getByLabel('Option name', { exact: true }).fill('Option A');
  await dialog.getByRole('button', { name: 'Create option', exact: true }).click();
  await expect(page.getByLabel('Design variant', { exact: true })).toContainText('Option A');
  const workspace: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
  const renovation = workspace.renovationProjects[0], option = renovation.variants.find((v: any) => v.kind === 'option');
  await expect(page).toHaveURL(new RegExp(`id=${option.projectId}`));
  await expect(page.getByRole('button', { name: /^Select V/ })).toHaveClass(/bg-blue-50/);
  await expect(page.getByRole('button', { name: /^Draw Wall/ })).not.toHaveClass(/bg-blue-50/);
  await page.getByRole('button', { name: 'Option A', exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Option edited');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  await page.getByLabel('Design variant', { exact: true }).selectOption(renovation.existingVariantId);
  await expect(page).toHaveURL(new RegExp(`id=${renovation.variants[0].projectId}`));
  expect((await savedProjects(page))[option.projectId].name).toBe('Option edited');
  await page.getByLabel('Design variant', { exact: true }).selectOption(option.id);
  await expect(page).toHaveURL(new RegExp(`id=${option.projectId}`));
  await page.reload(); await expect(page.getByRole('button', { name: 'Option edited', exact: true })).toBeVisible();
  await expect(page.getByLabel('Design variant', { exact: true })).toHaveValue(option.id);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'HOMEFORGE_DOCS/EVIDENCE/M2_5_OPTION.png' });
  await page.getByRole('button', { name: 'Return to renovations' }).click();
  await page.reload(); await page.getByRole('link', { name: 'Continue Option A', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`id=${option.projectId}`));
  await expect(page.getByRole('application')).toBeVisible();
  await page.getByRole('button', { name: 'Return to renovations' }).click();
  await page.getByRole('link', { name: 'Open Existing Conditions', exact: true }).click();
  await expect(page.getByRole('application')).toBeVisible();
  expect(JSON.parse((await storedRecords(page, 'homeforgeWorkspaces'))[workspace.id]).renovationProjects[0].activeVariantId).toBe(renovation.existingVariantId);
});

test('failed option save blocks switching and preserves the active pointer until retry', async ({ page }) => {
  await page.goto('/'); await createWorkspace(page); await createRenovation(page);
  await page.getByRole('link', { name: 'Open Existing Conditions', exact: true }).click();
  await page.getByRole('button', { name: 'Clone to option', exact: true }).click();
  await page.getByRole('dialog', { name: 'Create design option' }).getByRole('button', { name: 'Create option', exact: true }).click();
  await expect(page.getByLabel('Design variant', { exact: true })).toContainText('Option A');
  const workspace: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]), renovation = workspace.renovationProjects[0];
  const option = renovation.variants.find((v: any) => v.kind === 'option');
  await expect(page).toHaveURL(new RegExp(`id=${option.projectId}`));
  await page.evaluate(() => {
    (window as any).blockOptionSave = true;
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && (window as any).blockOptionSave) throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Option A', exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Pending option');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  await page.getByLabel('Design variant', { exact: true }).selectOption(renovation.existingVariantId);
  await expect(page.getByRole('alert').filter({ hasText: 'latest edits could not be saved' })).toBeVisible();
  await expect(page.getByLabel('Design variant', { exact: true })).toHaveValue(option.id);
  await expect(page).toHaveURL(new RegExp(`id=${option.projectId}`));
  expect(JSON.parse((await storedRecords(page, 'homeforgeWorkspaces'))[workspace.id]).renovationProjects[0].activeVariantId).toBe(option.id);
  await page.evaluate(() => { (window as any).blockOptionSave = false; });
  await page.getByLabel('Design variant', { exact: true }).selectOption(renovation.existingVariantId);
  await expect(page).toHaveURL(new RegExp(`id=${renovation.variants[0].projectId}`));
  expect((await savedProjects(page))[option.projectId].name).toBe('Pending option');
});

test('back to zone retains unsaved edits when persistence fails and recovers after retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/'); await createWorkspace(page); await createRenovation(page);
  await page.getByRole('link', { name: 'Open Existing Conditions', exact: true }).click();
  await expect(page.getByRole('application')).toBeVisible();
  await page.getByRole('button', { name: 'Begin correction', exact: true }).click();
  await page.getByRole('button', { name: 'Start correction', exact: true }).click();
  await page.evaluate(() => {
    (window as any).homeforgeSaveFailure = true;
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && (window as any).homeforgeSaveFailure) throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Front entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Corrected entry');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  await page.getByRole('button', { name: 'Back to zone' }).click({ timeout: 5000 });
  await expect(page.getByRole('alert').filter({ hasText: 'latest edits could not be saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle tools panel', exact: true }).click();
  const drawerTop = await page.locator('div.max-md\\:fixed').evaluate(el => el.getBoundingClientRect().top);
  expect(drawerTop).toBe(192);
  await page.getByRole('button', { name: 'Toggle tools panel', exact: true }).click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.getByRole('button', { name: 'Corrected entry', exact: true })).toBeVisible();
  await page.evaluate(() => { (window as any).homeforgeSaveFailure = false; });
  await page.getByRole('button', { name: 'Back to zone' }).click();
  await expect(page.getByRole('heading', { name: 'Front entry', exact: true })).toBeVisible();
  expect(Object.values(await savedProjects(page))[0].name).toBe('Corrected entry');
});

test('a committed creation blocks further mutations until a failed refresh recovers', async ({ page }) => {
  await page.goto('/'); await createWorkspace(page);
  await page.getByRole('button', { name: 'New renovation', exact: true }).click();
  await page.getByLabel('Renovation name', { exact: true }).fill('Entry');
  await page.evaluate(() => {
    (window as any).failHomeforgeRefresh = true;
    const original = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (...args) {
      if (this.name === 'homeforgeWorkspaces' && this.transaction.mode === 'readonly' && (window as any).failHomeforgeRefresh)
        throw new DOMException('Read interrupted', 'UnknownError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Create renovation', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('The change was saved');
  await expect(page.getByRole('button', { name: 'New renovation', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'New home workspace', exact: true })).toBeDisabled();
  await page.evaluate(() => { (window as any).failHomeforgeRefresh = false; });
  await page.getByRole('button', { name: 'Refresh workspaces', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Entry', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New renovation', exact: true })).toBeEnabled();
  const workspace: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
  expect(workspace.renovationProjects).toHaveLength(1);
});

test('first visit reaches the homeowner dashboard without creating a standalone plan', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Organize a renovation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New home workspace', exact: true })).toBeFocused();
  await createWorkspace(page);
  expect(await savedProjects(page)).toEqual({});
});

test('missing HOMEFORGE references show recovery and never create substitute plans', async ({ page }) => {
  await page.goto('/'); await createWorkspace(page); await createRenovation(page);
  const workspace: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
  const r = workspace.renovationProjects[0], id = r.variants[0].projectId;
  const href = await page.getByRole('link', { name: 'Open Existing Conditions', exact: true }).getAttribute('href');
  await page.evaluate(id => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('openplan3d-local'); req.onerror = () => reject(req.error);
    req.onsuccess = () => { const db = req.result, tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').delete(id); tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); }; };
  }), id);
  await page.reload(); await expect(page.getByRole('article', { name: 'Front entry', exact: true })).toContainText('Saved plan is missing');
  await expect(page.getByRole('link', { name: 'Open Existing Conditions', exact: true })).toHaveCount(0);
  await page.goto(href!); await expect(page.getByRole('alert')).toContainText('Existing Conditions');
  expect(await storedRecords(page)).toEqual({}); await expect(page.getByRole('application')).toHaveCount(0);
});


test('baseline protection requires intentional correction, preserves edits on failure and returns on reload and standalone access', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await createWorkspace(page); await createRenovation(page);
  await page.getByRole('link', { name: 'Open Existing Conditions', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Baseline protection' })).toContainText('Protected');
  const before = await savedProjects(page), id = Object.keys(before)[0];
  await page.getByRole('button', { name: 'Front entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Accidental');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'Existing Conditions is protected' })).toBeVisible();
  expect(await savedProjects(page)).toEqual(before);
  await page.getByRole('button', { name: 'Begin correction', exact: true }).click();
  await page.getByRole('button', { name: 'Start correction', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Baseline protection' })).toContainText('Correction mode');
  await page.evaluate(() => {
    (window as any).blockCorrection = true;
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && (window as any).blockCorrection) throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Front entry', exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Corrected baseline');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  await page.getByRole('button', { name: 'Finish corrections', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'latest edits could not be saved' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finish corrections', exact: true })).toBeVisible();
  expect(await savedProjects(page)).toEqual(before);
  await page.evaluate(() => { (window as any).blockCorrection = false; });
  await page.getByRole('button', { name: 'Finish corrections', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Begin correction', exact: true })).toBeVisible();
  expect((await savedProjects(page))[id].name).toBe('Corrected baseline');
  await page.getByRole('button', { name: 'Begin correction', exact: true }).click();
  await page.getByRole('button', { name: 'Start correction', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Baseline protection' })).toContainText('Protected');
  await page.goto(`/editor?id=${id}`);
  await expect(page.getByRole('region', { name: 'Baseline protection' })).toContainText('Protected');
  await expect(page.getByRole('application')).toBeVisible();
  expect((await savedProjects(page))[id].name).toBe('Corrected baseline');
  expect(errors).toEqual([]);
});


for (const width of [1440, 390]) {
  test(`option removal protects provenance, retries failures and retains projects at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/'); await createWorkspace(page); await createRenovation(page);
    await page.getByRole('link', { name: 'Open Existing Conditions', exact: true }).click();
    for (const name of ['Option A', 'Option B']) {
      await page.getByRole('button', { name: 'Clone to option', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Create design option' });
      await dialog.getByLabel('Option name', { exact: true }).fill(name);
      await dialog.getByRole('button', { name: 'Create option', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expect(page.getByLabel('Design variant', { exact: true })).toContainText(name);
    }
    await page.getByRole('button', { name: 'Return to renovations' }).click();
    const before = await storedRecords(page);
    await page.getByRole('button', { name: 'Remove Option A', exact: true }).click();
    const removal = page.getByRole('dialog', { name: 'Remove design option' });
    await removal.getByRole('button', { name: 'Remove option', exact: true }).click();
    await expect(removal.getByRole('alert')).toContainText('descendant options first');
    await removal.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Remove Option B', exact: true }).click();
    await page.evaluate(() => {
      (window as any).blockRemoval = true;
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'homeforgeWorkspaces' && (window as any).blockRemoval) throw new DOMException('Full', 'QuotaExceededError');
        return original.apply(this, args);
      };
    });
    await removal.getByRole('button', { name: 'Remove option', exact: true }).click();
    await expect(removal.getByRole('alert')).toContainText('Browser storage is full');
    const failed: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
    expect(failed.renovationProjects[0].variants).toHaveLength(3);
    await page.evaluate(() => { (window as any).blockRemoval = false; });
    await removal.getByRole('button', { name: 'Remove option', exact: true }).click();
    await expect(removal).not.toBeVisible();
    await page.getByRole('button', { name: 'Remove Option A', exact: true }).click();
    await removal.getByRole('button', { name: 'Remove option', exact: true }).click();
    await expect(removal).not.toBeVisible(); await page.reload();
    await expect(page.getByRole('article', { name: 'Front entry', exact: true })).toBeVisible();
    const saved: any = JSON.parse(Object.values(await storedRecords(page, 'homeforgeWorkspaces'))[0]);
    expect(saved.renovationProjects[0].variants).toHaveLength(1);
    expect(saved.renovationProjects[0].activeVariantId).toBe(saved.renovationProjects[0].existingVariantId);
    expect(await storedRecords(page)).toEqual(before);
    await expect(page.getByRole('list', { name: 'Design options' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Option A', exact: true })).toBeVisible();
  });
}

test('damaged metadata archives exact bytes atomically, retries and exports recovery without hiding healthy projects', async ({ page }, testInfo) => {
  await page.goto('/'); await createWorkspace(page); await createRenovation(page);
  const before = await storedRecords(page), damaged = '{exact damaged wrapper bytes';
  await page.evaluate(raw => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('openplan3d-local'); req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result, tx = db.transaction('homeforgeWorkspaces', 'readwrite');
      tx.objectStore('homeforgeWorkspaces').put(raw, 'damaged');
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), damaged);
  await page.getByRole('button', { name: 'Refresh workspaces', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Unreadable workspace metadata' })).toBeVisible();
  await page.getByRole('button', { name: 'Archive unreadable metadata', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Archive unreadable metadata' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await storedRecords(page, 'homeforgeWorkspaces')).damaged).toBe(damaged);
  await page.getByRole('button', { name: 'Archive unreadable metadata', exact: true }).click();
  await page.evaluate(() => {
    (window as any).blockArchive = true;
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args) {
      if (this.name === 'meta' && (window as any).blockArchive) throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await dialog.getByRole('button', { name: 'Archive metadata', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Browser storage is full');
  expect((await storedRecords(page, 'homeforgeWorkspaces')).damaged).toBe(damaged);
  expect(Object.keys(await storedRecords(page, 'meta')).filter(k => k.startsWith('library-recovery:'))).toHaveLength(0);
  await page.evaluate(() => { (window as any).blockArchive = false; });
  await dialog.getByRole('button', { name: 'Archive metadata', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Archive unreadable metadata', exact: true })).toHaveCount(0);
  expect(await storedRecords(page)).toEqual(before);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download HOMEFORGE backup', exact: true }).click();
  const download = await pending, backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  const recovery: any = JSON.parse(Object.values(backup.recovery)[0] as string);
  expect(recovery.metadata.homeforgeWorkspaces.damaged).toBe(damaged);
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'HOMEFORGE_DOCS/EVIDENCE/M2_5_DASHBOARD.png' });
  await page.getByRole('link', { name: 'Open Existing Conditions', exact: true }).click();
  await expect(page.getByRole('application')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Baseline protection' })).toContainText('Protected');
});



test('baseline adoption in another tab blocks unsaved navigation and preserves exportable edits', async ({ page, context }) => {
  const source: any = JSON.parse(JSON.parse(await readFile('tests/fixtures/library-backup.json', 'utf8')).projects['qa-library-restore']);
  // Canonical door orientation prevents legacy default revival from changing the fixture shape.
  for (const floor of source.floors) for (const door of floor.doors) door.flipSide ??= false;
  await context.addInitScript(source => { if (!localStorage.getItem('floorplan_projects')) localStorage.setItem('floorplan_projects', JSON.stringify({ [source.id]: JSON.stringify(source) })); }, source);
  await page.goto('/'); await createWorkspace(page);
  await page.getByRole('link', { name: source.name, exact: true }).click();
  await expect(page.getByRole('application')).toBeVisible();
  await page.evaluate(() => {
    (window as any).blockPendingSave = true;
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && (window as any).blockPendingSave) throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: source.name, exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Pending correction');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  const other = await context.newPage(); await other.goto('/');
  await createRenovation(other, 'Adopted entry', source.id);
  await page.evaluate(() => { (window as any).blockPendingSave = false; });
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Existing Conditions is protected' })).toBeVisible();
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.getByRole('button', { name: 'Pending correction', exact: true })).toBeVisible();
  expect((await savedProjects(page))[source.id].name).toBe(source.name);
  const pending = page.waitForEvent('download');
  await page.getByRole('alert').filter({ hasText: 'Existing Conditions is protected' }).getByRole('button', { name: 'Download JSON backup', exact: true }).click();
  const download = await pending, exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.name).toBe('Pending correction');
  expect(exported.floors).toEqual((await savedProjects(page))[source.id].floors);
  await other.close();
});
