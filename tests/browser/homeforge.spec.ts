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
      await page.screenshot({ path: 'HOMEFORGE_DOCS/EVIDENCE/M2_4_EDITOR.png' });
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
  if (testInfo.project.name === 'chromium') await page.screenshot({ path: 'HOMEFORGE_DOCS/EVIDENCE/M2_4_OPTION.png' });
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

test('editor return retains unsaved edits when persistence fails and recovers after retry', async ({ page }) => {
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
  await page.getByRole('button', { name: 'Return to renovations' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'latest edits could not be saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle tools panel', exact: true }).click();
  const drawerTop = await page.locator('div.max-md\\:fixed').evaluate(el => el.getBoundingClientRect().top);
  expect(drawerTop).toBe(192);
  await page.getByRole('button', { name: 'Toggle tools panel', exact: true }).click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.getByRole('button', { name: 'Corrected entry', exact: true })).toBeVisible();
  await page.evaluate(() => { (window as any).homeforgeSaveFailure = false; });
  await page.getByRole('button', { name: 'Return to renovations' }).click();
  await expect(page.getByRole('article', { name: 'Front entry', exact: true })).toBeVisible();
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
