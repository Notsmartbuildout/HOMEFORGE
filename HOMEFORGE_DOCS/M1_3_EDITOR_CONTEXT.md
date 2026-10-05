# M1.3 — Editor context

Adds validated HOMEFORGE workspace, renovation and variant identity around the inherited editor. Standalone projects retain their existing toolbar and loading behavior. Imports/recovery copies clear the old HOMEFORGE identity when they replace the current project.

`resolveHomeforgeEditorContext(workspaceId, renovationId)` returns workspace/renovation IDs and names plus the validated Existing variant, using the same metadata/project read transaction as M1.2 exact opening. `resolveExistingProjectId` remains compatible. No schema or database upgrade is required.

Return to renovations saves pending edits first and checks that newer edits remain saved. Save failure retains the current editor, its geometry and visible error; retry returns to the original workspace after saving. Mobile tool drawer offsets account for the context strip. Editor editing mechanics are unchanged.

Regression coverage: validated identity without metadata changes; desktop/mobile identity and return; failed save/retry; background refresh layout stability. A failing WebKit mobile opening case exposed a loading-message layout shift during focus refresh. A deterministic test reproduced a 36px movement; background refresh now retains card positions.

Verification: **1,228 unit tests in 129 files**, type checking with **zero errors/warnings**, production build and **33 targeted browser cases across Chromium/Firefox/WebKit** pass. Mobile save-error recovery also verifies the tool drawer starts beneath the unchanged header; the error banner lives outside header layout. Evidence: `EVIDENCE/M1_3_CHECK.log`, `M1_3_UNIT.log`, `M1_3_BUILD.log`, `M1_3_BROWSER.log` and `M1_3_EDITOR.png`.

The continuing user objective authorizes committing and pushing each completed milestone to the HOMEFORGE fork. M1.2 checkpoint: `39ca141`; remaining scope and execution order: `M2_IMPLEMENTATION_PLAN.md`. M2 baseline correction/enforcement and options remain pending at this checkpoint.
