<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import type { HomeWorkspace, RenovationProject } from '$lib/models/homeforge';
  import type { HomeforgeZone, ZoneFeature, ZoneMeasurement } from '$lib/models/homeforgeZone';
  import type { Project } from '$lib/models/types';
  import { readHomeforgeDashboard } from '$lib/services/homeforgeDashboard';
  import { createHomeforgeZoneStore } from '$lib/services/homeforgeZone';
  import { createLocalStore, downloadHomeforgeBackup, storageErrorMessage } from '$lib/services/datastore';
  import { coveragePrompts, geometryValue, measurementStatus } from '$lib/utils/homeforgeCoverage';
  import { compareZone, comparisonCsv } from '$lib/utils/homeforgeComparison';

  function editorElements(project: Project | null) {
    return project?.floors.flatMap((floor, floorIndex) => {
      const openingPoint = (wallId: string, position: number) => {
        const wall = floor.walls.find(item => item.id === wallId);
        return wall ? { x: wall.start.x + (wall.end.x - wall.start.x) * position,
          y: wall.start.y + (wall.end.y - wall.start.y) * position } : { x: 0, y: 0 };
      };
      const groups = [
        { kind: 'walls' as const, prefix: 'W', items: floor.walls.map(item => ({ id: item.id,
          x: (item.start.x + item.end.x) / 2, y: (item.start.y + item.end.y) / 2 })) },
        { kind: 'doors' as const, prefix: 'D', items: floor.doors.map(item => ({ id: item.id, ...openingPoint(item.wallId, item.position) })) },
        { kind: 'windows' as const, prefix: 'N', items: floor.windows.map(item => ({ id: item.id, ...openingPoint(item.wallId, item.position) })) },
        { kind: 'stairs' as const, prefix: 'S', items: floor.stairs.map(item => ({ id: item.id, ...item.position })) }
      ];
      return groups.flatMap(group => group.items.sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))
        .map((item, index) => ({ key: JSON.stringify([floor.id, group.kind, item.id]), floorId: floor.id,
          kind: group.kind, elementId: item.id, name: `${floor.name} / ${group.kind.slice(0, -1)} ${index + 1}`,
          suggestedLabel: `F${floorIndex + 1}-${group.prefix}${index + 1}` })));
    }) ?? [];
  }

  const zoneStore = createHomeforgeZoneStore(), projectStore = createLocalStore();

  let workspace = $state<HomeWorkspace | null>(null);
  let zone = $state<RenovationProject | null>(null);
  let status = $state<Record<string, 'ready' | 'missing' | 'unreadable'>>({});
  let loading = $state(true);
  let error = $state('');
  let capture = $state<HomeforgeZone | null>(null), existingProject = $state<Project | null>(null);
  let comparisonProjects = $state<Record<string, Project | null>>({});
  let elementKey = $state(''), featureLabel = $state(''), measurementFeatureId = $state('');
  let measurementProperty = $state('wall.length'), measuredValue = $state<number | undefined>(undefined);
  let measurementUnit = $state<ZoneMeasurement['unit']>('cm'), saving = $state(false);
  let measurementSource = $state<Exclude<ZoneMeasurement['source'], 'calculated'>>('manually measured');
  let measurementEvidenceId = $state('');
  let editingFeatureId = $state(''), editedLabel = $state(''), editedDescription = $state('');
  let relationKind = $state<ZoneFeature['relations'][number]['kind']>('replaces'), relatedFeatureId = $state('');
  let reviewVariantId = $state(''), reviewFeatureId = $state(''), reviewElementKey = $state('');
  let reviewProject = $state<Project | null>(null);
  const elements = $derived(editorElements(existingProject));
  const prompts = $derived(capture ? coveragePrompts(capture) : []);
  const reviewElements = $derived(editorElements(reviewProject));
  const comparison = $derived(capture && zone ? compareZone(capture, zone, comparisonProjects) : null);

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
        let saved: HomeforgeZone | null = null, project: Project | null = null;
        const existing = renovation.variants.find(item => item.id === renovation.existingVariantId);
        if (existing && data.projectStatus[existing.projectId] === 'ready') {
          project = await projectStore.load(existing.projectId);
          saved = await zoneStore.ensure(workspaceId, renovationId);
        }
        const projects: Record<string, Project | null> = {};
        await Promise.all(renovation.variants.map(async variant => {
          try { projects[variant.projectId] = variant.id === renovation.existingVariantId ? project : await projectStore.load(variant.projectId); }
          catch { projects[variant.projectId] = null; }
        }));
        if (alive) { workspace = found; zone = renovation; status = data.projectStatus; capture = saved; existingProject = project; comparisonProjects = projects; }
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
  async function downloadComparison() {
    if (!workspace || !zone) return;
    saving = true; error = '';
    try {
      const data = await readHomeforgeDashboard();
      const current = data.workspaces.find(item => item.id === workspace!.id)?.renovationProjects.find(item => item.id === zone!.id);
      const latest = await zoneStore.load(workspace.id, zone.id);
      if (!current || !latest) throw new Error('The saved zone changed or is unavailable. Reload before exporting.');
      const projects: Record<string, Project | null> = {};
      await Promise.all(current.variants.map(async variant => {
        try { projects[variant.projectId] = await projectStore.load(variant.projectId); }
        catch { projects[variant.projectId] = null; }
      }));
      const url = URL.createObjectURL(new Blob([comparisonCsv(current.name, compareZone(latest, current, projects))], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = `${current.name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}-dimensions.csv`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      zone = current; capture = latest; comparisonProjects = projects; status = data.projectStatus;
      existingProject = projects[current.variants.find(item => item.id === current.existingVariantId)!.projectId];
    } catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }
  async function saveFeature() {
    const element = elements.find(item => item.key === elementKey);
    if (!workspace || !zone || !capture || !element) return;
    saving = true; error = '';
    try {
      const kind = element.kind.slice(0, -1) as ZoneFeature['kind'];
      const feature = await zoneStore.addFeature(workspace.id, zone.id, { kind, label: featureLabel.trim(), scope: 'focus',
        binding: { variantId: zone.existingVariantId, floorId: element.floorId, kind: element.kind, elementId: element.elementId } });
      capture = await zoneStore.load(workspace.id, zone.id);
      measurementFeatureId = feature.id; measurementProperty = `${kind}.${kind === 'stair' ? 'width' : 'length'}`;
      featureLabel = ''; elementKey = '';
    } catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }
  async function saveMeasurement() {
    if (!workspace || !zone || !capture || !measurementFeatureId || measuredValue === undefined) return;
    saving = true; error = '';
    try {
      await zoneStore.addMeasurement(workspace.id, zone.id, { featureId: measurementFeatureId, property: measurementProperty,
        enteredValue: measuredValue, unit: measurementUnit, source: measurementSource, evidenceIds: measurementEvidenceId ? [measurementEvidenceId] : [] });
      capture = await zoneStore.load(workspace.id, zone.id); measuredValue = undefined;
    } catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }
  async function verifyMeasurement(id: string) {
    if (!workspace || !zone) return;
    saving = true; error = '';
    try { await zoneStore.verifyMeasurement(workspace.id, zone.id, id); capture = await zoneStore.load(workspace.id, zone.id); }
    catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }
  async function setSufficient(sufficient: boolean) {
    if (!workspace || !zone) return;
    saving = true; error = '';
    try { await zoneStore.setSufficient(workspace.id, zone.id, sufficient); capture = await zoneStore.load(workspace.id, zone.id); }
    catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }
  function nominalRiser(featureId: string): { riseId: string; valueCm: number } | null {
    if (!capture || !existingProject || !zone) return null;
    const rise = capture.measurements.filter(item => item.featureId === featureId && item.property === 'stair.totalRise').at(-1);
    if (!rise) return null;
    const valueCm = geometryValue(capture, { ...rise, property: 'stair.riserHeight', source: 'calculated', dependencies: [rise.id] }, existingProject, zone.existingVariantId);
    return valueCm === null ? null : { riseId: rise.id, valueCm };
  }
  async function calculateRiser(featureId: string) {
    if (!workspace || !zone) return;
    const calculation = nominalRiser(featureId);
    if (!calculation) return;
    saving = true; error = '';
    try {
      await zoneStore.addMeasurement(workspace.id, zone.id, { featureId, property: 'stair.riserHeight',
        enteredValue: calculation.valueCm, unit: 'cm', source: 'calculated', evidenceIds: [], dependencies: [calculation.riseId] });
      capture = await zoneStore.load(workspace.id, zone.id);
    } catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }
  async function saveFeatureEdit() {
    if (!workspace || !zone || !editingFeatureId) return;
    saving = true; error = '';
    try {
      await zoneStore.updateFeature(workspace.id, zone.id, editingFeatureId, { label: editedLabel, description: editedDescription });
      capture = await zoneStore.load(workspace.id, zone.id); editingFeatureId = '';
    } catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }
  async function saveRelation() {
    if (!workspace || !zone || !editingFeatureId || !relatedFeatureId) return;
    saving = true; error = '';
    try {
      await zoneStore.addRelation(workspace.id, zone.id, editingFeatureId, { kind: relationKind, featureId: relatedFeatureId });
      capture = await zoneStore.load(workspace.id, zone.id); relatedFeatureId = '';
    } catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
  }
  async function chooseReviewVariant(variantId: string) {
    reviewVariantId = variantId; reviewProject = null; reviewFeatureId = ''; reviewElementKey = ''; error = '';
    const variant = zone?.variants.find(item => item.id === variantId);
    if (!variant) return;
    try { reviewProject = await projectStore.load(variant.projectId); }
    catch (reason) { error = storageErrorMessage(reason); }
  }
  async function saveReviewedBinding() {
    const element = reviewElements.find(item => item.key === reviewElementKey);
    if (!workspace || !zone || !element || !reviewFeatureId || !reviewVariantId) return;
    saving = true; error = '';
    try {
      await zoneStore.bindFeature(workspace.id, zone.id, reviewFeatureId,
        { variantId: reviewVariantId, floorId: element.floorId, kind: element.kind, elementId: element.elementId });
      capture = await zoneStore.load(workspace.id, zone.id); reviewFeatureId = ''; reviewElementKey = '';
    } catch (reason) { error = storageErrorMessage(reason); }
    finally { saving = false; }
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
      {#if capture && existingProject}
        <section class="mt-4 rounded-xl border bg-white p-5" aria-label="Feature measurements">
          <h2 class="text-lg font-semibold">Features and measurements</h2>
          <p class="mt-1 text-sm text-slate-600">Give saved elements stable labels. Measurements record what you observed; Existing geometry changes only through correction mode in the editor.</p>
          <form class="mt-4 grid gap-3 sm:grid-cols-3" onsubmit={event => { event.preventDefault(); void saveFeature(); }}>
            <label>Existing element<select class="mt-1 block w-full rounded border p-2" bind:value={elementKey} onchange={event => {
              const chosen = elements.find(item => item.key === event.currentTarget.value);
              if (chosen && !featureLabel) {
                let label = chosen.suggestedLabel, suffix = 2;
                while (capture?.features.some(item => item.label.toLocaleLowerCase() === label.toLocaleLowerCase())) label = `${chosen.suggestedLabel}-${suffix++}`;
                featureLabel = label;
              }
            }} required>
              <option value="">Choose an element</option>{#each elements as element}<option value={element.key}>{element.name}</option>{/each}
            </select></label>
            <label>Feature label<input class="mt-1 block w-full rounded border p-2" bind:value={featureLabel} required maxlength="180" placeholder="W1" /></label>
            <button class="self-end rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={saving}>Save feature</button>
          </form>
          {#if capture.features.length}
            <form class="mt-5 grid gap-3 sm:grid-cols-5" onsubmit={event => { event.preventDefault(); void saveMeasurement(); }}>
              <label>Feature<select class="mt-1 block w-full rounded border p-2" value={measurementFeatureId} onchange={event => {
                measurementFeatureId = event.currentTarget.value;
                measurementProperty = prompts.find(item => item.featureId === measurementFeatureId)?.property ?? '';
              }} required>
                <option value="">Choose feature</option>{#each capture.features as feature}<option value={feature.id}>{feature.label}</option>{/each}
              </select></label>
              <label>Measurement property<select class="mt-1 block w-full rounded border p-2" bind:value={measurementProperty} required>
                {#each prompts.filter(item => item.featureId === measurementFeatureId) as prompt}<option value={prompt.property}>{prompt.property}</option>{/each}
              </select></label>
              <label>Measured value<input class="mt-1 block w-full rounded border p-2" type="number" min="0.01" step="any" bind:value={measuredValue} required /></label>
              <label>Measurement unit<select class="mt-1 block w-full rounded border p-2" bind:value={measurementUnit}><option value="cm">cm</option><option value="m">m</option><option value="in">in</option><option value="ft">ft</option></select></label>
              <label>Measurement source<select class="mt-1 block w-full rounded border p-2" bind:value={measurementSource}><option value="manually measured">Manually measured</option><option value="approximate">Approximate</option><option value="scan-derived">Scan-derived</option></select></label>
              {#if capture.evidence.length}<label>Source evidence (optional)<select class="mt-1 block w-full rounded border p-2" bind:value={measurementEvidenceId}><option value="">No linked file</option>{#each capture.evidence as item}<option value={item.id}>{item.name}</option>{/each}</select></label>{/if}
              <button class="self-end rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={saving}>Save measurement</button>
            </form>
          {/if}
          <ul class="mt-5 space-y-2" aria-label="Feature legend">
            {#each capture.features as feature (feature.id)}
              <li><strong>{feature.label}</strong> · {feature.kind}
                <button class="ml-2 text-blue-700 underline" onclick={() => {
                  editingFeatureId = feature.id; editedLabel = feature.label; editedDescription = feature.description ?? '';
                }}>Edit feature</button>
                {#each feature.relations as relation}<span class="ml-2">{relation.kind} {capture.features.find(item => item.id === relation.featureId)?.label}</span>{/each}
                {#each capture.measurements.filter(item => item.featureId === feature.id) as measurement (measurement.id)}
                  <span class="ml-2">{measurement.property}: {measurement.enteredValue} {measurement.unit} · {measurement.source} · {measurement.recordedAt.toLocaleDateString()} · {measurementStatus(capture, measurement, existingProject, zone.existingVariantId)}</span>
                  {#if measurement.evidenceIds.length}<span class="ml-2">Evidence: {measurement.evidenceIds.map(id => capture!.evidence.find(item => item.id === id)?.name ?? 'unavailable file').join(', ')}</span>{/if}
                  {#if measurement.verified}<span class="ml-2">Saved geometry at verification: {measurement.verified.valueCm.toFixed(2)} cm{Math.abs(measurement.verified.valueCm - measurement.valueCm) > 0.01 ? ' · differs from observation' : ' · matches observation'}</span>{/if}
                  {#if geometryValue(capture, measurement, existingProject, zone.existingVariantId) !== null}
                    <button class="ml-2 text-blue-700 underline disabled:opacity-50" disabled={saving} onclick={() => verifyMeasurement(measurement.id)}>Verify against Existing</button>
                  {/if}
                {/each}
                {#if feature.kind === 'stair' && nominalRiser(feature.id) && !capture.measurements.some(item => item.featureId === feature.id && item.property === 'stair.riserHeight' && item.dependencies.includes(nominalRiser(feature.id)!.riseId))}
                  <button class="ml-2 text-blue-700 underline disabled:opacity-50" disabled={saving} onclick={() => calculateRiser(feature.id)}>Calculate nominal riser height</button>
                {/if}
              </li>
            {/each}
          </ul>
          {#if editingFeatureId}
            <form class="mt-3 grid gap-3 sm:grid-cols-3" onsubmit={event => { event.preventDefault(); void saveFeatureEdit(); }}>
              <label>Edit label<input class="mt-1 block w-full rounded border p-2" bind:value={editedLabel} maxlength="180" required /></label>
              <label>Description<input class="mt-1 block w-full rounded border p-2" bind:value={editedDescription} /></label>
              <div class="self-end flex gap-3"><button class="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={saving}>Save label</button><button type="button" class="text-blue-700 underline" onclick={() => editingFeatureId = ''}>Cancel</button></div>
            </form>
            <form class="mt-3 grid gap-3 sm:grid-cols-3" onsubmit={event => { event.preventDefault(); void saveRelation(); }}>
              <label>Relationship<select class="mt-1 block w-full rounded border p-2" bind:value={relationKind}><option value="replaces">Replaces</option><option value="splitFrom">Split from</option><option value="mergedFrom">Merged from</option></select></label>
              <label>Related feature<select class="mt-1 block w-full rounded border p-2" bind:value={relatedFeatureId} required><option value="">Choose feature</option>{#each capture.features.filter(item => item.id !== editingFeatureId) as feature}<option value={feature.id}>{feature.label}</option>{/each}</select></label>
              <button class="self-end rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={saving}>Save relationship</button>
            </form>
          {/if}
          {#if prompts.length}<p class="mt-3 text-sm text-slate-600">Coverage: {prompts.filter(item => item.met).length} of {prompts.length} suggested dimensions recorded. You decide when coverage is sufficient.</p>{/if}
          <button class="mt-3 text-sm font-semibold text-blue-700 underline disabled:opacity-50" disabled={saving} onclick={() => setSufficient(!capture!.sufficientAt)}>{capture.sufficientAt ? 'Reopen coverage' : 'Mark sufficient for now'}</button>
          {#if capture.sufficientAt}<p class="mt-1 text-sm text-slate-600">Sufficient for now; remaining gaps stay visible.</p>{/if}
          {#if zone.variants.some(item => item.kind === 'option')}
            <div class="mt-5 border-t pt-4">
              <h3 class="font-semibold">Review older option matches</h3>
              <p class="text-sm text-slate-600">Choose the same feature in a saved option. Unmatched features stay unbound until you review them.</p>
              <label class="mt-2 block text-sm">Option<select class="mt-1 block w-full rounded border p-2" value={reviewVariantId} onchange={event => void chooseReviewVariant(event.currentTarget.value)}>
                <option value="">Choose option</option>{#each zone.variants.filter(item => item.kind === 'option' && status[item.projectId] === 'ready') as option}<option value={option.id}>{option.name}</option>{/each}
              </select></label>
              {#if reviewProject}
                <form class="mt-3 grid gap-3 sm:grid-cols-3" onsubmit={event => { event.preventDefault(); void saveReviewedBinding(); }}>
                  <label>Unmatched feature<select class="mt-1 block w-full rounded border p-2" bind:value={reviewFeatureId} required>
                    <option value="">Choose feature</option>{#each capture.features.filter(item => !item.bindings.some(binding => binding.variantId === reviewVariantId)) as feature}<option value={feature.id}>{feature.label} · {feature.kind}</option>{/each}
                  </select></label>
                  <label>Matching option element<select class="mt-1 block w-full rounded border p-2" bind:value={reviewElementKey} required>
                    <option value="">Choose element</option>{#each reviewElements as element}<option value={element.key}>{element.name}</option>{/each}
                  </select></label>
                  <button class="self-end rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={saving}>Save reviewed match</button>
                </form>
              {/if}
            </div>
          {/if}
        </section>
      {/if}
      {#if comparison}
        <section class="mt-4 rounded-xl border bg-white p-5" aria-label="Compare and export">
          <h2 class="text-lg font-semibold">Compare saved designs</h2>
          <p class="mt-1 text-sm text-slate-600">Compare feature identities and dimensions below. Use the plan links above to inspect 2D, elevation and 3D views. Option dimensions are design values, not physically verified measurements. Calculated observations do not imply a saved geometry value.</p>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full border-collapse text-left text-sm">
              <caption class="mb-2 text-left font-semibold">Feature matches</caption>
              <thead><tr><th class="border p-2">Feature</th><th class="border p-2">Relationship</th>{#each comparison.variants as variant}<th class="border p-2">{variant.name}</th>{/each}</tr></thead>
              <tbody>{#each comparison.features as feature}<tr><th class="border p-2 font-medium">{feature.label} · {feature.kind}</th><td class="border p-2">{feature.relations || '—'}</td>{#each feature.states as state}<td class="border p-2">{state}</td>{/each}</tr>{/each}</tbody>
            </table>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full border-collapse text-left text-sm">
              <caption class="mb-2 text-left font-semibold">Dimensions and sources</caption>
              <thead><tr><th class="border p-2">Feature and property</th><th class="border p-2">Observation</th><th class="border p-2">Source and status</th>{#each comparison.variants as variant}<th class="border p-2">{variant.name} saved cm</th>{/each}</tr></thead>
              <tbody>{#each comparison.dimensions as dimension}<tr><th class="border p-2 font-medium">{dimension.feature} · {dimension.property}</th><td class="border p-2">{dimension.observed} {dimension.unit}</td><td class="border p-2">{dimension.source} · {dimension.recordedAt} · {dimension.status}{#if dimension.evidence}<br />{dimension.evidence}{/if}</td>{#each dimension.values as value}<td class="border p-2">{value === null ? '—' : value.toFixed(2)}</td>{/each}</tr>{/each}</tbody>
            </table>
          </div>
          <button class="mt-4 font-semibold text-blue-700 underline disabled:opacity-50" disabled={saving || !comparison.dimensions.length} onclick={() => { void downloadComparison(); }}>Download dimension comparison CSV</button>
          <p class="mt-1 text-xs text-slate-600">CSV contains saved dimensions and provenance, not original evidence files or complete plans. Use HOMEFORGE backup for those.</p>
        </section>
      {/if}
      <section class="mt-4 rounded-xl border bg-white p-5" aria-label="Renovation workflow">
        <h2 class="text-lg font-semibold">Your workflow</h2>
        <ol class="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-700">
          <li><a class="font-semibold text-blue-700 underline" href={`${base}/capture?workspace=${encodeURIComponent(workspace.id)}&renovation=${encodeURIComponent(zone.id)}`}>Capture Existing Conditions</a> with photos, plans, sketches or compatible RoomPlan JSON.</li>
          <li>Model and correct Existing Conditions using the editor.</li>
          <li>Create independent options. Open each one to inspect its 2D, elevation and 3D views.</li>
          <li>Export a HOMEFORGE backup before changing browser storage.</li>
        </ol>
      </section>
      <button class="mt-5 text-sm font-semibold text-blue-700 underline" onclick={backup}>Download HOMEFORGE backup</button>
      <p class="mt-1 text-xs text-slate-600">Editor JSON and project-package exports omit zone capture evidence.</p>
    {/if}
    {#if error}<p role="alert" class="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{error} <button class="underline" onclick={backup}>Download HOMEFORGE backup</button></p>{/if}
  </div>
</main>
