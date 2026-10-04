# Milestones

- M0: setup and known-error remediation completed in C:\DEVELOPMENT\HOMEFORGE with the real jessenlawson-cell/HOMEFORGE fork, origin/upstream remotes, GitHub Desktop and a reproducible foundation. Full audit is clean; catalog, type checking, 1,186 unit tests and production build pass. Known browser failures pass focused checks in all three engines. The broad rerun was stopped at Jesse's request after 393 Chromium and 325 Firefox passes with no observed failures; earlier six benchmark passes remain preserved. See FOUNDATION_READY.md and HANDOFF.md for exact scope.
- M1: homeowner project dashboard, keeping editor core stable.
- M1.1: domain foundation implemented locally: versioned workspace/renovation/variant metadata, stable upstream project references, additive IndexedDB version 2 migration, atomic Existing Conditions creation and validation. 25 new tests; 1,211 total unit tests and type checking pass. See M1_1_DOMAIN_FOUNDATION.md. Dashboard UI remains pending.
- M2: Existing / Option A / Option B with independent state, durable assets and persistence tests.
- M3: direct manipulation and concise numeric property editing.
- M4: import/calibration and dimension-level provenance, with invalidation rules.
- M5: measured front-entry and stair workflow, useful elevation output, export review and recovery tests.

Next: plan M1.2 dashboard integration and M2 variants using M1_1_DOMAIN_FOUNDATION.md alongside the original CHATGPT_PLANNING_HANDOFF.md. Resolve HOMEFORGE backup/restore, referenced-project deletion and baseline enforcement boundaries before dashboard rollout. Known foundation failures have been resolved. An initial external-service inventory remains in WINDOWS_BASELINE.md; include deliberate offline/external-service review before a homeowner release. Retain M0 evidence and use relevant regression gates for future changes. Further feature implementation requires a separately authorized task.

After practical validation: optional estimates, AI commands over structured state, shared spaces and an optional native capture companion.
