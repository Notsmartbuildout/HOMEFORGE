<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import type { HomeforgeZone, ZoneEvidence } from '$lib/models/homeforgeZone';
  import type { Project } from '$lib/models/types';
  import { readHomeforgeDashboard } from '$lib/services/homeforgeDashboard';
  import { createHomeforgeZoneStore } from '$lib/services/homeforgeZone';
  import { downloadHomeforgeBackup, storageErrorMessage } from '$lib/services/datastore';
  import { createProjectFromRoomPlan } from '$lib/utils/roomplanImport';

  const store = createHomeforgeZoneStore();
  let workspaceId = $state(''), renovationId = $state(''), zoneName = $state('');
  let capture = $state<HomeforgeZone | null>(null);
  let loading = $state(true), saving = $state(false), error = $state(''), notice = $state('');
  let kind = $state<'photo' | 'plan' | 'sketch' | 'roomplan'>('photo');
  let category = $state<NonNullable<ZoneEvidence['category']>>('overview');
  let scope = $state<'context' | 'focus'>('context');
  let fileInput = $state<HTMLInputElement>();
  let draft = $state<Project | null>(null), reviewedEvidenceId = $state('');
  let selectedFeatureId = $state(''), selectedEvidenceId = $state('');
  let previewUrl = $state(''), previewName = $state('');

  onMount(() => {
    let alive = true;
    void (async () => {
      try {
        const params = new URL(window.location.href).searchParams;
        const w = params.get('workspace'), r = params.get('renovation');
        if (!w || !r) throw new Error('Capture link is incomplete. Return to the dashboard.');
        const dashboard = await readHomeforgeDashboard();
        const renovation = dashboard.workspaces.find(item => item.id === w)?.renovationProjects.find(item => item.id === r);
        if (!renovation) throw new Error('Renovation zone is unavailable. Download a HOMEFORGE backup for recovery.');
        const saved = await store.ensure(w, r);
        if (alive) { workspaceId = w; renovationId = r; zoneName = renovation.name; capture = saved; }
      } catch (reason) { if (alive) error = storageErrorMessage(reason); }
      finally { if (alive) loading = false; }
    })();
    return () => { alive = false; if (previewUrl) URL.revokeObjectURL(previewUrl); };
  });

  async function startVisit() {
    if (!capture) return;
    saving = true; error = '';
    try { await store.addSession(workspaceId, renovationId); capture = await store.load(workspaceId, renovationId); notice = 'Capture visit started.'; }
    catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }

  async function saveEvidence() {
    const file = fileInput?.files?.[0], session = capture?.sessions.at(-1);
    if (!file || !session) { error = 'Start a capture visit and choose a file.'; return; }
    saving = true; error = ''; notice = '';
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const estimated = await navigator.storage?.estimate?.();
      if (estimated?.quota && estimated.usage && estimated.quota - estimated.usage < bytes.length * 2)
        throw new Error('Browser storage may be full. Download a HOMEFORGE backup, free space, then retry.');
      await store.addEvidence(workspaceId, renovationId, session.id, {
        kind, scope, category, name: file.name, mimeType: kind === 'roomplan' ? 'application/json' : file.type, bytes,
        featureIds: selectedFeatureId ? [selectedFeatureId] : []
      });
      capture = await store.load(workspaceId, renovationId);
      if (fileInput) fileInput.value = '';
      notice = 'Original file saved with this renovation zone.';
    } catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }

  async function backup() {
    try { await downloadHomeforgeBackup(); error = ''; }
    catch (reason) { error = storageErrorMessage(reason); }
  }
  async function reviewRoomPlan(item: ZoneEvidence) {
    error = ''; draft = null; reviewedEvidenceId = '';
    try {
      const bytes = await store.readEvidenceBytes(workspaceId, renovationId, item.id);
      draft = createProjectFromRoomPlan(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), `${item.name} draft`);
      reviewedEvidenceId = item.id;
    } catch (reason) { error = storageErrorMessage(reason); }
  }
  async function linkEvidence() {
    if (!selectedEvidenceId || !selectedFeatureId) return;
    saving = true; error = '';
    try {
      await store.linkEvidence(workspaceId, renovationId, selectedEvidenceId, selectedFeatureId);
      capture = await store.load(workspaceId, renovationId); selectedEvidenceId = '';
    } catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }
  async function showPreview(item: ZoneEvidence) {
    error = '';
    try {
      const bytes = await store.readEvidenceBytes(workspaceId, renovationId, item.id);
      const image = await createImageBitmap(new Blob([Uint8Array.from(bytes)], { type: item.mimeType }));
      const scale = Math.min(1, 640 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
      const preview = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Preview could not be created.')), 'image/jpeg', 0.75));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(preview); previewName = item.name;
    } catch (reason) { error = storageErrorMessage(reason); }
  }
</script>

<main class="min-h-screen bg-gray-50 p-5 text-slate-800">
  <div class="mx-auto max-w-4xl">
    <a class="text-sm text-blue-700 underline" href={`${base}/zone?workspace=${encodeURIComponent(workspaceId)}&renovation=${encodeURIComponent(renovationId)}`}>← Zone overview</a>
    <h1 class="mt-5 text-2xl font-semibold">Capture Existing Conditions</h1>
    {#if zoneName}<p class="mt-1 text-slate-600">{zoneName}</p>{/if}
    {#if loading}<p role="status" class="mt-5">Loading capture…</p>
    {:else if capture}
      <p class="mt-4 text-sm text-slate-600">Photograph the surrounding context, then each wall, openings and stairs, and the details you plan to change. Add a plan, sketch or compatible RoomPlan JSON when available. Files stay in this browser until you export a backup.</p>
      <section class="mt-5 rounded-xl border bg-white p-5" aria-label="Capture visit">
        <h2 class="text-lg font-semibold">Capture visit</h2>
        <p class="mt-1 text-sm text-slate-600">{capture.sessions.length} saved visit{capture.sessions.length === 1 ? '' : 's'}</p>
        <button class="mt-3 rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={saving} onclick={startVisit}>Start capture visit</button>
        {#if capture.sessions.length}
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <label class="text-sm font-medium">Capture step
              <select class="mt-1 block w-full rounded border p-2" bind:value={category}>
                <option value="overview">Overview and context</option><option value="wall">Wall by wall</option>
                <option value="opening">Doors, windows and stairs</option><option value="detail">Renovation detail</option>
                <option value="reference">Plan, sketch or scan reference</option>
              </select>
            </label>
            <label class="text-sm font-medium">Evidence type
              <select class="mt-1 block w-full rounded border p-2" bind:value={kind}>
                <option value="photo">Photo</option><option value="plan">Floor plan image</option>
                <option value="sketch">Sketch image</option><option value="roomplan">RoomPlan JSON</option>
              </select>
            </label>
            <label class="text-sm font-medium">Area
              <select class="mt-1 block w-full rounded border p-2" bind:value={scope}>
                <option value="context">Surrounding context</option><option value="focus">Renovation focus</option>
              </select>
            </label>
            <label class="text-sm font-medium">Photo or import file
              <input class="mt-1 block w-full rounded border p-2" type="file" accept={kind === 'roomplan' ? '.json,application/json' : 'image/png,image/jpeg'} bind:this={fileInput} />
            </label>
            {#if capture.features.length}
              <label class="text-sm font-medium">Feature (optional)<select class="mt-1 block w-full rounded border p-2" bind:value={selectedFeatureId}>
                <option value="">No feature link</option>{#each capture.features as feature}<option value={feature.id}>{feature.label}</option>{/each}
              </select></label>
            {/if}
          </div>
          <button class="mt-4 rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={saving} onclick={saveEvidence}>Save evidence</button>
        {/if}
      </section>
      <section class="mt-4 rounded-xl border bg-white p-5" aria-label="Saved evidence">
        <h2 class="text-lg font-semibold">Saved evidence</h2>
        {#if capture.evidence.length}
          <ul class="mt-3 space-y-2 text-sm">
            {#each capture.evidence as item (item.id)}
              <li><span class="font-medium">{item.name}</span> — {item.category ?? item.kind}, {item.scope}, {item.byteLength} bytes
                {#if item.featureIds.length}<span> · {item.featureIds.map(id => capture!.features.find(feature => feature.id === id)?.label ?? 'unavailable feature').join(', ')}</span>{/if}
                {#if item.kind === 'roomplan'}<button class="ml-2 text-blue-700 underline" onclick={() => reviewRoomPlan(item)}>Review RoomPlan draft</button>{/if}
                {#if item.kind === 'photo' || item.kind === 'plan' || item.kind === 'sketch'}<button class="ml-2 text-blue-700 underline" onclick={() => showPreview(item)}>Show derived preview</button>{/if}
                {#if item.kind === 'photo'}<span> · visual context; dimensions require separate measurement</span>{/if}
                {#if item.kind === 'plan' || item.kind === 'sketch'}<span> · reference image; metric tracing requires calibration</span>{/if}
              </li>
            {/each}
          </ul>
          {#if capture.features.length}
            <form class="mt-4 grid gap-3 sm:grid-cols-3" onsubmit={event => { event.preventDefault(); void linkEvidence(); }}>
              <label>Saved evidence<select class="mt-1 block w-full rounded border p-2" bind:value={selectedEvidenceId} required><option value="">Choose evidence</option>{#each capture.evidence as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
              <label>Feature to link<select class="mt-1 block w-full rounded border p-2" bind:value={selectedFeatureId} required><option value="">Choose feature</option>{#each capture.features as feature}<option value={feature.id}>{feature.label}</option>{/each}</select></label>
              <button class="self-end rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={saving}>Link evidence</button>
            </form>
          {/if}
        {:else}<p class="mt-2 text-sm text-slate-600">No evidence saved yet.</p>{/if}
      </section>
      {#if previewUrl}<figure class="mt-4 rounded-xl border bg-white p-5"><img src={previewUrl} alt={`Derived preview of ${previewName}`} class="max-h-80 max-w-full object-contain" /><figcaption class="mt-2 text-sm text-slate-600">Reduced preview of {previewName}; original file remains saved separately.</figcaption></figure>{/if}
      {#if draft}
        <section class="mt-4 rounded-xl border bg-white p-5" aria-label="RoomPlan draft review">
          <h2 class="font-semibold">RoomPlan draft from {capture.evidence.find(item => item.id === reviewedEvidenceId)?.name}</h2>
          <p class="mt-1 text-sm">{draft.floors.length} floors · {draft.floors.reduce((sum, floor) => sum + floor.walls.length, 0)} walls · {draft.floors.reduce((sum, floor) => sum + floor.doors.length, 0)} doors · {draft.floors.reduce((sum, floor) => sum + floor.windows.length, 0)} windows</p>
          <p class="mt-2 text-sm text-amber-800">Draft only. Existing Conditions were not changed. Review and protected acceptance are required before using imported geometry as the baseline.</p>
        </section>
      {/if}
      <button class="mt-5 text-sm font-semibold text-blue-700 underline" onclick={backup}>Download HOMEFORGE backup</button>
      {#if notice}<p role="status" class="mt-3 text-sm text-green-800">{notice}</p>{/if}
    {/if}
    {#if error}<p role="alert" class="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{error}</p>{/if}
  </div>
</main>
