<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import type { HomeWorkspace, RenovationProject } from '$lib/models/homeforge';
  import { readHomeforgeDashboard } from '$lib/services/homeforgeDashboard';
  import { downloadHomeforgeBackup, storageErrorMessage } from '$lib/services/datastore';

  let workspace = $state<HomeWorkspace | null>(null);
  let zone = $state<RenovationProject | null>(null);
  let status = $state<Record<string, 'ready' | 'missing' | 'unreadable'>>({});
  let loading = $state(true);
  let error = $state('');

  onMount(() => {
    let alive = true;
    const params = new URL(window.location.href).searchParams;
    const workspaceId = params.get('workspace'), renovationId = params.get('renovation');
    void (async () => {
      try {
        if (!workspaceId || !renovationId) throw new Error('Zone link is incomplete. Return to the dashboard.');
        const data = await readHomeforgeDashboard();
        const found = data.workspaces.find(item => item.id === workspaceId);
        const renovation = found?.renovationProjects.find(item => item.id === renovationId);
        if (!found || !renovation) throw new Error('This renovation zone is unavailable. Download a HOMEFORGE backup for recovery.');
        if (alive) { workspace = found; zone = renovation; status = data.projectStatus; }
      } catch (reason) { if (alive) error = storageErrorMessage(reason); }
      finally { if (alive) loading = false; }
    })();
    return () => { alive = false; };
  });

  const editorUrl = (projectId: string, variantId?: string) => `${base}/editor?id=${encodeURIComponent(projectId)}&homeforge=1&workspace=${encodeURIComponent(workspace!.id)}&renovation=${encodeURIComponent(zone!.id)}${variantId ? `&variant=${encodeURIComponent(variantId)}` : ''}`;
  async function backup() {
    try { await downloadHomeforgeBackup(); error = ''; }
    catch (reason) { error = storageErrorMessage(reason); }
  }
</script>

<main class="min-h-screen bg-gray-50 p-5 text-slate-800">
  <div class="mx-auto max-w-4xl">
    <a class="text-sm text-blue-700 underline" href={`${base}/?workspace=${encodeURIComponent(workspace?.id ?? '')}`}>← Dashboard</a>
    {#if loading}
      <p role="status" class="mt-6">Loading renovation zone…</p>
    {:else if zone && workspace}
      {@const existing = zone.variants.find(item => item.id === zone!.existingVariantId)!}
      <p class="mt-6 text-sm text-slate-500">{workspace.name} / Renovation zone</p>
      <h1 class="mt-1 text-2xl font-semibold">{zone.name}</h1>
      {#if zone.description}<p class="mt-2 text-slate-600">{zone.description}</p>{/if}

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <section class="rounded-xl border bg-white p-5" aria-label="Existing Conditions">
          <h2 class="text-lg font-semibold">Existing Conditions</h2>
          <p class="mt-1 text-sm text-slate-600">Protected baseline for what physically exists. Use explicit correction mode in the editor to change it.</p>
          {#if status[existing.projectId] === 'ready'}
            <a class="mt-3 inline-block font-semibold text-blue-700 underline" href={editorUrl(existing.projectId)}>Open Existing Conditions</a>
          {:else}
            <p role="alert" class="mt-3 text-sm text-amber-800">Saved Existing plan is {status[existing.projectId] === 'missing' ? 'missing' : 'unreadable'}. Download a HOMEFORGE backup for recovery.</p>
          {/if}
        </section>
        <section class="rounded-xl border bg-white p-5" aria-label="Design options">
          <h2 class="text-lg font-semibold">Design options</h2>
          <p class="mt-1 text-sm text-slate-600">Each option has its own saved plan and assets.</p>
          {#if zone.variants.some(item => item.kind === 'option')}
            <ul class="mt-3 space-y-2">
              {#each zone.variants.filter(item => item.kind === 'option') as option (option.id)}
                <li>{#if status[option.projectId] === 'ready'}<a class="text-blue-700 underline" href={editorUrl(option.projectId, option.id)}>Open {option.name}</a>{:else}<span>{option.name} — saved plan unavailable</span>{/if}</li>
              {/each}
            </ul>
          {:else}<p class="mt-3 text-sm text-slate-500">Create an option from the Existing editor when you are ready to explore a design.</p>{/if}
        </section>
      </div>
      <section class="mt-4 rounded-xl border bg-white p-5" aria-label="Renovation workflow">
        <h2 class="text-lg font-semibold">Your workflow</h2>
        <ol class="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-700">
          <li>Gather photos, plans and measurements for this area. Guided capture is not available yet.</li>
          <li>Model and correct Existing Conditions using the editor.</li>
          <li>Create independent options. Open each one to inspect its 2D, elevation and 3D views.</li>
          <li>Export a HOMEFORGE backup before changing browser storage.</li>
        </ol>
      </section>
      <button class="mt-5 text-sm font-semibold text-blue-700 underline" onclick={backup}>Download HOMEFORGE backup</button>
    {/if}
    {#if error}<p role="alert" class="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{error} <button class="underline" onclick={backup}>Download HOMEFORGE backup</button></p>{/if}
  </div>
</main>
