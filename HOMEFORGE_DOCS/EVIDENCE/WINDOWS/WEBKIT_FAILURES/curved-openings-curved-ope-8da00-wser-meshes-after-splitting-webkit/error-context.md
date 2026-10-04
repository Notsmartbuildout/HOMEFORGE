# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: curved-openings.spec.ts >> curved openings and trim follow the curve in active and stacked browser meshes after splitting
- Location: tests\browser\curved-openings.spec.ts:23:36

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '─ Wall 1', exact: true })

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
      - generic [ref=e32]:
        - button "Select mode" [ref=e33]
        - button "Pan mode" [ref=e37]
      - button "Toggle Furniture" [ref=e43]
      - generic [ref=e48]:
        - button "Plan" [pressed] [ref=e49]
        - button "Elevation" [ref=e53]
      - generic [ref=e59]:
        - button "2D" [ref=e60]
        - button "3D" [ref=e61]
      - button "Version History" [ref=e62]
      - button "Area Summary" [ref=e66]
      - button "Settings" [ref=e69]
      - button "Export" [ref=e75]
      - 'generic "Last saved: 2 min ago" [ref=e81]': Saved ✓
      - button "Save" [ref=e82]
    - alert [ref=e83]:
      - generic [ref=e84]:
        - generic [ref=e85]:
          - paragraph [ref=e86]: Couldn’t open plan
          - paragraph [ref=e87]: The object can not be found here. No project was imported.
          - paragraph [ref=e88]: Check the file or save your current plan, then try again.
        - button "Dismiss import error" [ref=e89]: ✕
    - generic [ref=e90]:
      - generic [ref=e92]:
        - generic [ref=e93]:
          - button "Build" [ref=e94]
          - button "Rooms" [ref=e95]
          - button "Objects" [ref=e96]
        - generic [ref=e98]:
          - heading "Tools" [level=3] [ref=e99]
          - button "Select V Click to select elements" [ref=e100]:
            - generic [ref=e105]:
              - generic [ref=e106]: Select V
              - generic [ref=e107]: Click to select elements
          - button "Draw Wall W Click to draw, dbl-click to finish" [ref=e108]:
            - generic [ref=e112]:
              - generic [ref=e113]: Draw Wall W
              - generic [ref=e114]: Click to draw, dbl-click to finish
          - heading "Structure" [level=3] [ref=e115]
          - button "Add Stairs Click to place stairs" [ref=e116]:
            - generic [ref=e120]:
              - generic [ref=e121]: Add Stairs
              - generic [ref=e122]: Click to place stairs
          - generic [ref=e123]:
            - button "Round Column" [ref=e124]
            - button "Square Column" [ref=e132]
          - heading "Annotate" [level=3] [ref=e140]
          - button "Text Label Add text annotations (T)" [ref=e141]:
            - generic [ref=e145]:
              - generic [ref=e146]: Text Label
              - generic [ref=e147]: Add text annotations (T)
          - button "Dimension Add dimension annotations (N)" [ref=e148]:
            - generic [ref=e152]:
              - generic [ref=e153]: Dimension
              - generic [ref=e154]: Add dimension annotations (N)
          - button "Measure Measure distances (M)" [ref=e155]:
            - generic [ref=e159]:
              - generic [ref=e160]: Measure
              - generic [ref=e161]: Measure distances (M)
          - heading "Import" [level=3] [ref=e162]
          - button "Import Image Floor plan background" [ref=e163]:
            - generic [ref=e169]:
              - generic [ref=e170]: Import Image
              - generic [ref=e171]: Floor plan background
          - button "Import RoomPlan iOS LiDAR scan (.json/.zip)" [ref=e172]:
            - generic [ref=e177]:
              - generic [ref=e178]: Import RoomPlan
              - generic [ref=e179]: iOS LiDAR scan (.json/.zip)
          - button "Doors ▼" [ref=e180]:
            - heading "Doors" [level=3] [ref=e181]
            - generic [ref=e182]: ▼
          - generic [ref=e183]:
            - button "Single 90cm swing" [ref=e184]:
              - generic [ref=e188]: Single
              - generic [ref=e189]: 90cm swing
            - button "Double 150cm swing" [ref=e190]:
              - generic [ref=e194]: Double
              - generic [ref=e195]: 150cm swing
            - button "Sliding 180cm slide" [ref=e196]:
              - generic [ref=e200]: Sliding
              - generic [ref=e201]: 180cm slide
            - button "French 150cm glass" [ref=e202]:
              - generic [ref=e206]: French
              - generic [ref=e207]: 150cm glass
            - button "Pocket 90cm recess" [ref=e208]:
              - generic [ref=e212]: Pocket
              - generic [ref=e213]: 90cm recess
            - button "Bifold 180cm fold" [ref=e214]:
              - generic [ref=e218]: Bifold
              - generic [ref=e219]: 180cm fold
            - button "Doorway 100cm open" [ref=e220]:
              - generic [ref=e224]: Doorway
              - generic [ref=e225]: 100cm open
            - button "Garage 240cm overhead" [ref=e226]:
              - generic [ref=e230]: Garage
              - generic [ref=e231]: 240cm overhead
          - heading "Windows" [level=3] [ref=e232]
          - generic [ref=e233]:
            - button "Standard 120×120cm" [ref=e234]:
              - generic [ref=e238]: Standard
              - generic [ref=e239]: 120×120cm
            - button "Fixed 100×100cm" [ref=e240]:
              - generic [ref=e244]: Fixed
              - generic [ref=e245]: 100×100cm
            - button "Casement 80×130cm" [ref=e246]:
              - generic [ref=e250]: Casement
              - generic [ref=e251]: 80×130cm
            - button "Sliding 180×120cm" [ref=e252]:
              - generic [ref=e256]: Sliding
              - generic [ref=e257]: 180×120cm
            - button "Bay 200×150cm" [ref=e258]:
              - generic [ref=e262]: Bay
              - generic [ref=e263]: 200×150cm
      - application [ref=e265]:
        - generic "Floor plan editor canvas" [ref=e266]
        - generic:
          - generic:
            - generic: 🏠
            - generic: Start building your floor plan
            - generic: Draw walls with W or drag items from the sidebar
        - generic [ref=e267]:
          - generic [ref=e268]: 0 walls
          - generic [ref=e269]: "|"
          - generic [ref=e270]: "Zoom: 100%"
          - button "⊞ Fit" [ref=e271]
          - button "▦ Grid" [pressed] [ref=e272]
          - button "🧲 Snap" [pressed] [ref=e273]
          - button "🪑 Furniture" [pressed] [ref=e274]
          - button "🗂 Layers" [ref=e275]
          - button "📏 Rulers" [pressed] [ref=e276]
          - button "🗺 Map" [pressed] [ref=e277]
        - generic [ref=e278]:
          - button "Zoom out" [ref=e279]: −
          - button "Zoom to 100%" [ref=e280]: 100%
          - button "Zoom in" [ref=e281]: +
          - button "Zoom to fit" [ref=e283]: ⊞
          - button "Fit selection" [disabled] [ref=e284]: ⊡
      - generic [ref=e285]:
        - generic [ref=e286]: 🗂 Layers
        - generic [ref=e287]:
          - generic [ref=e288]:
            - button "▾ 🧱 Walls 0" [ref=e289]:
              - generic [ref=e290]: ▾
              - generic [ref=e291]: 🧱
              - generic [ref=e292]: Walls
              - generic [ref=e293]: "0"
            - button "👁" [ref=e294] [cursor=pointer]
            - generic [ref=e295]: Empty
          - generic [ref=e296]:
            - button "▾ 🚪 Doors 0" [ref=e297]:
              - generic [ref=e298]: ▾
              - generic [ref=e299]: 🚪
              - generic [ref=e300]: Doors
              - generic [ref=e301]: "0"
            - button "👁" [ref=e302] [cursor=pointer]
            - generic [ref=e303]: Empty
          - generic [ref=e304]:
            - button "▾ 🪟 Windows 0" [ref=e305]:
              - generic [ref=e306]: ▾
              - generic [ref=e307]: 🪟
              - generic [ref=e308]: Windows
              - generic [ref=e309]: "0"
            - button "👁" [ref=e310] [cursor=pointer]
            - generic [ref=e311]: Empty
          - generic [ref=e312]:
            - button "▾ 🪑 Furniture 0" [ref=e313]:
              - generic [ref=e314]: ▾
              - generic [ref=e315]: 🪑
              - generic [ref=e316]: Furniture
              - generic [ref=e317]: "0"
            - button "👁" [ref=e318] [cursor=pointer]
            - generic [ref=e319]: Empty
  - button "Toggle Layers Panel" [expanded] [ref=e320]: 🗂
  - button "Toggle Undo History" [ref=e321]: ⟲
  - button "Keyboard Shortcuts" [ref=e322]: "?"
  - generic [ref=e323]: open3dFloorplan
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { resolve } from 'node:path';
  3  | import { readFile } from 'node:fs/promises';
  4  | import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
  5  | 
  6  | function intersections(scene: any, parameter: number, height: number, wallsOnly = true) {
  7  |   const root = new Group(), material = new MeshBasicMaterial({ side: DoubleSide });
  8  |   for (const mesh of scene.meshes) {
  9  |     if (wallsOnly && mesh.material !== 'wall') continue;
  10 |     const geometry = new BufferGeometry();
  11 |     geometry.setAttribute('position', new Float32BufferAttribute(mesh.vertices.flat(), 3));
  12 |     geometry.setIndex(mesh.faces.flat()); const node = new Mesh(geometry, material); node.name = mesh.name; root.add(node);
  13 |   }
  14 |   root.updateMatrixWorld(true);
  15 |   const center = new Vector3(-3 + 6 * parameter, height, 6 * parameter * (1 - parameter));
  16 |   const normal = new Vector3(-(1 - 2 * parameter), 0, 1).normalize();
  17 |   const ray = new Raycaster(center.clone().addScaledVector(normal, .6), normal.clone().negate(), 0, 1.2);
  18 |   const hits = ray.intersectObject(root, true), count = hits.length;
  19 |   root.traverse(node => { if (node instanceof Mesh) node.geometry.dispose(); }); material.dispose();
  20 |   return count;
  21 | }
  22 | 
  23 | for (const split of [false, true]) test(`curved openings and trim follow the curve in active and stacked browser meshes${split ? ' after splitting' : ''}`, async ({ page }, testInfo) => {
  24 |   test.slow();
  25 |   const errors: string[] = [];
  26 |   page.on('pageerror', error => errors.push(error.message));
  27 |   await page.goto('/editor');
  28 |   await page.getByRole('button', { name: 'Export', exact: true }).click();
  29 |   const chooser = page.waitForEvent('filechooser');
  30 |   await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  31 |   await (await chooser).setFiles(resolve('tests/fixtures/curved-openings.openplan.json'));
  32 |   if (split) {
  33 |     await page.getByRole('button', { name: 'Toggle Layers Panel', exact: true }).click();
> 34 |     await page.getByRole('button', { name: '─ Wall 1', exact: true }).click();
     |                                                                       ^ Error: locator.click: Test timeout of 180000ms exceeded.
  35 |     await page.getByRole('button', { name: 'Split wall at midpoint', exact: true }).click();
  36 |     await expect(page.getByText('2 walls', { exact: true })).toBeVisible();
  37 |   }
  38 |   await page.getByRole('button', { name: '3D', exact: true }).click();
  39 |   await page.waitForLoadState('networkidle');
  40 |   const hint = page.getByRole('button', { name: 'Got it', exact: true });
  41 |   await expect(hint).toBeHidden({ timeout: 15_000 });
  42 |   async function exported() {
  43 |     const pending = page.waitForEvent('download');
  44 |     await page.getByRole('button', { name: 'Export Blender Scene', exact: true }).click();
  45 |     return JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  46 |   }
  47 |   function check(scene: any, elevation: number) {
  48 |     expect(intersections(scene, .25, elevation + .04, false)).toBe(0); // includes baseboards and jambs
  49 |     expect(intersections(scene, .75, elevation + 1.1)).toBe(0);
  50 |     expect(intersections(scene, .5, elevation + .5)).toBeGreaterThan(0); // solid control between openings
  51 |   }
  52 |   const active = await exported();
  53 |   await testInfo.attach('curved-opening-scene.json', { body: JSON.stringify(active), contentType: 'application/json' });
  54 |   check(active, 0);
  55 |   const trim = active.meshes.filter((m: any) => m.material === 'proxy' && Math.max(...m.vertices.map((v: number[]) => v[1])) > .5);
  56 |   expect(trim.length).toBeGreaterThan(6);
  57 |   // Old trim lived on the endpoint chord at Z=0, away from the curved apertures.
  58 |   for (const mesh of trim) expect(Math.min(...mesh.vertices.map((v: number[]) => v[2]))).toBeGreaterThan(.5);
  59 |   await page.getByRole('button', { name: 'Show All Floors Stacked', exact: true }).click();
  60 |   const stacked = await exported(); check(stacked, 0); check(stacked, 4);
  61 |   await testInfo.attach('curved-opening-stacked-scene.json', { body: JSON.stringify(stacked), contentType: 'application/json' });
  62 |   await page.getByRole('combobox', { name: 'Current floor', exact: true }).selectOption('curve-floor-1');
  63 |   const upperActive = await exported(); check(upperActive, 0); check(upperActive, 4);
  64 |   expect(errors).toEqual([]);
  65 | });
  66 | 
```