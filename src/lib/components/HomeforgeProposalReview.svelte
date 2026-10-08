<script lang="ts">
  import { modalDialog } from '$lib/utils/modalDialog';
  import type { HomeforgeProposal } from '$lib/models/homeforgeProposal';
  let { proposal, evidenceNames, busy, error, onAccept, onCancel }: {
    proposal: HomeforgeProposal; evidenceNames: string[]; busy: boolean; error: string;
    onAccept: () => void; onCancel: () => void;
  } = $props();
</script>

<dialog use:modalDialog aria-label={proposal.targetKind === 'existing' ? 'Review Existing correction proposal' : 'Review option edit proposal'} oncancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
  class="m-auto w-[28rem] max-w-[calc(100vw-2rem)] rounded-xl bg-white p-5 text-slate-800 shadow-xl backdrop:bg-black/50">
  <h2 class="text-lg font-semibold">Review {proposal.targetKind === 'existing' ? 'Existing correction' : 'option edit'}</h2>
  <p class="mt-2 text-sm">{proposal.featureLabel} · {proposal.property}</p>
  <dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
    <dt>Saved geometry</dt><dd>{proposal.beforeCm.toFixed(2)} cm</dd>
    <dt>Proposed geometry</dt><dd>{proposal.afterCm.toFixed(2)} cm</dd>
    <dt>Observation source</dt><dd>{proposal.source}</dd>
    <dt>Evidence</dt><dd>{evidenceNames.length ? evidenceNames.join(', ') : 'No linked file'}</dd>
  </dl>
  {#if proposal.commandText}<p class="mt-2 text-sm">Command: {proposal.commandText}</p>{/if}
  <p class="mt-4 text-sm text-amber-800">Accepting changes the {proposal.targetKind === 'existing' ? 'protected Existing plan' : 'selected option'}. The edit is saved through the editor and can be undone.</p>
  {#if error}<p role="alert" class="mt-3 text-sm text-red-700">{error}</p>{/if}
  <div class="mt-5 flex justify-end gap-3">
    <button class="rounded border px-3 py-2 disabled:opacity-50" disabled={busy} onclick={onCancel}>Cancel</button>
    <button class="rounded bg-blue-700 px-3 py-2 font-semibold text-white disabled:opacity-50" disabled={busy} onclick={onAccept}>Accept and save {proposal.targetKind === 'existing' ? 'correction' : 'edit'}</button>
  </div>
</dialog>
