import { get, writable } from 'svelte/store';

export const baselineProtection = writable<{ projectId: string | null; correcting: boolean }>({ projectId: null, correcting: false });
export const protectionError = writable<string | null>(null);
export const BASELINE_MESSAGE = 'Existing Conditions is protected. Begin correction mode to intentionally edit this baseline.';

export function baselineReadOnly(projectId?: string) {
  const mode = get(baselineProtection);
  return mode.projectId !== null && (projectId === undefined || mode.projectId === projectId) && !mode.correcting;
}

export function allowBaselineMutation(projectId?: string) {
  if (!baselineReadOnly(projectId)) return true;
  protectionError.set(BASELINE_MESSAGE);
  return false;
}

export function beginBaselineCorrection(projectId: string) {
  if (get(baselineProtection).projectId !== projectId) throw new Error('This baseline is no longer open. Reload before correcting it.');
  protectionError.set(null);
  baselineProtection.set({ projectId, correcting: true });
}

export function endBaselineCorrection() {
  baselineProtection.update(mode => ({ ...mode, correcting: false }));
  protectionError.set(null);
}
