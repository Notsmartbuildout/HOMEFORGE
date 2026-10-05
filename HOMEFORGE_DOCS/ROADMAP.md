# Milestones

- M0: setup and known-error remediation completed in C:\DEVELOPMENT\HOMEFORGE with the real jessenlawson-cell/HOMEFORGE fork, origin/upstream remotes, GitHub Desktop and a reproducible foundation. Full audit is clean; catalog, type checking, 1,186 unit tests and production build pass. Known browser failures pass focused checks in all three engines. The broad rerun was stopped at Jesse's request after 393 Chromium and 325 Firefox passes with no observed failures; earlier six benchmark passes remain preserved. See FOUNDATION_READY.md and HANDOFF.md for exact scope.
- M1: homeowner project dashboard, keeping editor core stable.
- M1.1: domain foundation committed and pushed: versioned workspace/renovation/variant metadata, stable upstream project references, additive IndexedDB version 2 migration, atomic Existing Conditions creation and validation. See M1_1_DOMAIN_FOUNDATION.md.
- M1.2: committed/pushed as `39ca141`: coordinated HOMEFORGE backup/restore, reference-safe deletion and minimal homeowner dashboard with exact Existing Conditions opening and recovery states. See M1_2_COMPLETE.md.
- M1.3: editor identity and save-before-return navigation implemented and verified: 1,228 unit tests, 33 targeted browser cases, type checking and production build pass. See M1_3_EDITOR_CONTEXT.md.
- M2: Existing / Option A / Option B with independent state, durable assets and persistence tests.
- M3: direct manipulation and concise numeric property editing.
- M4: import/calibration and dimension-level provenance, with invalidation rules.
- M5: measured front-entry and stair workflow, useful elevation output, export review and recovery tests.

Next: execute the authorized M2.1–M2.5 sequence in M2_IMPLEMENTATION_PLAN.md. Known foundation failures have been resolved. An initial external-service inventory remains in WINDOWS_BASELINE.md; include deliberate offline/external-service review before a homeowner release. Retain M0 evidence and use relevant regression gates for future changes.

After practical validation: optional estimates, AI commands over structured state, shared spaces and an optional native capture companion.
