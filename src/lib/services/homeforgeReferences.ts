import { readHomeWorkspace } from '$lib/utils/homeforgeValidation';
import { parseBackup } from '$lib/utils/parseBackup';
import { HOMEFORGE_STORE, records } from './localDatabase';

/** Caller must include metadata and projects in the same deletion transaction. */
export async function assertProjectUnreferenced(tx: IDBTransaction, projectId: string): Promise<void> {
  for (const [id, raw] of Object.entries(await records(tx, HOMEFORGE_STORE))) {
    let workspace;
    try {
      workspace = readHomeWorkspace(parseBackup(raw));
      if (workspace.id !== id) throw new Error('Mismatched metadata ID');
    } catch {
      throw new Error('HOMEFORGE metadata cannot be read. Download a HOMEFORGE backup and recover the metadata before deleting projects.');
    }
    if (workspace.renovationProjects.some(r => r.variants.some(v => v.projectId === projectId)))
      throw new Error('This project is referenced by HOMEFORGE. Remove its workspace metadata before deleting the project; geometry is retained when metadata is removed.');
  }
}
