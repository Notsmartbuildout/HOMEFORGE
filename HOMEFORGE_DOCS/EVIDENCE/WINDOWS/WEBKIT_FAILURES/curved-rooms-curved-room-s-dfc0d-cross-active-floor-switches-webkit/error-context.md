# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: curved-rooms.spec.ts >> curved room slabs follow the wall bulge across active-floor switches
- Location: tests\browser\curved-rooms.spec.ts:27:1

# Error details

```
Error: page.waitForEvent: Test ended.
=========================== logs ===========================
waiting for event "download"
============================================================
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { resolve } from 'node:path';
  3  | import { readFile } from 'node:fs/promises';
  4  | import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
  5  | 
  6  | function checkCurvedRooms(scene: any, elevation: number) {
  7  |   const slabs = scene.meshes.filter((mesh: any) => {
  8  |     const ys = mesh.vertices.map((p: number[]) => p[1]);
  9  |     return mesh.material === 'floor' && Math.abs(Math.min(...ys) - (elevation - .05)) < 1e-5 && Math.abs(Math.max(...ys) - elevation) < 1e-5;
  10 |   });
  11 |   expect(slabs).toHaveLength(1); // one closed curved room
  12 |   const root = new Group(), material = new MeshBasicMaterial({ side: DoubleSide });
  13 |   for (const mesh of slabs) {
  14 |     const geometry = new BufferGeometry();
  15 |     geometry.setAttribute('position', new Float32BufferAttribute(mesh.vertices.flat(), 3));
  16 |     geometry.setIndex(mesh.faces.flat()); root.add(new Mesh(geometry, material));
  17 |   }
  18 |   root.updateMatrixWorld(true);
  19 |   const hits = (x: number, z: number) => new Raycaster(new Vector3(x, elevation + .1, z), new Vector3(0, -1, 0), 0, .2).intersectObject(root, true).length;
  20 |   expect(hits(3, -1)).toBeGreaterThan(0); // bulge beyond the old endpoint chord
  21 |   expect(hits(3, -2)).toBe(0); // outside the curved boundary
  22 |   expect(hits(3, 2)).toBeGreaterThan(0);
  23 |   expect(Math.min(...slabs[0].vertices.map((v: number[]) => v[2]))).toBeCloseTo(-1.5);
  24 |   root.traverse(node => { if (node instanceof Mesh) node.geometry.dispose(); }); material.dispose();
  25 | }
  26 | 
  27 | test('curved room slabs follow the wall bulge across active-floor switches', async ({ page }, testInfo) => {
  28 |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  29 |   await page.goto('/editor');
  30 |   await page.getByRole('button', { name: 'Export', exact: true }).click();
  31 |   const chooser = page.waitForEvent('filechooser');
  32 |   await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  33 |   await (await chooser).setFiles(resolve('tests/fixtures/curved-rooms.openplan.json'));
  34 |   await page.getByRole('button', { name: '3D', exact: true }).click();
  35 |   await page.waitForLoadState('networkidle');
  36 |   const hint = page.getByRole('button', { name: 'Got it', exact: true });
  37 |   await expect(hint).toBeHidden({ timeout: 15_000 });
  38 |   async function exported() {
> 39 |     const pending = page.waitForEvent('download');
     |                          ^ Error: page.waitForEvent: Test ended.
  40 |     await page.getByRole('button', { name: 'Export Blender Scene', exact: true }).click();
  41 |     return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  42 |   }
  43 |   checkCurvedRooms(await exported(), 0);
  44 |   await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  45 |   const stacked = await exported(); checkCurvedRooms(stacked, 0); checkCurvedRooms(stacked, 4);
  46 |   await testInfo.attach('curved-rooms-stacked.json', { body: JSON.stringify(stacked), contentType: 'application/json' });
  47 |   await page.getByRole('combobox', { name: 'Current floor', exact: true }).selectOption('slab-floor-1');
  48 |   const switched = await exported(); checkCurvedRooms(switched, 0); checkCurvedRooms(switched, 4);
  49 |   expect(errors).toEqual([]);
  50 | });
  51 | 
```