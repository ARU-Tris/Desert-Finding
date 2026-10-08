# Desert Finding — Current implementation contract (V2)

This document supersedes the original V1 quest design. Implement and maintain the complete playable static game in `ARU-Tris/Desert-Finding`. Read `docs/GAME_DESIGN_KO.md`, `docs/ART_GUIDE.md`, `docs/TEST_MATRIX.md` and `assets/manifest.json`. Preserve useful code and every original PNG. Inspect Git state before changes and never reset user work.

## Premise

A person wanders in an enormous desert. There is no assigned destination, quest, target bearing, objective marker, map or navigation shortcut. Start near the center. The only ending occurs when the physical walker crosses any portion of the natural geographical perimeter. Introduce rocks, dry grass and sparse vegetation approaching the edge, then recognizable scrubland. Unlimited stamina; no enemies, hunger or unrelated systems.

## Physical world

Use 9,200,000 km² (9.2e12 m²) enclosed area, calibrated by numerical integration within ±2%. A finite, smooth irregular shape is elongated east–west with center-to-edge distances on the order of 1,000–2,500 km. All directions must reach an edge. World coordinates are physical meters. Speed is exactly 5000 / 3600 m/s. Render at 32.4 logical pixels/meter, preserving 45 logical px/s. Never shorten escape time or create nearby exits. Generate only visible deterministic sand tiles and decorations. Negative coordinates and reloaded seeds must repeat exactly.

## Navigation and persistence

Keep separate intendedHeading (last clicked bearing) and actualHeading (physical orientation). Smooth seeded correlated angular drift gradually bends uncorrected courses over extended periods, potentially into loops. Darkness/repetition strengthen it; sunlight, shadows and identifiable vegetation reduce it. A new click immediately corrects accumulated error. The compass remains accurate relative to actualHeading and never points toward a destination. This is inspired by Souman et al., Current Biology (2009), DOI 10.1016/j.cub.2009.07.053, not evidence of compass failure or a quantitatively fitted scientific model.

Use validated, versioned localStorage autosaves with guarded error handling and a prior valid backup. Save exact physical position, seed, both headings, drift state, distance walked and progress. Restore at the saved location, initially at rest. Only active gameplay advances movement; real local time still determines lighting. Pause hidden tabs, reset frame delta on return and never add offline travel. Include a clearly confirmed Reset Journey option.

## Visual/input contracts

Vanilla HTML/CSS/ES-module JavaScript and Canvas 2D, no engine, backend or runtime dependencies. Strictly vertical North-up top-down view. 480×270 internal framebuffer, nearest-neighbor responsive 16:9 letterboxing; traveler always anchored (240,135). One click/tap sets persistent continuous movement; next click turns, a 6px central dead zone is ignored. Space stops/resumes, H opens field notes, Escape pauses. UI clicks must not steer. Use accessible HTML menus and instructions, and muted green UI accents.

Use the original 6×8 day/night player atlases (64px cells, N/NE/E/SE/S/SW/W/NW rows) with distance-driven gait and alternating fading world footprints. Maintain exact movement heading separately from eight-way visual pose. Right-hand compass gets a tiny independent world-North red needle; enlarge original base/needle/glass art at bottom-right. HUD needle rotation is -actualHeading: North/East/South/West orientations give up/left/down/right red tips.

Browser local wall time runs at real speed. Stylized sunrise 06:00, noon 12:00, sunset 18:00, twilight 05:30–06:30 and 17:30–18:30. Sun East→South→West, shadows opposite and shortest at noon. Night atlas/left-hand lantern from 18:00 to 06:00. A subtle animated warm radial mask follows the lamp; night is cool/dark but readable, HUD above lighting. Pose-quantized attachments remain on the visible hands.

## QA and release

Provide explicit query-gated debug methods for distant edges and long walks; expose none in normal play and isolate QA saves. `?debugTime=HH:MM` is a lighting preview only. Test speed, independently integrated area, all directions' reachable boundaries, world stability, smooth drift/correction, trustworthy compass, exact saves, real edge endings, absence of any former quest, day/night and subpath deployment. Execute Node unit and real Chromium tests and visually inspect captured screenshots. Fix failures before committing.

Use `.github/workflows/pages.yml` with official configure-pages/upload-pages-artifact/deploy-pages actions, contents read/pages write/id-token write, github-pages environment, main push and manual dispatch. Deploy the static root entry with relative URLs to https://aru-tris.github.io/Desert-Finding/. Commit completed work and push when authorized; otherwise report exact Git/permission blockers. Never claim unverified push/deployment. Document actual distance/time calculations, results, commit and deployment status.
