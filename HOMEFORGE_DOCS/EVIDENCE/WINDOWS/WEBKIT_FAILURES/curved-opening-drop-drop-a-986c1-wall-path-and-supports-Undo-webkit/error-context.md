# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: curved-opening-drop.spec.ts >> drop a window uses the curved wall path and supports Undo
- Location: tests\browser\curved-opening-drop.spec.ts:4:80

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 1
Received length: 0
Received array:  []
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link "Projetos" [ref=e5]:
        - /url: /
      - button "QA Connected Dimensions" [ref=e10]
      - generic [ref=e12]:
        - combobox "Pavimento atual" [ref=e13]:
          - option "Ground Floor" [selected]
        - button "Adicionar pavimento" [ref=e15]: +
        - generic [ref=e16]: 1F
      - button "Desfazer" [ref=e17]
      - button "Refazer" [ref=e21]
      - button "Ajustar à grade" [ref=e26]
      - generic [ref=e32]:
        - button "Modo de seleção" [ref=e33]
        - button "Modo de deslocamento" [ref=e37]
      - button "Alternar móveis" [ref=e43]
      - generic [ref=e48]:
        - button "Planta" [pressed] [ref=e49]
        - button "Elevação" [ref=e53]
      - generic [ref=e59]:
        - button "2D" [ref=e60]
        - button "3D" [ref=e61]
      - button "Histórico de versões" [ref=e62]
      - button "Resumo de áreas" [ref=e66]
      - button "Configurações" [ref=e69]
      - button "Exportar" [ref=e75]
      - 'generic "Último salvamento: agora" [ref=e81]': Salvo ✓
      - button "Salvar" [ref=e82]
    - generic [ref=e83]:
      - generic [ref=e85]:
        - generic [ref=e86]:
          - button "Construir" [ref=e87]
          - button "Ambientes" [ref=e88]
          - button "Objetos" [ref=e89]
        - generic [ref=e91]:
          - heading "Ferramentas" [level=3] [ref=e92]
          - button "Selecionar V Clique para selecionar elementos" [ref=e93]:
            - generic [ref=e98]:
              - generic [ref=e99]: Selecionar V
              - generic [ref=e100]: Clique para selecionar elementos
          - button "Desenhar parede W Clique para desenhar, clique duas vezes para concluir" [ref=e101]:
            - generic [ref=e105]:
              - generic [ref=e106]: Desenhar parede W
              - generic [ref=e107]: Clique para desenhar, clique duas vezes para concluir
          - heading "Estrutura" [level=3] [ref=e108]
          - button "Adicionar escada Clique para posicionar a escada" [ref=e109]:
            - generic [ref=e113]:
              - generic [ref=e114]: Adicionar escada
              - generic [ref=e115]: Clique para posicionar a escada
          - generic [ref=e116]:
            - button "Coluna redonda" [ref=e117]
            - button "Coluna quadrada" [ref=e125]
          - heading "Anotar" [level=3] [ref=e133]
          - button "Rótulo de texto Adicionar anotações de texto (T)" [ref=e134]:
            - generic [ref=e138]:
              - generic [ref=e139]: Rótulo de texto
              - generic [ref=e140]: Adicionar anotações de texto (T)
          - button "Dimensão Adicionar anotações de dimensão (N)" [ref=e141]:
            - generic [ref=e145]:
              - generic [ref=e146]: Dimensão
              - generic [ref=e147]: Adicionar anotações de dimensão (N)
          - button "Medir Medir distâncias (M)" [ref=e148]:
            - generic [ref=e152]:
              - generic [ref=e153]: Medir
              - generic [ref=e154]: Medir distâncias (M)
          - heading "Importar" [level=3] [ref=e155]
          - button "Importar imagem Imagem de fundo da planta" [ref=e156]:
            - generic [ref=e162]:
              - generic [ref=e163]: Importar imagem
              - generic [ref=e164]: Imagem de fundo da planta
          - button "Importar RoomPlan Escaneamento LiDAR do iOS (.json/.zip)" [ref=e165]:
            - generic [ref=e170]:
              - generic [ref=e171]: Importar RoomPlan
              - generic [ref=e172]: Escaneamento LiDAR do iOS (.json/.zip)
          - button "Portas ▼" [ref=e173]:
            - heading "Portas" [level=3] [ref=e174]
            - generic [ref=e175]: ▼
          - generic [ref=e176]:
            - button "Simples 90cm de abrir" [ref=e177]:
              - generic [ref=e181]: Simples
              - generic [ref=e182]: 90cm de abrir
            - button "Dupla 150cm de abrir" [ref=e183]:
              - generic [ref=e187]: Dupla
              - generic [ref=e188]: 150cm de abrir
            - button "De correr 180cm de correr" [ref=e189]:
              - generic [ref=e193]: De correr
              - generic [ref=e194]: 180cm de correr
            - button "Francesa 150cm de vidro" [ref=e195]:
              - generic [ref=e199]: Francesa
              - generic [ref=e200]: 150cm de vidro
            - button "Embutida 90cm embutida" [ref=e201]:
              - generic [ref=e205]: Embutida
              - generic [ref=e206]: 90cm embutida
            - button "Dobrável 180cm dobrável" [ref=e207]:
              - generic [ref=e211]: Dobrável
              - generic [ref=e212]: 180cm dobrável
            - button "Vão de passagem 100cm livre" [ref=e213]:
              - generic [ref=e217]: Vão de passagem
              - generic [ref=e218]: 100cm livre
            - button "Garagem 240cm basculante" [ref=e219]:
              - generic [ref=e223]: Garagem
              - generic [ref=e224]: 240cm basculante
          - heading "Janelas" [level=3] [ref=e225]
          - generic [ref=e226]:
            - button "Padrão 120×120cm" [ref=e227]:
              - generic [ref=e231]: Padrão
              - generic [ref=e232]: 120×120cm
            - button "Fixa 100×100cm" [ref=e233]:
              - generic [ref=e237]: Fixa
              - generic [ref=e238]: 100×100cm
            - button "De abrir 80×130cm" [ref=e239]:
              - generic [ref=e243]: De abrir
              - generic [ref=e244]: 80×130cm
            - button "De correr 180×120cm" [ref=e245]:
              - generic [ref=e249]: De correr
              - generic [ref=e250]: 180×120cm
            - button "Saliente 200×150cm" [ref=e251]:
              - generic [ref=e255]: Saliente
              - generic [ref=e256]: 200×150cm
      - application [ref=e258]:
        - generic "Área de edição da planta baixa" [ref=e259]
        - generic "Minimapa da planta baixa" [ref=e260]
        - generic [ref=e261]:
          - generic [ref=e262]: 1 parede
          - generic [ref=e263]: "|"
          - generic [ref=e264]: "Zoom: 100%"
          - button "⊞ Enquadrar" [ref=e265]
          - button "▦ Grade" [pressed] [ref=e266]
          - button "🧲 Ajuste" [pressed] [ref=e267]
          - button "🪑 Móveis" [pressed] [ref=e268]
          - button "🗂 Camadas" [ref=e269]
          - button "📏 Réguas" [pressed] [ref=e270]
          - button "🗺 Mapa" [pressed] [ref=e271]
        - generic [ref=e272]:
          - button "Reduzir zoom" [ref=e273]: −
          - button "Zoom em 100%" [ref=e274]: 100%
          - button "Ampliar zoom" [ref=e275]: +
          - button "Ajustar à tela" [ref=e277]: ⊞
          - button "Ajustar à seleção" [disabled] [ref=e278]: ⊡
  - button "Alternar painel de camadas" [ref=e279]: 🗂
  - button "Alternar histórico de ações" [ref=e280]: ⟲
  - button "Atalhos de teclado" [ref=e281]: "?"
  - region "Dica para começar" [ref=e282]:
    - paragraph [ref=e283]: Sua planta está pronta! Experimente SVG para gráficos vetoriais ou PDF para impressão.
    - button "Entendi" [ref=e284]
  - generic [ref=e285]: open3dFloorplan
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { readFile } from 'node:fs/promises';
  3  | 
  4  | for (const method of ['drop', 'click']) for (const kind of ['door', 'window']) test(`${method} a ${kind} uses the curved wall path and supports Undo`, async ({ page }) => {
  5  |   await page.addInitScript(() => localStorage.setItem('o3d_locale', 'pt'));
  6  |   const plan = JSON.parse(await readFile('tests/fixtures/connected-dimensions.openplan.json', 'utf8'));
  7  |   const floor = plan.floors[0];
  8  |   floor.walls = [{ ...floor.walls[0], start: { x: -300, y: 0 }, end: { x: 300, y: 0 }, curvePoint: { x: 0, y: 600 } }];
  9  |   floor.doors = []; floor.windows = []; floor.rooms = []; floor.furniture = [];
  10 |   await page.goto('/editor');
  11 |   await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  12 |   const chooser = page.waitForEvent('filechooser');
  13 |   await page.getByRole('button', { name: 'Importar JSON', exact: true }).click();
  14 |   await (await chooser).setFiles({ name: 'curve-drop.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(plan)) });
  15 |   async function exported() {
  16 |     await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  17 |     const pending = page.waitForEvent('download');
  18 |     await page.getByRole('button', { name: 'Baixar JSON', exact: true }).click();
  19 |     return JSON.parse(await readFile((await (await pending).path())!, 'utf8')).floors;
  20 |   }
  21 |   const before = await exported();
  22 |   await page.getByRole('button', { name: 'Zoom em 100%', exact: true }).click();
  23 |   const canvas = page.getByLabel(/^(?:Floor plan editor canvas|Área de edição da planta baixa)$/, { exact: true });
  24 |   const bounds = (await canvas.boundingBox())!;
  25 |   const card = page.getByRole('button', { name: kind === 'door' ? 'Simples 90cm de abrir' : 'Fixa 100×100cm', exact: true });
  26 |   const position = { x: bounds.width / 2, y: bounds.height / 2 + 150 };
  27 |   if (method === 'drop') await card.dragTo(canvas, { targetPosition: position });
  28 |   else { await card.click(); await canvas.click({ position }); await canvas.press('Escape'); }
  29 |   const placed = await exported(), key = kind === 'door' ? 'doors' : 'windows';
> 30 |   expect(placed[0][key]).toHaveLength(1);
     |                          ^ Error: expect(received).toHaveLength(expected)
  31 |   expect(placed[0][key][0]).toMatchObject({ wallId: floor.walls[0].id, type: kind === 'door' ? 'single' : 'fixed' });
  32 |   expect(placed[0][key][0].position).toBeCloseTo(.5, 1);
  33 |   expect(placed[0].walls).toEqual(before[0].walls);
  34 |   await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  35 |   expect(await exported()).toEqual(before);
  36 |   await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  37 |   expect(await exported()).toEqual(placed);
  38 | });
  39 | 
```