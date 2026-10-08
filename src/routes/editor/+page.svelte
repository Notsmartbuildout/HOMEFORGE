<script lang="ts">
  import { t, locale } from '$lib/i18n';
  import { projectServiceMessage } from '$lib/i18n/projectServiceMessages';
  import { CaptureImportError } from '$lib/i18n/captureImportError';
  import { modalDialog, hasOpenModal } from '$lib/utils/modalDialog';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { base } from '$app/paths';
  import { goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { reportLoadingFailure } from '$lib/services/deployment';
  import { currentProject, viewMode, selectedElementId, selectedRoomId, createDefaultProject, loadProject, selectedTool, placingFurnitureId, elevationWallId, elevationPickMode } from '$lib/stores/project';
  import { localStore, storageErrorMessage, downloadLibraryBackup, downloadHomeforgeBackup } from '$lib/services/datastore';
  import { resolveHomeforgeEditorContext } from '$lib/services/homeforgeDashboard';
  import { isProtectedBaseline } from '$lib/services/homeforgeReferences';
  import { baselineProtection, protectionError, beginBaselineCorrection, endBaselineCorrection, baselineReadOnly } from '$lib/stores/baselineProtection';
  import { createHomeforgeStore } from '$lib/services/homeforge';
  import { createHomeforgeZoneStore } from '$lib/services/homeforgeZone';
  import type { HomeforgeZone } from '$lib/models/homeforgeZone';
  import type { HomeforgeProposal } from '$lib/models/homeforgeProposal';
  import { prepareDimensionProposal, acceptDimensionProposal } from '$lib/services/homeforgeProposal';
  import { prepareNumericCommand } from '$lib/utils/homeforgeCommands';
  import HomeforgeProposalReview from '$lib/components/HomeforgeProposalReview.svelte';
  import { refreshSnapshots } from '$lib/stores/versionHistory';
  import { autoSave, markClean, saveState, savingCopy } from '$lib/stores/saveStatus';
  import { createProjectFromRoomPlan, isRoomPlanJson } from '$lib/utils/roomplanImport';
  import TopBar from '$lib/components/toolbar/TopBar.svelte';
  import BuildPanel from '$lib/components/sidebar/BuildPanel.svelte';
  import PropertiesPanel from '$lib/components/sidebar/PropertiesPanel.svelte';
  import LayersPanel from '$lib/components/sidebar/LayersPanel.svelte';

  let showLayers = $state(false);
  import FloorPlanCanvas from '$lib/components/editor/FloorPlanCanvas.svelte';
  import AlignmentToolbar from '$lib/components/editor/AlignmentToolbar.svelte';
  import UndoHistoryPanel from '$lib/components/editor/UndoHistoryPanel.svelte';
  import CommandPalette from '$lib/components/editor/CommandPalette.svelte';
  import ElevationView from '$lib/components/editor/ElevationView.svelte';
  import PrintLayout from '$lib/components/editor/PrintLayout.svelte';
  import OnboardingTooltip from '$lib/components/OnboardingTooltip.svelte';
  import { triggerTip } from '$lib/stores/onboarding.svelte';

  let commandPaletteOpen = $state(false);
  let printOpen = $state(false);

  // Lazy-load ThreeViewer to avoid loading Three.js (~1.4MB) until 3D mode is activated
  let ThreeViewer: any = $state(null);
  $effect(() => {
    if (mode === '3d' && !ThreeViewer) {
      import('$lib/components/viewer3d/ThreeViewer.svelte').then(m => { ThreeViewer = m.default; }).catch(() => {
        viewMode.set('2d');
        reportLoadingFailure();
      });
    }
  });

  let mode = $state<'2d' | '3d'>('2d');
  let ready = $state(false);
  let showHelp = $state(false);
  let shortcutCopyState = $state<'idle' | 'copying' | 'copied' | 'failed'>('idle');
  let shortcutCopyGeneration = 0;
  $effect(() => {
    showHelp;
    shortcutCopyGeneration++;
    shortcutCopyState = 'idle';
  });
  let showUndoHistory = $state(false);
  let historyTrigger: HTMLButtonElement | undefined = $state();
  function toggleHistory(trigger: HTMLButtonElement) {
    historyTrigger = trigger;
    showUndoHistory = !showUndoHistory;
  }

  // Mobile (< md): BuildPanel becomes an off-canvas drawer toggled by the Tools FAB.
  let buildPanelOpen = $state(false);
  // Close the drawer once the user has picked a tool / item so the canvas is usable
  selectedTool.subscribe(() => { if (buildPanelOpen) buildPanelOpen = false; });
  placingFurnitureId.subscribe((id) => { if (id && buildPanelOpen) buildPanelOpen = false; });

  // iOS capture handoff (?import=CODE → fetch RoomPlan JSON from Firebase Storage inbox)
  let importingCapture = $state(false);
  let importError = $state<string | CaptureImportError | null>(null);
  let loadError = $state<string | null>(null);
  let homeforgeContext = $state<Awaited<ReturnType<typeof resolveHomeforgeEditorContext>> | null>(null);
  let returning = $state(false), navigationError = $state<string | null>(null);
  const homeforgeClient = createHomeforgeStore();
  const zoneClient = createHomeforgeZoneStore();
  let featureRegistry = $state<HomeforgeZone | null>(null);
  let proposalDraft = $state<HomeforgeProposal | null>(null), proposalBusy = $state(false), proposalError = $state('');
  let legendCommand = $state('');
  function reviewMeasurement(measurementId: string) {
    const project = get(currentProject);
    if (!homeforgeContext || !featureRegistry || !project) return;
    try { proposalDraft = prepareDimensionProposal(featureRegistry, project, homeforgeContext.variant.id, measurementId); proposalError = ''; }
    catch (error) { navigationError = storageErrorMessage(error); }
  }
  function reviewCommand() {
    const project = get(currentProject);
    if (!homeforgeContext || !featureRegistry || !project) return;
    try {
      proposalDraft = prepareNumericCommand(featureRegistry, project, homeforgeContext.variant.id, homeforgeContext.variant.kind, legendCommand);
      proposalError = ''; navigationError = null;
    } catch (error) { navigationError = storageErrorMessage(error); }
  }
  async function acceptProposal() {
    if (!proposalDraft) return;
    proposalBusy = true; proposalError = '';
    try { await acceptDimensionProposal(proposalDraft); proposalDraft = null; }
    catch (error) { proposalError = storageErrorMessage(error); }
    finally { proposalBusy = false; }
  }
  async function loadFeatureRegistry() {
    if (!homeforgeContext) { featureRegistry = null; return; }
    try { featureRegistry = await zoneClient.load(homeforgeContext.workspaceId, homeforgeContext.renovationId); }
    catch { featureRegistry = null; }
  }
  let selectedVariantId = $state(''), optionForm = $state(false), optionName = $state('Option A');
  let editorAlive = true;
  let correctionForm = $state(false);
  async function correctionMode() {
    const project = get(currentProject);
    const wasSaved = get(saveState) === 'saved';
    if (!project || returning) return;
    returning = true; navigationError = null;
    try {
      await localStore.assertCurrent(project.id);
      if (get(baselineProtection).correcting) {
        await saveBeforeTransition();
        if (!editorAlive || get(currentProject) !== project) throw new Error('The editor changed while saving. Save the latest corrections before finishing.');
        loadProject(project, true); markClean();
      } else {
        if (!await isProtectedBaseline(project.id)) throw new Error('Baseline metadata changed. Reload before editing.');
        if (!editorAlive || get(currentProject) !== project) return;
        beginBaselineCorrection(project.id); if (wasSaved) markClean(); correctionForm = false;
      }
    } catch (error) { navigationError = storageErrorMessage(error); }
    finally { returning = false; }
  }

  async function saveBeforeTransition() {
    if (get(savingCopy)) throw new Error('Wait for the recovery copy to finish before changing editor context.');
    if (get(saveState) !== 'saved' && (!await autoSave() || get(saveState) !== 'saved'))
      throw new Error('Your latest edits could not be saved. Resolve the save error before returning to renovations or switching variants.');
  }

  async function openVariant(variantId: string) {
    const context = homeforgeContext;
    const before = get(currentProject);
    const variant = context?.variants.find(v => v.id === variantId);
    if (!context || !variant) throw new Error('Design variant is missing. Return to HOMEFORGE for recovery.');
    const project = await localStore.load(variant.projectId);
    const protectedBaseline = await isProtectedBaseline(variant.projectId);
    if (!editorAlive) return;
    if (get(currentProject) !== before || get(saveState) !== 'saved') throw new Error('The editor changed during loading. Save the latest edits before switching.');
    if (!project) throw new Error('Saved design variant is missing. Download a HOMEFORGE backup for recovery.');
    await homeforgeClient.activateVariant(context.workspaceId, context.renovationId, variant.id, project);
    if (!editorAlive) return;
    if (get(currentProject) !== before || get(saveState) !== 'saved') throw new Error('The editor changed during activation. Your current edits remain open; save before retrying.');
    const url = new URL(window.location.href);
    url.searchParams.set('id', project.id); url.searchParams.set('variant', variant.id);
    replaceState(url, page.state);
    homeforgeContext = { ...context, variant }; selectedVariantId = variant.id; proposalDraft = null; legendCommand = '';
    await loadFeatureRegistry();
    loadProject(project, protectedBaseline); markClean();
    showLayers = false; showUndoHistory = false; buildPanelOpen = false; printOpen = false; commandPaletteOpen = false;
    void refreshSnapshots();
  }

  async function switchVariant(variantId: string) {
    if (returning || !homeforgeContext || variantId === homeforgeContext.variant.id) return;
    returning = true; navigationError = null;
    try { await saveBeforeTransition(); await openVariant(variantId); }
    catch (error) { navigationError = storageErrorMessage(error); }
    finally { selectedVariantId = homeforgeContext?.variant.id ?? ''; returning = false; }
  }

  async function createOption() {
    if (returning || !homeforgeContext) return;
    returning = true; navigationError = null;
    try {
      await saveBeforeTransition();
      const context = homeforgeContext, project = get(currentProject);
      if (!project || project.id !== context.variant.projectId) throw new Error('Editor project changed. Reload before creating an option.');
      const source = baselineReadOnly(project.id) ? await localStore.load(project.id) : project;
      if (!source) throw new Error('Saved source is missing. Return to HOMEFORGE for recovery.');
      const variant = await homeforgeClient.cloneVariant(context.workspaceId, context.renovationId, context.variant.id, optionName, source);
      if (!editorAlive) return;
      homeforgeContext = { ...context, variants: [...context.variants, variant] }; optionForm = false;
      if (get(currentProject) !== project || get(saveState) !== 'saved') throw new Error('The option was created, but newer edits remain in this plan. Save them before switching.');
      await openVariant(variant.id);
    } catch (error) { navigationError = storageErrorMessage(error); }
    finally { selectedVariantId = homeforgeContext?.variant.id ?? ''; returning = false; }
  }

  async function returnToRenovations(destination: 'dashboard' | 'zone' = 'dashboard') {
    if (returning || !homeforgeContext) return;
    returning = true; navigationError = null;
    try {
      await saveBeforeTransition();
      await goto(destination === 'zone'
        ? `${base}/zone?workspace=${encodeURIComponent(homeforgeContext.workspaceId)}&renovation=${encodeURIComponent(homeforgeContext.renovationId)}`
        : `${base}/?workspace=${encodeURIComponent(homeforgeContext.workspaceId)}`);
    } catch (error) { navigationError = storageErrorMessage(error); }
    finally { returning = false; }
  }

  async function backupLibrary() {
    try {
      if (new URL(window.location.href).searchParams.has('homeforge')) await downloadHomeforgeBackup();
      else await downloadLibraryBackup();
    }
    catch (error) { loadError = storageErrorMessage(error); }
  }

  /** Fetch a RoomPlan capture uploaded by the iOS app and open it as a new project. Returns true on success. */
  async function importCaptureFromCode(code: string): Promise<boolean> {
    importingCapture = true;
    try {
      const url = `https://firebasestorage.googleapis.com/v0/b/openplan3d.firebasestorage.app/o/inbox%2F${code}.json?alt=media`;
      let res: Response;
      try {
        res = await fetch(url);
      } catch {
        throw new CaptureImportError('captureImport.network');
      }
      if (res.status === 404) {
        throw new CaptureImportError('captureImport.missing', { code });
      }
      if (!res.ok) {
        throw new CaptureImportError('captureImport.http', { status: res.status });
      }
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new CaptureImportError('captureImport.json');
      }
      if (!isRoomPlanJson(data)) {
        throw new CaptureImportError('captureImport.format');
      }
      const project = createProjectFromRoomPlan(data, `Room Capture ${code}`);
      loadProject(project);
      // A storage failure must not discard a successfully downloaded capture.
      await autoSave();
      // Remove ?import=CODE so a refresh doesn't re-import
      replaceState(`${base}/editor?id=${project.id}`, page.state);
      return true;
    } catch (e: any) {
      importError = e instanceof CaptureImportError ? e : e?.message ?? new CaptureImportError('captureImport.fallback');
      return false;
    } finally {
      importingCapture = false;
    }
  }

  viewMode.subscribe((m) => {
    mode = m;
    if (m === '3d') {
      // Clear selection when entering 3D — start in view-only mode
      selectedElementId.set(null);
      selectedRoomId.set(null);
      elevationPickMode.set(false);
      // Onboarding tip for first 3D view
      triggerTip('first-3d', 200, 80);
    }
  });

  async function initializeEditor() {
    loadError = null;
    try {
      const url = new URL(window.location.href);

      // iOS capture handoff: ?import=CODE
      const rawCode = url.searchParams.get('import');
      if (rawCode) {
        const code = rawCode.toUpperCase();
        if (/^[A-Z2-9]{4,32}$/.test(code)) {
          if (await importCaptureFromCode(code)) {
            ready = true;
            return;
          }
          // Import failed — fall through to the normal load flow (error shown via toast)
        } else {
          importError = new CaptureImportError('captureImport.code');
        }
      }

      const id = url.searchParams.get('id');
      const homeforge = url.searchParams.has('homeforge');
      if (homeforge) {
        const workspace = url.searchParams.get('workspace'), renovation = url.searchParams.get('renovation');
        if (!id || !workspace || !renovation)
          throw new Error('Existing Conditions reference is missing or does not match this editor link. Return to HOMEFORGE for recovery.');
        await homeforgeClient.load(workspace);
        const context = await resolveHomeforgeEditorContext(workspace, renovation, url.searchParams.get('variant') ?? undefined);
        if (context.variant.projectId !== id) throw new Error('Existing Conditions reference does not match this editor link. Return to HOMEFORGE for recovery.');
        homeforgeContext = context; selectedVariantId = context.variant.id;
        await loadFeatureRegistry();
      }
      if (id) {
        const protectedBaseline = await isProtectedBaseline(id);
        if (!editorAlive) return;
        // A new/imported project may exist only in memory if its first save failed.
        const pending = get(currentProject);
        if (pending?.id === id && get(saveState) !== 'saved') {
          baselineProtection.set({ projectId: protectedBaseline ? id : null, correcting: false });
          ready = true; return;
        }
        const project = await localStore.load(id);
        if (!editorAlive) return;
        if (project) {
          if (homeforgeContext) await homeforgeClient.activateVariant(homeforgeContext.workspaceId, homeforgeContext.renovationId, homeforgeContext.variant.id, project);
          if (!editorAlive) return;
          loadProject(project, protectedBaseline);
          markClean();
        } else {
          if (homeforge) throw new Error('Existing Conditions saved plan is missing. Return to HOMEFORGE for recovery.');
          const p = createDefaultProject();
          loadProject(p);
          await autoSave();
          replaceState(`${base}/editor?id=${p.id}`, page.state);
        }
      } else {
        const p = createDefaultProject();
        loadProject(p);
        await autoSave();
        replaceState(`${base}/editor?id=${p.id}`, page.state);
      }
      ready = true;
    } catch (error) {
      loadError = storageErrorMessage(error);
    }
  }

  onMount(() => {
    void initializeEditor();
    // Imports can replace the active project from either sidebar or toolbar.
    // Keep reloads pointed at that project once initial route loading is complete.
    const stopSyncProjectUrl = currentProject.subscribe((project) => {
      if (!ready || returning || !project) return;
      const url = new URL(window.location.href);
      if (url.searchParams.get('id') === project.id) return;
      url.searchParams.delete('import');
      // Imports change the active upstream project; discard the old wrapper link.
      url.searchParams.delete('homeforge'); url.searchParams.delete('workspace'); url.searchParams.delete('renovation'); url.searchParams.delete('variant');
      homeforgeContext = null;
      featureRegistry = null;
      proposalDraft = null;
      url.searchParams.set('id', project.id);
      replaceState(url, page.state);
    });
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (get(saveState) !== 'saved') {
        void autoSave();
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden && get(saveState) === 'unsaved') void autoSave();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      editorAlive = false;
      endBaselineCorrection();
      stopSyncProjectUrl();
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });
  function onEditorKeydown(e: KeyboardEvent) {
    if (returning) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (hasOpenModal()) return;
    const target = e.target as HTMLElement | null;
    const typing = !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'p' && mod) { e.preventDefault(); printOpen = true; }
    if ((e.key === 'k' && mod) || (e.key === '/' && !mod && !e.altKey && !typing)) {
      e.preventDefault(); commandPaletteOpen = !commandPaletteOpen;
    }
    if (e.key === '?' && !mod && !e.altKey && !typing) { showHelp = !showHelp; e.preventDefault(); }
    if (e.key === 'Escape' && showHelp) showHelp = false;
    if (e.key === 'l' && !mod && !e.altKey && !typing) showLayers = !showLayers;
  }
</script>

<svelte:window on:keydown={onEditorKeydown} />

{#if ready}
  <div class="h-screen flex flex-col overflow-hidden" style:--editor-top={homeforgeContext ? ($baselineProtection.projectId ? '12rem' : '9rem') : $baselineProtection.projectId ? '6rem' : '3rem'}>
    {#if homeforgeContext}
      <nav aria-label="HOMEFORGE editor context" aria-busy={returning} class="h-24 md:h-12 shrink-0 flex flex-col md:flex-row justify-center md:items-center gap-2 px-3 bg-slate-100 border-b border-slate-200 text-sm">
        <div class="flex items-center gap-3 min-w-0 flex-1">
        <button class="shrink-0 text-blue-700 underline disabled:opacity-50" disabled={returning} onclick={() => returnToRenovations()}>Return to renovations</button>
        <button class="shrink-0 text-blue-700 underline disabled:opacity-50" disabled={returning} onclick={() => returnToRenovations('zone')}>Back to zone</button>
        <span class="min-w-0 truncate" title={`${homeforgeContext.workspaceName} / ${homeforgeContext.renovationName} / ${homeforgeContext.variant.name}`}>
          {homeforgeContext.workspaceName} / <strong>{homeforgeContext.renovationName}</strong> / {homeforgeContext.variant.name}
        </span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <select aria-label="Design variant" bind:value={selectedVariantId} disabled={returning} onchange={event => { void switchVariant(event.currentTarget.value); }} class="min-w-0 max-w-44 rounded border border-slate-300 p-1">
            {#each homeforgeContext.variants as variant}<option value={variant.id}>{variant.name}</option>{/each}
          </select>
          <button disabled={returning} class="text-blue-700 underline disabled:opacity-50" onclick={() => { optionName = `Option ${String.fromCharCode(65 + homeforgeContext!.variants.filter(v => v.kind === 'option').length)}`; optionForm = true; }}>Clone to option</button>
        </div>
      </nav>
    {/if}
    {#if $baselineProtection.projectId}
      <div class="h-12 shrink-0 flex items-center justify-between gap-2 px-3 bg-amber-50 border-b border-amber-200 text-sm" role="region" aria-label="Baseline protection">
        <span>{$baselineProtection.correcting ? 'Correction mode — Existing Conditions' : 'Protected — Existing Conditions'}</span>
        <button disabled={returning} class="shrink-0 text-blue-700 underline disabled:opacity-50" onclick={() => { if ($baselineProtection.correcting) void correctionMode(); else correctionForm = true; }}>{$baselineProtection.correcting ? 'Finish corrections' : 'Begin correction'}</button>
      </div>
    {/if}
    <div inert={returning} class="shrink-0"><TopBar onToggleLayers={() => showLayers = !showLayers} layersOpen={showLayers} onToggleHistory={toggleHistory} historyOpen={showUndoHistory} /></div>
    <!-- Keep canvas/viewer controls beneath toolbar menus and project dialogs. -->
    <div inert={returning} class="flex flex-1 overflow-hidden isolate">
      {#if mode === '2d'}
        <!-- Build panel: inline sidebar on md+, off-canvas drawer on phones -->
        {#if buildPanelOpen}
          <div
            class="md:hidden fixed inset-x-0 top-[var(--editor-top)] bottom-0 bg-black/40 z-40"
            onclick={() => buildPanelOpen = false}
            aria-hidden="true"
          ></div>
        {/if}
        <div class="h-full max-md:fixed max-md:left-0 max-md:top-[var(--editor-top)] max-md:bottom-0 max-md:h-auto max-md:z-50 max-md:shadow-2xl max-md:transition-transform max-md:duration-200 {buildPanelOpen ? '' : 'max-md:-translate-x-full'}">
          <BuildPanel />
        </div>
      {/if}
      <div class="flex-1 min-w-0 relative">
        {#if mode === '2d'}
          <FloorPlanCanvas />
          <AlignmentToolbar />
          {#if $elevationWallId}
            <!-- Integrated elevation view replaces the plan canvas area (sidebars stay) -->
            <ElevationView />
          {/if}
        {:else}
          {#if ThreeViewer}
            <ThreeViewer />
          {:else}
            <div class="flex items-center justify-center h-full text-slate-400">{$t('shortcuts.loading3d')}</div>
          {/if}
        {/if}
        {#if homeforgeContext && featureRegistry && featureRegistry.features.length}
          <aside aria-label="Feature legend" class="absolute bottom-4 left-4 z-30 max-h-40 max-w-56 overflow-auto rounded-lg border bg-white/95 p-3 text-xs shadow">
            <strong>Feature legend</strong>
            <ul class="mt-1 space-y-1">
              {#each featureRegistry.features as feature (feature.id)}
                <li>{feature.label} · {feature.kind} · {feature.bindings.some(binding => binding.variantId === homeforgeContext!.variant.id) ? 'bound' : 'unbound'}
                  {#if homeforgeContext.variant.kind === 'existing'}
                    {#each featureRegistry.measurements.filter(item => item.featureId === feature.id) as measurement (measurement.id)}
                      <button class="block text-left text-blue-700 underline" onclick={() => reviewMeasurement(measurement.id)}>Review {measurement.property} observation</button>
                    {/each}
                  {/if}
                </li>
              {/each}
            </ul>
            <form class="mt-3 border-t pt-2" onsubmit={event => { event.preventDefault(); reviewCommand(); }}>
              <label>Exact legend command<input class="mt-1 w-full rounded border p-1" bind:value={legendCommand} maxlength="300" disabled={returning} placeholder="D1 is 36 inches wide" /></label>
              <button class="mt-1 text-blue-700 underline disabled:opacity-50" disabled={returning}>Review command</button>
            </form>
          </aside>
        {/if}
      </div>
      {#if showLayers && mode === '2d'}
        <LayersPanel />
      {/if}
      <PropertiesPanel is3D={mode === '3d'} />
    </div>
  </div>

  {#if $protectionError}<p role="alert" class="fixed bottom-32 inset-x-4 z-[60] rounded-lg bg-amber-50 text-amber-900 px-3 py-2 text-sm shadow-lg">{$protectionError}</p>{/if}
  {#if navigationError}<p role="alert" class="fixed bottom-20 inset-x-4 z-[60] rounded-lg bg-red-50 text-red-800 px-3 py-2 text-sm shadow-lg">{navigationError}</p>{/if}
  {#if proposalDraft}<HomeforgeProposalReview proposal={proposalDraft}
    evidenceNames={proposalDraft.evidenceIds.map(id => featureRegistry?.evidence.find(item => item.id === id)?.name ?? 'Unavailable evidence')}
    busy={proposalBusy} error={proposalError} onAccept={() => { void acceptProposal(); }} onCancel={() => { proposalDraft = null; }} />{/if}

  {#if correctionForm}
    <dialog use:modalDialog aria-label="Correct Existing Conditions" oncancel={event => { if (returning) event.preventDefault(); else correctionForm = false; }} class="m-auto max-w-[calc(100vw-2rem)] w-96 rounded-xl bg-white p-5 shadow-xl backdrop:bg-black/50">
      <h2 class="font-semibold">Correct Existing Conditions</h2>
      <p class="mt-2 text-sm text-slate-600">Intentional corrections update this saved baseline and every renovation referencing it. Existing options keep their independent copies. Use Clone to option for proposed changes. Correction mode ends when you leave or reload.</p>
      {#if navigationError}<p role="alert" class="mt-3 text-red-800">{navigationError}</p>{/if}
      <div class="flex justify-end gap-4 mt-4">
        <button disabled={returning} onclick={() => correctionForm = false}>Cancel</button>
        <button disabled={returning} class="text-blue-700 underline" onclick={() => { void correctionMode(); }}>Start correction</button>
      </div>
    </dialog>
  {/if}
  {#if optionForm}
    <dialog use:modalDialog aria-label="Create design option" oncancel={event => { if (returning) event.preventDefault(); else optionForm = false; }} class="m-auto max-w-[calc(100vw-2rem)] w-96 rounded-xl bg-white p-5 shadow-xl backdrop:bg-black/50">
      <form onsubmit={event => { event.preventDefault(); void createOption(); }}>
        <h2 class="font-semibold">Create design option</h2>
        <p class="mt-2 text-sm text-slate-600">Copy this variant's complete saved plan and assets into an independent option.</p>
        <label for="homeforge-option-name" class="block mt-4 text-sm font-medium">Option name</label>
        <input id="homeforge-option-name" bind:value={optionName} disabled={returning} required class="mt-1 w-full rounded border border-slate-300 p-2" />
        {#if navigationError}<p role="alert" class="mt-3 text-red-800 text-sm">{navigationError}</p>{/if}
        <div class="mt-4 flex justify-end gap-3">
          <button type="button" disabled={returning} onclick={() => optionForm = false}>Cancel</button>
          <button disabled={returning || !optionName.trim()} class="rounded bg-blue-600 text-white px-3 py-2 disabled:opacity-50">Create option</button>
        </div>
      </form>
    </dialog>
  {/if}

  <!-- Tools drawer FAB (mobile only) -->
  {#if mode === '2d'}
    <button
      class="md:hidden fixed bottom-4 left-4 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg active:bg-blue-700 transition-colors z-40 flex items-center justify-center"
      onclick={() => buildPanelOpen = !buildPanelOpen}
      title={$t('buildTools.tools')}
      aria-label={$t('editorPanels.tools')}
      aria-expanded={buildPanelOpen}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    </button>
  {/if}

  <!-- Layers toggle button -->
  {#if mode === '2d'}
    <button
      class="max-md:hidden fixed bottom-4 left-14 w-8 h-8 rounded-full shadow-lg hover:bg-slate-600 transition-colors z-50 text-sm"
      class:bg-blue-600={showLayers}
      class:text-white={showLayers}
      class:bg-slate-700={!showLayers}
      class:text-gray-300={!showLayers}
      onclick={() => showLayers = !showLayers}
      title={$t('editorPanels.layersTitle')}
      aria-label={$t('editorPanels.layers')}
      aria-expanded={showLayers}
    >🗂</button>
  {/if}

  <!-- Undo History toggle button -->
  <button
    class="max-md:hidden fixed bottom-4 left-24 w-8 h-8 rounded-full shadow-lg hover:bg-slate-600 transition-colors z-50 text-sm"
    class:bg-blue-600={showUndoHistory}
    class:text-white={showUndoHistory}
    class:bg-slate-700={!showUndoHistory}
    class:text-gray-300={!showUndoHistory}
    onclick={(event) => toggleHistory(event.currentTarget)}
    title={$t('undoHistory.title')}
    aria-label={$t('editorPanels.history')}
      aria-expanded={showUndoHistory}
  >⟲</button>

  <UndoHistoryPanel bind:visible={showUndoHistory} returnFocusTo={historyTrigger} />

  <!-- Help button (desktop only — keyboard shortcuts are meaningless on touch) -->
  <button
    class="max-md:hidden fixed bottom-4 left-4 w-8 h-8 rounded-full bg-slate-700 text-white text-sm font-bold shadow-lg hover:bg-slate-600 transition-colors z-50"
    onclick={() => showHelp = !showHelp}
    title={`${$t('shortcuts.title')} (?)`}
    aria-label={$t('shortcuts.title')}
  >?</button>

  <!-- Shortcuts overlay -->
  {#if showHelp}
    <dialog use:modalDialog class="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={(e) => { if (e.target === e.currentTarget) showHelp = false; }} oncancel={(e) => { e.preventDefault(); showHelp = false; }} onkeydown={(e) => { if (e.key === '?') { e.preventDefault(); showHelp = false; } }} aria-label={$t('shortcuts.title')}>
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/></svg>
            <h2 class="text-lg font-bold text-slate-800">{$t('shortcuts.title')}</h2>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-1.5"
              disabled={shortcutCopyState === 'copying'}
              onclick={async () => {
                const generation = ++shortcutCopyGeneration;
                shortcutCopyState = 'copying';
                const text = [
                  $t('shortcuts.title') + ' — Open3D Floorplan',
                  '',
                  '── ' + $t('shortcuts.tools') + ' ──',
                  "V          " + $t('shortcuts.select'),
                  "W          " + $t('shortcuts.wall'),
                  "D          " + $t('shortcuts.door'),
                  "H          " + $t('shortcuts.pan'),
                  "M          " + $t('shortcuts.measure'),
                  "N          " + $t('shortcuts.annotate'),
                  "T          " + $t('shortcuts.text'),
                  "S          " + $t('shortcuts.snap'),
                  '',
                  '── ' + $t('shortcuts.edit') + ' ──',
                  "Ctrl+Z     " + $t('shortcuts.undo'),
                  "Ctrl+Y     " + $t('shortcuts.redo'),
                  "Ctrl+C     " + $t('shortcuts.copy'),
                  "Ctrl+V     " + $t('shortcuts.paste'),
                  "Ctrl+A     " + $t('shortcuts.selectAll'),
                  "Ctrl+D     " + $t('shortcuts.deselectAll'),
                  "Ctrl+S     " + $t('shortcuts.save'),
                  "Esc        " + $t('shortcuts.cancel'),
                  '',
                  '── ' + $t('shortcuts.elements') + ' ──',
                  "R          " + $t('shortcuts.rotate'),
                  "Del/Back   " + $t('shortcuts.delete'),
                  "Ctrl+L     " + $t('shortcuts.lock'),
                  "Ctrl+G     " + $t('shortcuts.group'),
                  "Ctrl+\u21e7+G   " + $t('shortcuts.ungroup'),
                  '',
                  '── ' + $t('shortcuts.view') + ' ──',
                  "Tab        " + $t('shortcuts.mode'),
                  "F          " + $t('shortcuts.fit'),
                  "G          " + $t('shortcuts.grid'),
                  "L          " + $t('shortcuts.layers'),
                  "?          " + $t('shortcuts.show'),
                  '',
                  '── ' + $t('shortcuts.canvas') + ' ──',
                  $t('shortcuts.scroll') + ' ' + $t('shortcuts.zoom'),
                  "+/-        " + $t('shortcuts.zoom'),
                  $t('shortcuts.spaceDrag') + ' ' + $t('shortcuts.panCanvas'),
                  '',
                  '── ' + $t('shortcuts.walls') + ' ──',
                  $t('shortcuts.doubleClick') + ' ' + $t('shortcuts.finishWall'),
                  "C          " + $t('shortcuts.closeWall'),
                ].join('\n');
                try {
                  await navigator.clipboard.writeText(text);
                  if (generation === shortcutCopyGeneration) shortcutCopyState = 'copied';
                } catch {
                  if (generation === shortcutCopyGeneration) shortcutCopyState = 'failed';
                }
              }}
              aria-label={$t('shortcuts.copyLabel')}
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              {$t('shortcuts.copyAll')}
            </button>
            <button class="text-gray-400 hover:text-gray-600 text-xl leading-none" onclick={() => showHelp = false} aria-label={$t('shortcuts.close')}>✕</button>
          </div>
        </div>

        <!-- Body -->
        <div class="overflow-y-auto px-6 py-4">
          <div class="grid grid-cols-2 gap-x-8 gap-y-0 text-sm">
            <!-- Left column -->
            <div>
              <!-- Tools -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-indigo-500">{$t('shortcuts.tools')}</span>
                <div class="flex-1 h-px bg-indigo-100"></div>
              </div>
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.select')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">V</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.wall')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">W</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.door')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">D</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.pan')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">H</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.measure')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">M</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.annotate')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">N</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.text')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">T</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.snap')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">S</kbd></div>
              </div>

              <!-- Edit -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-500">{$t('shortcuts.edit')}</span>
                <div class="flex-1 h-px bg-amber-100"></div>
              </div>
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.undo')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+Z</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.redo')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+Y</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.copy')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+C</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.paste')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+V</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.selectAll')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+A</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.deselectAll')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+D</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.save')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+S</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.cancel')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Esc</kbd></div>
              </div>
            </div>

            <!-- Right column -->
            <div>
              <!-- Elements -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-500">{$t('shortcuts.elements')}</span>
                <div class="flex-1 h-px bg-emerald-100"></div>
              </div>
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.rotate')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">R</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.delete')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Del</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.lock')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+L</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.group')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+G</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.ungroup')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Ctrl+⇧+G</kbd></div>
              </div>

              <!-- View -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-blue-500">{$t('shortcuts.view')}</span>
                <div class="flex-1 h-px bg-blue-100"></div>
              </div>
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.mode')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">Tab</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.fit')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">F</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.grid')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">G</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.layers')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">L</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.show')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">?</kbd></div>
              </div>

              <!-- Canvas -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-purple-500">{$t('shortcuts.canvas')}</span>
                <div class="flex-1 h-px bg-purple-100"></div>
              </div>
              <div class="space-y-1.5 mb-5">
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.zoom')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">{$t('shortcuts.scroll')}</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.zoom')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">+ / −</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.panCanvas')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">{$t('shortcuts.spaceDrag')}</kbd></div>
              </div>

              <!-- Walls -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-rose-500">{$t('shortcuts.walls')}</span>
                <div class="flex-1 h-px bg-rose-100"></div>
              </div>
              <div class="space-y-1.5">
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.finishWall')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">{$t('shortcuts.doubleClick')}</kbd></div>
                <div class="flex justify-between"><span class="text-gray-600">{$t('shortcuts.closeWall')}</span><kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200">C</kbd></div>
              </div>
            </div>
          </div>
        </div>

        {#if shortcutCopyState !== 'idle'}
          <p role="status" class="px-6 py-2 text-xs text-slate-600">{$t(`shortcuts.${shortcutCopyState}`)}</p>
        {/if}

        <!-- Footer -->
        <div class="px-6 py-3 border-t border-gray-100 text-center">
          <p class="text-xs text-gray-400">{$t('shortcuts.footer')}</p>
        </div>
      </div>
    </dialog>
  {/if}

  <CommandPalette bind:open={commandPaletteOpen} />
  <PrintLayout bind:open={printOpen} />
  <OnboardingTooltip />
{:else}
  <div class="h-screen flex flex-col items-center justify-center gap-3">
    {#if loadError}
      <p role="alert" class="max-w-lg px-6 text-center text-red-700">{projectServiceMessage(loadError, $locale)}</p>
      <button class="text-blue-700 underline" onclick={initializeEditor}>{$t('library.retry')}</button>
      <button class="text-blue-700 underline" onclick={backupLibrary}>{$t('library.backup')}</button>
      <a class="text-blue-700 underline" href={`${base}/`}>{$t('editorRecovery.back')}</a>
    {:else if importingCapture}
      <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
      <p class="text-gray-400">{$t('editorRecovery.importing')}</p>
    {:else}
      <p class="text-gray-400">{$t('editorRecovery.loading')}</p>
    {/if}
  </div>
{/if}

<!-- iOS capture import error toast -->
{#if importError}
  <div class="fixed top-16 left-1/2 -translate-x-1/2 z-[100] w-[calc(100vw-2rem)] max-w-md bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-lg px-4 py-3 flex items-start gap-3" role="alert">
    <svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    <div class="flex-1 text-sm">
      <p class="font-semibold">{$t('editorRecovery.failed')}</p>
      <p>{importError instanceof CaptureImportError ? $t(importError.key, importError.variables) : importError}</p>
    </div>
    <button class="text-red-400 hover:text-red-600 text-lg leading-none" onclick={() => importError = null} aria-label={$t('editorRecovery.dismiss')}>✕</button>
  </div>
{/if}
