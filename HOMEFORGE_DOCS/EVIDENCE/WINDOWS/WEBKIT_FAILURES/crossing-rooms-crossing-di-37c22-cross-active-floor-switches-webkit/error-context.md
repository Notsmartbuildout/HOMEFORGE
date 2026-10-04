# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: crossing-rooms.spec.ts >> crossing dividers produce four room slabs across active-floor switches
- Location: tests\browser\crossing-rooms.spec.ts:30:1

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.waitForEvent: Test timeout of 180000ms exceeded.
=========================== logs ===========================
waiting for event "download"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link "Projects" [ref=e5]:
        - /url: /
      - button "Untitled Project" [ref=e10]
      - generic [ref=e12]:
        - combobox "Current floor" [ref=e13]:
          - option "Ground Floor" [selected]
        - button "Add Floor" [ref=e15]: +
        - generic [ref=e16]: 1F
      - button "Undo" [ref=e17]
      - button "Redo" [ref=e21]
      - button "Snap to Grid" [ref=e26]
      - button "Toggle Furniture" [ref=e32]
      - generic [ref=e37]:
        - button "2D" [ref=e38]
        - button "3D" [ref=e39]
      - button "Version History" [ref=e40]
      - button "Area Summary" [ref=e44]
      - button "Settings" [ref=e47]
      - button "Export" [ref=e53]
      - 'generic "Last saved: 2 min ago" [ref=e59]': Saved ✓
      - button "Save" [ref=e60]
    - alert [ref=e61]:
      - generic [ref=e62]:
        - generic [ref=e63]:
          - paragraph [ref=e64]: Couldn’t open plan
          - paragraph [ref=e65]: The object can not be found here. No project was imported.
          - paragraph [ref=e66]: Check the file or save your current plan, then try again.
        - button "Dismiss import error" [ref=e67]: ✕
    - region "3D floor plan viewer" [ref=e70]:
      - generic [ref=e71]:
        - status [ref=e72]: There is no displayed geometry to export.
        - button "Export Blender Scene" [ref=e73]
      - generic [ref=e74]:
        - button "Show All Floors Stacked" [ref=e75]
        - button "Top-Down View" [ref=e80]
        - button "Make Walls Transparent" [ref=e83]
        - button "Edit Mode" [ref=e86]
        - button "Place Interior Camera" [ref=e90]
        - button "Save 3D Screenshot" [ref=e94]
        - button "Enter Walkthrough Mode" [ref=e98]
      - button "Lighting Controls" [ref=e103]
  - button "Toggle Undo History" [ref=e111]: ⟲
  - button "Keyboard Shortcuts" [ref=e112]: "?"
  - generic [ref=e113]: open3dFloorplan
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { resolve } from 'node:path';
  3  | import { readFile } from 'node:fs/promises';
  4  | import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
  5  | 
  6  | function checkCrossingRooms(scene: any, elevation: number) {
  7  |   const slabs = scene.meshes.filter((mesh: any) => {
  8  |     const ys = mesh.vertices.map((p: number[]) => p[1]);
  9  |     return mesh.material === 'floor' && Math.abs(Math.min(...ys) - (elevation - .05)) < 1e-5 && Math.abs(Math.max(...ys) - elevation) < 1e-5;
  10 |   });
  11 |   expect(slabs).toHaveLength(4); // crossing dividers produce four independent room slabs
  12 |   const root = new Group(), material = new MeshBasicMaterial({ side: DoubleSide });
  13 |   for (const mesh of slabs) {
  14 |     const geometry = new BufferGeometry();
  15 |     geometry.setAttribute('position', new Float32BufferAttribute(mesh.vertices.flat(), 3));
  16 |     geometry.setIndex(mesh.faces.flat()); root.add(new Mesh(geometry, material));
  17 |   }
  18 |   root.updateMatrixWorld(true);
  19 |   const hits = (x: number, z: number) => new Raycaster(new Vector3(x, elevation + .1, z), new Vector3(0, -1, 0), 0, .2).intersectObject(root, true).length;
  20 |   for (const x of [1, 5]) for (const z of [1, 3]) expect(hits(x, z)).toBeGreaterThan(0);
  21 |   expect(hits(3, -0.5)).toBe(0); // overhanging divider does not create extra slab
  22 |   for (const slab of slabs) {
  23 |     const xs = slab.vertices.map((v: number[]) => v[0]), zs = slab.vertices.map((v: number[]) => v[2]);
  24 |     expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(3);
  25 |     expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(2);
  26 |   }
  27 |   root.traverse(node => { if (node instanceof Mesh) node.geometry.dispose(); }); material.dispose();
  28 | }
  29 | 
  30 | test('crossing dividers produce four room slabs across active-floor switches', async ({ page }, testInfo) => {
  31 |   test.slow();
  32 |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  33 |   await page.goto('/editor');
  34 |   await page.getByRole('button', { name: 'Export', exact: true }).click();
  35 |   const chooser = page.waitForEvent('filechooser');
  36 |   await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  37 |   await (await chooser).setFiles(resolve('tests/fixtures/crossing-rooms.openplan.json'));
  38 |   await page.getByRole('button', { name: '3D', exact: true }).click();
  39 |   await page.waitForLoadState('networkidle');
  40 |   const hint = page.getByRole('button', { name: 'Got it', exact: true });
  41 |   // The tip auto-dismisses after eight seconds; clicking it races that timer.
  42 |   await expect(hint).toBeHidden({ timeout: 15_000 });
  43 |   async function exported() {
> 44 |     const pending = page.waitForEvent('download');
     |                          ^ Error: page.waitForEvent: Test timeout of 180000ms exceeded.
  45 |     await page.getByRole('button', { name: 'Export Blender Scene', exact: true }).click();
  46 |     return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  47 |   }
  48 |   checkCrossingRooms(await exported(), 0);
  49 |   await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  50 |   const stacked = await exported(); checkCrossingRooms(stacked, 0); checkCrossingRooms(stacked, 4);
  51 |   await testInfo.attach('crossing-rooms-stacked.json', { body: JSON.stringify(stacked), contentType: 'application/json' });
  52 |   await page.getByRole('combobox', { name: 'Current floor', exact: true }).selectOption('slab-floor-1');
  53 |   const switched = await exported(); checkCrossingRooms(switched, 0); checkCrossingRooms(switched, 4);
  54 |   expect(errors).toEqual([]);
  55 | });
  56 | 
```