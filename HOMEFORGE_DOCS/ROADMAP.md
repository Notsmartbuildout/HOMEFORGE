# Milestones

- M0: setup and known-error remediation completed in C:\DEVELOPMENT\HOMEFORGE with the real jessenlawson-cell/HOMEFORGE fork, origin/upstream remotes, GitHub Desktop and a reproducible foundation. Full audit is clean; catalog, type checking, 1,186 unit tests and production build pass. Known browser failures pass focused checks in all three engines. The broad rerun was stopped at Jesse's request after 393 Chromium and 325 Firefox passes with no observed failures; earlier six benchmark passes remain preserved. See FOUNDATION_READY.md and HANDOFF.md for exact scope.
- M1: homeowner project dashboard, keeping editor core stable.
- M1.1: domain foundation committed and pushed: versioned workspace/renovation/variant metadata, stable upstream project references, additive IndexedDB version 2 migration, atomic Existing Conditions creation and validation. See M1_1_DOMAIN_FOUNDATION.md.
- M1.2: committed/pushed as `39ca141`: coordinated HOMEFORGE backup/restore, reference-safe deletion and minimal homeowner dashboard with exact Existing Conditions opening and recovery states. See M1_2_COMPLETE.md.
- M1.3: editor identity and save-before-return navigation implemented and verified: 1,228 unit tests, 33 targeted browser cases, type checking and production build pass. See M1_3_EDITOR_CONTEXT.md.
- M2: Existing / Option A / Option B with independent state, durable assets and persistence tests.
- M2.1: exactly one Existing baseline per validated renovation; options do not change its pointer. 75 focused tests, 1,230 unit tests and type checking pass. See M2_1_EXISTING_CONDITIONS.md.
- M2.2: atomic complete option duplication service including inline assets, thumbnail and remapped valid history. 93 focused tests, 1,236 unit tests and type checking pass. Editor integration follows in M2.3. See M2_2_CLONE_TO_OPTION.md.
- M2.3: option creation/selection in editor context, safe save → exact load → context reset, persisted active pointers and reload/dashboard continuation. 1,239 unit tests, 45 targeted browser cases, type checking and production build pass. See M2_3_VARIANT_SWITCHER.md.
- M2.4: protected Existing Conditions with explicit session correction, shared mutation/write guards and preserved view/export operations. 1,245 unit tests, 48 targeted browser cases, type checking and production build pass. See M2_4_BASELINE_PROTECTION.md.
- M2.5: safe option removal and exact-byte metadata recovery; final resilience audit complete. 1,260 unit tests, 60 targeted browser cases, type checking and production build pass. See M2_5_RESILIENCE.md.
- M3: direct manipulation and concise numeric property editing.
- M3.1: zone overview and editor return path implemented on `foundation-remediation`. The existing wall, opening and stair numeric controls and canvas manipulation were inspected and reused; no duplicate editor was added. Type check, 1,260 unit tests, production build and 18 relevant browser cases across Chromium/Firefox/WebKit pass. Guided capture, persistent legend identity and comparison remain planned. See M3_M6_DESIGN.md and M3_M6_IMPLEMENTATION_PLAN.md.
- M4: import/calibration and dimension-level provenance, with invalidation rules.
- M5: measured front-entry and stair workflow, useful elevation output, export review and recovery tests.

Next: plan the homeowner UI slice from the completed M1.1–M2.5 foundation; use CHATGPT_PLANNING_HANDOFF.md and MILESTONE_AUDIT.md. Known foundation failures have been resolved. An initial external-service inventory remains in WINDOWS_BASELINE.md; include deliberate offline/external-service review before a homeowner release. Retain M0 evidence and use relevant regression gates for future changes.

After practical validation: optional estimates, AI commands over structured state, shared spaces and an optional native capture companion.
