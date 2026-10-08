# Front entry and stair pilot

Updated: 2026-10-08. This is a non-sensitive sample workflow. The example dimensions are test data, not measurements of Jesse's home.

## Sample run

The browser case `sample front entry and stair workflow compares two options and restores capture` starts with a local plan containing one door and one 100 cm wide, 14-riser stair. It labels the door D1 and stair S1, records door width, stair width and total rise, verifies a saved dimension, captures context and focus images, creates two independent options, changes only Option A's stair width to 110 cm, compares saved dimensions, opens 2D/3D/elevation views, exports a dimension CSV and restores a HOMEFORGE backup. It checks that the original image bytes are in the backup and that the normal workflow makes no external HTTP request. The option and Existing values remain separate. Chromium, Firefox and WebKit passed this case on October 8.

A focused 390 px browser case passed in Chromium, Firefox and WebKit. It confirms that the inherited Layers menu opens a stair's numeric width control, Existing remains protected, and an option width edit saves independently. No duplicate numeric control was needed for M3 Task 3.

## Start mapping your stairs

1. From `C:\DEVELOPMENT\HOMEFORGE`, run `npm run dev -- --host 127.0.0.1` and open `http://localhost:5173`. Keep the same address and browser profile; local plans live in that browser's storage.
2. Create a home workspace and a Renovation Zone for the front entry and stairs. Open its Existing Conditions plan. Draw or adjust the door, walls and stairs with the editor's existing controls.
3. Use **Capture Existing Conditions** for overview/context photos, opening and stair details, a sketch or plan, and manually measured dimensions. Label key features such as D1 and S1 on the zone page. A perspective photo is visual context; use an actual measurement for metric values.
4. Record each dimension with its unit and source. Use **Verify against Existing** to compare the observation with saved geometry. A current status means the saved geometry has not changed since verification; it does not certify construction safety.
5. Correct Existing only through explicit correction mode. Create Option A and Option B from a saved plan. Edit each option independently and inspect their 2D, elevation and 3D views.
6. Return to the zone page to compare feature matches and dimensions. Download the CSV for values and provenance, and a **HOMEFORGE backup** for the complete local plans and original capture files. Test restoring the backup as copies before relying on it as your only copy.

## Local-service boundary

Analytics now loads only when `PUBLIC_ENABLE_ANALYTICS=true`. Assistant sharing and handoff uploads require explicit server enable flags and a bucket; the local setup keeps them off. The inherited editor still contains explicit, user-triggered Firebase capture-code import, AI-provider settings/rendering and an assistant-sharing menu. They are not part of the HOMEFORGE mapping workflow. The sample run observed no external HTTP requests; it does not prove that every inherited editor feature works offline.

## Limits

The CSV is a dimension/provenance comparison. It omits original evidence bytes and complete plan geometry; use HOMEFORGE backup for those. Option dimensions are design values, not field verification. No structural calculation, building-code check, native scan, cloud deployment or physical-house pilot is claimed. The software sample gate prepares the workflow for the first real mapping session; it does not substitute made-up house measurements for the owner's observations.
