# Desert Finding — Asset package and current game

The original supplied package has been integrated into a real static browser game at the repository root. `assets/` contains unchanged original CC0 pixel art; `docs/` contains the revised V2 specification. The current implementation overrides the original destination-based V1 premise.

Read `CODEX_PROMPT.md`, followed by `docs/GAME_DESIGN_KO.md`, `docs/ART_GUIDE.md`, `docs/TEST_MATRIX.md` and `assets/manifest.json`. `README.md` explains controls, scale, saving, debug-only QA, local execution and Pages publishing.

The traveler wanders without an assigned destination. The only ending is physically crossing the perimeter of a numerically calibrated 9.2 million km² desert at exactly 5 km/h. Navigation drift is human directional error; the compass remains truthful. Progress persists through versioned localStorage and advances only during active play. Time-of-day lighting uses the browser's local wall clock.

Start an HTTP server at this root (`python -m http.server 8000` or `npm run serve`) and open the site. Node unit tests and Playwright Chromium tests verify gameplay. The original preview images remain reference art, not runtime screenshots; unused images remain assets without becoming objectives. Python art scripts are development tools only. Pages deploys through the included tested GitHub Actions workflow once enabled for the repository.
