# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: context-furniture-actions.spec.ts >> furniture context actions preserve size and undo stacking order
- Location: tests\browser\context-furniture-actions.spec.ts:5:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: '💺 Armchair', exact: true }).first()

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
      - 'generic "Last saved: 45s ago" [ref=e81]': Saved ✓
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
  1  | import { expect, test } from '@playwright/test';
  2  | import { readFile } from 'node:fs/promises';
  3  | import { resolve } from 'node:path';
  4  | 
  5  | test('furniture context actions preserve size and undo stacking order', async ({ page }) => {
  6  |   await page.goto('/editor');
  7  |   await page.getByRole('button', { name: 'Export', exact: true }).click();
  8  |   const chooser = page.waitForEvent('filechooser');
  9  |   await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  10 |   await (await chooser).setFiles(resolve('tests/fixtures/furniture-fidelity.openplan.json'));
  11 |   async function exported() {
  12 |     await page.getByRole('button', { name: 'Export', exact: true }).click();
  13 |     const pending = page.waitForEvent('download');
  14 |     await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  15 |     return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors[0];
  16 |   }
  17 |   const before = await exported();
  18 |   await page.getByRole('button', { name: 'Toggle Layers Panel', exact: true }).click();
> 19 |   await page.getByRole('button', { name: '💺 Armchair', exact: true }).first().click();
     |                                                                                ^ Error: locator.click: Test timeout of 60000ms exceeded.
  20 |   async function action(name: RegExp) {
  21 |     const canvas = page.getByLabel('Floor plan editor canvas', { exact: true });
  22 |     await canvas.focus(); await canvas.press('Shift+F10');
  23 |     await page.getByRole('menuitem', { name }).click();
  24 |     await expect(canvas).toBeFocused();
  25 |   }
  26 |   await action(/Flip Horizontal/);
  27 |   const flipped = await exported();
  28 |   expect(flipped).toEqual({ ...before, furniture: before.furniture.map((item: any, index: number) => index ? item : { ...item, scale: { ...item.scale, x: -item.scale.x } }) });
  29 |   await page.getByRole('button', { name: 'Undo', exact: true }).click();
  30 |   expect(await exported()).toEqual(before);
  31 |   await page.getByRole('button', { name: 'Redo', exact: true }).click();
  32 |   expect(await exported()).toEqual(flipped);
  33 |   await page.getByRole('button', { name: 'Undo', exact: true }).click();
  34 |   await action(/Bring to Front/);
  35 |   const front = { ...before, furniture: [...before.furniture.slice(1), before.furniture[0]] };
  36 |   expect(await exported()).toEqual(front);
  37 |   await page.getByRole('button', { name: 'Undo', exact: true }).click();
  38 |   expect(await exported()).toEqual(before);
  39 |   // Already at the back: a no-op must retain the redo of Bring to Front.
  40 |   await action(/Send to Back/);
  41 |   await page.getByRole('button', { name: 'Redo', exact: true }).click();
  42 |   expect(await exported()).toEqual(front);
  43 |   await action(/Send to Back/);
  44 |   expect(await exported()).toEqual(before);
  45 |   await page.getByRole('button', { name: 'Undo', exact: true }).click();
  46 |   expect(await exported()).toEqual(front);
  47 | });
  48 | 
```