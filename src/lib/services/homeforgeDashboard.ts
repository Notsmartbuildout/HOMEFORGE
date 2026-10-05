import type { HomeWorkspace } from '$lib/models/homeforge';
import { readHomeWorkspace } from '$lib/utils/homeforgeValidation';
import { readProject } from '$lib/utils/projectValidation';
import { parseBackup } from '$lib/utils/parseBackup';
import { records, request, transaction, withDatabase } from './localDatabase';

function workspaceRecord(raw: string, id: string): HomeWorkspace {
  const workspace = readHomeWorkspace(parseBackup(raw));
  if (workspace.id !== id) throw new Error('Workspace ID does not match its storage key.');
  return workspace;
}

/** Read-only projection: damaged entries never hide healthy workspaces. */
export function readHomeforgeDashboard() {
  return withDatabase(db => transaction(db, ['projects', 'homeforgeWorkspaces'], 'readonly', async tx => {
    const workspaces: HomeWorkspace[] = [], errors: { id: string; message: string }[] = [];
    const projectStatus: Record<string, 'ready' | 'missing' | 'unreadable'> = Object.create(null);
    for (const [id, raw] of Object.entries(await records(tx, 'homeforgeWorkspaces'))) {
      try { workspaces.push(workspaceRecord(raw, id)); }
      catch { errors.push({ id, message: 'Unreadable workspace metadata. Download a HOMEFORGE backup for recovery.' }); }
    }
    for (const workspace of workspaces) for (const renovation of workspace.renovationProjects) for (const variant of renovation.variants) {
      if (Object.hasOwn(projectStatus, variant.projectId)) continue;
      const raw = await request(tx.objectStore('projects').get(variant.projectId));
      if (raw === undefined) projectStatus[variant.projectId] = 'missing';
      else {
        try {
          const project = readProject(JSON.parse(raw));
          if (project.id !== variant.projectId) throw new Error();
          projectStatus[variant.projectId] = 'ready';
        } catch { projectStatus[variant.projectId] = 'unreadable'; }
      }
    }
    return { workspaces, errors, projectStatus };
  }));
}

/** Resolve a saved Existing Conditions reference without changing editor state. */
export async function resolveHomeforgeEditorContext(workspaceId: string, renovationId: string) {
  try {
    return await withDatabase(db => transaction(db, ['homeforgeWorkspaces', 'projects'], 'readonly', async tx => {
      const raw = await request(tx.objectStore('homeforgeWorkspaces').get(workspaceId));
      const workspace = workspaceRecord(raw, workspaceId);
      const renovation = workspace.renovationProjects.find(r => r.id === renovationId);
      const variant = renovation?.variants.find(v => v.id === renovation.existingVariantId && v.kind === 'existing');
      if (!renovation || !variant) throw new Error();
      const project = readProject(JSON.parse(await request(tx.objectStore('projects').get(variant.projectId))));
      if (project.id !== variant.projectId) throw new Error();
      return { workspaceId: workspace.id, workspaceName: workspace.name, renovationId: renovation.id, renovationName: renovation.name, variant };
    }));
  } catch {
    throw new Error('Existing Conditions could not be opened. Its workspace metadata or saved plan is missing or unreadable. Return to HOMEFORGE and download a backup for recovery.');
  }
}

export async function resolveExistingProjectId(workspaceId: string, renovationId: string): Promise<string> {
  return (await resolveHomeforgeEditorContext(workspaceId, renovationId)).variant.projectId;
}
