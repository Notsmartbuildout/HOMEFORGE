<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { base } from '$app/paths';
  import type { HomeWorkspace } from '$lib/models/homeforge';
  import { createHomeWorkspace, createHomeforgeStore } from '$lib/services/homeforge';
  import { readHomeforgeDashboard } from '$lib/services/homeforgeDashboard';
  import { downloadHomeforgeBackup, storageErrorMessage, LIBRARY_CHANGE_KEY } from '$lib/services/datastore';
  import { modalDialog } from '$lib/utils/modalDialog';

  let { projects, revision, onchanged, onrestore }: {
    projects: { id: string; name: string }[]; revision: number;
    onchanged: () => Promise<void>; onrestore: () => void;
  } = $props();
  const client = createHomeforgeStore();
  let workspaces = $state<HomeWorkspace[]>([]);
  let issues = $state<{ id: string; message: string }[]>([]);
  let projectStatus = $state<Record<string, 'ready' | 'missing' | 'unreadable'>>({});
  let selectedId = $state('');
  const selected = $derived(workspaces.find(w => w.id === selectedId));
  let loading = $state(true), busy = $state(false), error = $state<string | null>(null);
  let needsRefresh = $state(false);
  const blocked = $derived(busy || needsRefresh);
  let workspaceForm = $state(false), renovationForm = $state(false);
  let workspaceName = $state(''), renovationName = $state(''), description = $state(''), startingPlan = $state('');
  let workspaceInput = $state<HTMLInputElement>(), renovationInput = $state<HTMLInputElement>();
  let removal = $state<HomeWorkspace | null>(null);
  let renovationWorkspaceId = '';
  let request = 0, alive = true;
  onDestroy(() => { alive = false; request++; });

  async function refresh() {
    const token = ++request;
    loading = true;
    try {
      const data = await readHomeforgeDashboard();
      if (!alive || token !== request) return;
      workspaces = data.workspaces; issues = data.errors; projectStatus = data.projectStatus;
      if (!workspaces.some(w => w.id === selectedId)) selectedId = workspaces[0]?.id ?? '';
      if (needsRefresh) { needsRefresh = false; error = null; }
    } finally { if (alive && token === request) loading = false; }
  }
  async function refreshSafely() {
    try { await refresh(); } catch (reason) { if (alive) error = storageErrorMessage(reason); }
  }
  $effect(() => { revision; void refreshSafely(); });
  onMount(() => {
    const requestedWorkspace = new URL(window.location.href).searchParams.get('workspace');
    if (requestedWorkspace) selectedId = requestedWorkspace;
    const focus = () => { void refreshSafely(); };
    const storage = (event: StorageEvent) => { if (event.key === LIBRARY_CHANGE_KEY) focus(); };
    window.addEventListener('focus', focus); window.addEventListener('storage', storage);
    return () => { window.removeEventListener('focus', focus); window.removeEventListener('storage', storage); };
  });

  async function mutate(action: () => Promise<void>) {
    if (blocked) return;
    busy = true; error = null;
    let committed = false;
    try {
      await action(); committed = true;
      await refresh(); await onchanged();
    } catch (reason) {
      if (committed) needsRefresh = true;
      if (alive) error = committed ? 'The change was saved, but the list could not refresh. Reload the page before trying another change.' : storageErrorMessage(reason);
    } finally { if (alive) busy = false; }
  }
  async function showWorkspaceForm() { workspaceForm = true; await tick(); workspaceInput?.focus(); }
  async function showRenovationForm() { renovationWorkspaceId = selectedId; renovationForm = true; await tick(); renovationInput?.focus(); }
  async function createWorkspace() {
    const name = workspaceName.trim(); if (!name) return;
    await mutate(async () => {
      const workspace = createHomeWorkspace(name); await client.save(workspace);
      selectedId = workspace.id; workspaceName = ''; workspaceForm = false;
    });
  }
  async function createRenovation() {
    const name = renovationName.trim(), id = selectedId, notes = description.trim(), projectId = startingPlan;
    if (!name || !id) return;
    await mutate(async () => {
      const details = { name, ...(notes ? { description: notes } : {}) };
      await client.createRenovationProject(id, projectId ? { ...details, projectId } : details);
      renovationName = ''; description = ''; startingPlan = ''; renovationForm = false;
    });
  }
  async function beginRemoval() {
    if (!selectedId || blocked) return;
    try { removal = await client.load(selectedId); }
    catch (reason) { error = storageErrorMessage(reason); }
  }
  async function removeMetadata() {
    const id = removal?.id; if (!id) return;
    await mutate(async () => { await client.delete(id); removal = null; renovationForm = false; });
  }
  async function backup() {
    try { await downloadHomeforgeBackup(); } catch (reason) { error = storageErrorMessage(reason); }
  }
</script>

<section aria-label="HOMEFORGE renovations" class="mb-8 rounded-xl border border-gray-200 bg-white p-5 text-gray-800">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="text-xl font-semibold">Your renovation projects</h2>
      <p class="mt-1 text-sm text-gray-500">Organize your home and reopen its Existing Conditions plans. Saved in this browser.</p>
    </div>
    <button id="homeforge-new-workspace" onclick={showWorkspaceForm} disabled={blocked} class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-40">New home workspace</button>
  </div>
  <div class="mt-4 flex flex-wrap gap-4 text-sm">
    <button onclick={backup} class="font-semibold text-blue-600 underline">Download HOMEFORGE backup</button>
    <button onclick={onrestore} disabled={blocked} class="font-semibold text-blue-600 underline disabled:opacity-40">Restore HOMEFORGE backup</button>
    <button onclick={refreshSafely} disabled={busy} class="text-gray-600 underline disabled:opacity-40">Refresh workspaces</button>
  </div>
  {#if error}<p role="alert" class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>{/if}
  {#each issues as issue}<p role="alert" class="mt-3 break-words rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{issue.message} Workspace: {issue.id}</p>{/each}
  {#if loading && !workspaces.length}<p role="status" class="mt-4 text-sm text-gray-500">Loading workspaces…</p>{/if}
  {#if busy}<p role="status" class="mt-4 text-sm text-gray-500">Saving HOMEFORGE changes…</p>{/if}

  {#if workspaceForm}
    <form aria-label="Create home workspace" onsubmit={event => { event.preventDefault(); void createWorkspace(); }} class="mt-5 rounded-lg bg-gray-50 p-4">
      <label for="homeforge-workspace-name" class="block text-sm font-medium">Workspace name</label>
      <input id="homeforge-workspace-name" bind:this={workspaceInput} bind:value={workspaceName} required disabled={busy} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
      <div class="mt-3 flex flex-wrap gap-3">
        <button disabled={busy || !workspaceName.trim()} class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Create workspace</button>
        <button type="button" disabled={busy} onclick={() => workspaceForm = false} class="text-sm underline">Cancel workspace creation</button>
      </div>
    </form>
  {/if}

  {#if workspaces.length}
    <div class="mt-5 flex flex-wrap items-end gap-3">
      <div class="min-w-0 flex-1">
        <label for="homeforge-workspace" class="block text-sm font-medium">Home workspace</label>
        <select id="homeforge-workspace" bind:value={selectedId} disabled={blocked} onchange={event => { if (event.currentTarget.value !== renovationWorkspaceId) renovationForm = false; }} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
          {#each workspaces as workspace}<option value={workspace.id}>{workspace.name}</option>{/each}
        </select>
      </div>
      <button onclick={showRenovationForm} disabled={blocked || !selected} class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">New renovation</button>
      <button onclick={beginRemoval} disabled={blocked || !selected} class="py-2 text-sm text-gray-600 underline disabled:opacity-40">Remove workspace metadata</button>
    </div>
  {:else if !loading}
    <p class="mt-5 text-sm text-gray-500">Create a home workspace to start organizing renovations. Your existing editor projects remain available below.</p>
  {/if}

  {#if renovationForm && selected}
    <form aria-label="Create renovation" onsubmit={event => { event.preventDefault(); void createRenovation(); }} class="mt-5 rounded-lg bg-gray-50 p-4">
      <label for="homeforge-renovation-name" class="block text-sm font-medium">Renovation name</label>
      <input id="homeforge-renovation-name" bind:this={renovationInput} bind:value={renovationName} required disabled={busy} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
      <label for="homeforge-description" class="mt-3 block text-sm font-medium">Description (optional)</label>
      <textarea id="homeforge-description" bind:value={description} disabled={busy} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"></textarea>
      <label for="homeforge-starting-plan" class="mt-3 block text-sm font-medium">Starting plan</label>
      <select id="homeforge-starting-plan" bind:value={startingPlan} disabled={busy} class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
        <option value="">New empty plan</option>
        {#each projects as project}<option value={project.id}>Use saved plan: {project.name}</option>{/each}
      </select>
      <p class="mt-2 text-xs text-gray-500">Using a saved plan references its current geometry. Edits remain shared with that editor project.</p>
      <div class="mt-3 flex flex-wrap gap-3">
        <button disabled={busy || !renovationName.trim()} class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Create renovation</button>
        <button type="button" disabled={busy} onclick={() => renovationForm = false} class="text-sm underline">Cancel renovation creation</button>
      </div>
    </form>
  {/if}

  {#if selected}
    <div class="mt-5 grid gap-4 sm:grid-cols-2">
      {#each selected.renovationProjects as renovation (renovation.id)}
        {@const variant = renovation.variants.find(v => v.id === renovation.existingVariantId)!}
        {@const activeVariant = renovation.variants.find(v => v.id === renovation.activeVariantId)!}
        <article aria-label={renovation.name} class="min-w-0 rounded-lg border border-gray-200 p-4">
          <h3 class="break-words font-semibold">{renovation.name}</h3>
          {#if renovation.description}<p class="mt-1 break-words text-sm text-gray-500">{renovation.description}</p>{/if}
          <p class="mt-3 text-sm font-medium">Existing Conditions</p>
          {#if projectStatus[variant.projectId] === 'ready'}
            <a href={`${base}/editor?id=${encodeURIComponent(variant.projectId)}&homeforge=1&workspace=${encodeURIComponent(selected.id)}&renovation=${encodeURIComponent(renovation.id)}`} class="mt-2 inline-block text-sm font-semibold text-blue-600 underline">Open Existing Conditions</a>
            <p class="mt-2 text-xs text-gray-500">Existing Conditions is protected. Use explicit correction mode for baseline edits.</p>
          {:else}
            <p role="alert" class="mt-2 text-sm text-amber-800">{projectStatus[variant.projectId] === 'missing' ? 'Saved plan is missing.' : 'Saved plan is unreadable.'} Download a HOMEFORGE backup for recovery.</p>
          {/if}
          {#if activeVariant.id !== variant.id}
            {#if projectStatus[activeVariant.projectId] === 'ready'}
              <a href={`${base}/editor?id=${encodeURIComponent(activeVariant.projectId)}&homeforge=1&workspace=${encodeURIComponent(selected.id)}&renovation=${encodeURIComponent(renovation.id)}&variant=${encodeURIComponent(activeVariant.id)}`} class="mt-3 inline-block text-sm font-semibold text-blue-600 underline">Continue {activeVariant.name}</a>
            {:else}<p role="alert" class="mt-2 text-sm text-amber-800">Active option is unavailable. Download a HOMEFORGE backup for recovery.</p>{/if}
          {/if}
        </article>
      {:else}<p class="text-sm text-gray-500">No renovations yet. Start with one space, such as the front entry.</p>{/each}
    </div>
  {/if}
</section>

{#if removal}
  <dialog use:modalDialog aria-labelledby="homeforge-remove-title" oncancel={event => { if (busy) event.preventDefault(); else removal = null; }} class="m-auto w-[28rem] max-w-[calc(100vw-2rem)] rounded-xl bg-white p-5 text-gray-800 shadow-2xl backdrop:bg-black/50">
    <h2 id="homeforge-remove-title" class="text-lg font-semibold">Remove workspace metadata</h2>
    <p class="mt-3 break-words text-sm">Remove “{removal.name}” and its {removal.renovationProjects.length} renovation relationships? Saved editor projects, photos and history are retained. Download a HOMEFORGE backup first if you want to recover these relationships.</p>
    <div class="mt-5 flex justify-end gap-3">
      <button disabled={busy} onclick={() => removal = null} class="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
      <button disabled={busy} onclick={removeMetadata} class="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">Remove metadata</button>
    </div>
    {#if error}<p role="alert" class="mt-3 text-sm text-red-800">{error}</p>{/if}
  </dialog>
{/if}
