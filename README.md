# Desert Finding

A compass. An enormous sea of sand. A quiet person walking through it.

**Play:** https://aru-tris.github.io/Desert-Finding/ (after a successful Pages deployment).

## Wander

There is no assigned destination, target bearing, quest, marker or map. You begin near the center of a Sahara-sized desert. Choose your own course. The only ending happens when your actual position crosses the natural geographical perimeter. Dry grasses and rocks gradually appear near the edge, and sand gives way to scrubland. You can leave through any part of the perimeter.

| Control | Action |
| --- | --- |
| Click / tap the sand | Select a direction and walk continuously |
| Click / tap again | Turn and immediately correct navigation drift |
| Space | Stop / resume travel |
| H / NOTES | Read / put away field notes |
| Escape / Ⅱ | Pause / continue |
| Reset Journey in the pause/start menu | Confirm a fresh start at the center |

The trustworthy red needle always seeks North relative to your actual orientation. The bearing readout is your **actual walking heading**, not your original intended course. The small right-hand compass also points world-North. Check your bearing and reselect a direction to correct gradual human navigation error. A compass cannot tell you your current geographical position or which boundary is nearest.

## Scale and time

The enclosed area is numerically calibrated to **9,200,000 km²**. A smooth irregular radial boundary stretches roughly east–west. World coordinates, walking distance and boundary geometry are in **meters**. Walking speed is **5000 / 3600 m/s**, exactly 5 km/h. At **32.4 logical pixels per meter**, the original visual pace remains 45 pixels/second. The 480×270 view shows only about 14.8×8.3 meters; rendering visits nearby tiles only, with no whole-world cache.

For the default seed 90210, cardinal distances from the origin are about 1,245 km North, 2,132 km East, 1,303 km South and 2,446 km West. Straight walking at 5 km/h would take about 249, 426, 261 and 489 **active gameplay hours** respectively. An equal-area circle would have a 1,711 km radius and require about 342 hours / 14.26 days. Drift can make actual routes longer. These are physical distances, not artificially shortened game distances. The shape is inspired by the scale of the Sahara, not an actual geographic map of its border.

Lighting uses your browser's actual **local wall clock**, at real speed. Sunrise is stylized at 06:00, noon at 12:00 and sunset at 18:00. Twilight blends 05:30–06:30 and 17:30–18:30. The sun travels East → South → West; shadows extend oppositely and shorten at noon. Between 18:00 and 06:00 the left-hand lantern reveals nearby sand. Progress advances only while actively playing. Hidden tabs pause; returning never grants offline movement or a large position jump.

## Drift and saving

`intendedHeading` is the last clicked course; `actualHeading` is the physical walking orientation. Seeded smooth angular velocity slowly accumulates error over minutes and hours. Repetitive terrain and darkness increase it; sunlight, shadows and recognizable edge vegetation reduce it. Long uncorrected walks can form loops. A new click clears accumulated error immediately. The compass reads the actual orientation accurately throughout.

The mechanic is scientifically inspired, **not a fitted human navigation model**. Its rates, correlation periods and cue weights are game design choices. Souman et al. observed veering and circles when external directional references were unavailable; their study does not imply that a properly used compass fails. [Walking Straight into Circles, Current Biology (2009), DOI 10.1016/j.cub.2009.07.053](https://pubmed.ncbi.nlm.nih.gov/19699093/).

Versioned `localStorage` saves position, seed, intended/actual headings, drift state, walked distance, active elapsed time, escape progress and recent footprints. Autosave occurs every five active seconds and on steering, stopping, pausing, tab hiding and page exit. A backup retains the previous valid snapshot. Continue Journey restores your exact saved location and starts at rest; daylight continues to follow the current local clock. Corrupt/future-version saves are kept, a valid backup is tried, and storage errors are shown clearly. **Saves belong to this browser and site origin.** Clearing site data removes them; blocked/full storage prevents persistence while gameplay still works.

## Run and verify

No build, backend, game engine or external runtime service is needed. From the repository:

```sh
python -m http.server 8000
```

Open http://localhost:8000 using an HTTP server rather than a `file:` URL, because JavaScript modules need HTTP. Alternatively `npm run serve` uses the included Node server and supports `/Desert-Finding/` for subpath checks. Gameplay needs no network after its assets load.

Node 24 and development-only Playwright are used for testing:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
python verify_assets.py
```

Tests cover physical speed, independently integrated desert area, all perimeter bearings, determinism, gradual drift and correction, truthful compass pixels, exact save/restore, background pausing, edge escape, failed assets/storage, lighting states, touch, mobile layout and project subpaths. Chromium screenshots and failure traces are generated under `test-results/`.

## Debug-only QA

`?debugTime=HH:MM` previews lighting without changing travel speed. Only explicit valid values override local time. For far-boundary and long-walk tests, load `?debug=1&debugTime=12:00`, begin a journey, then use browser developer tools:

```js
__desertDebug.state()                         // physical coordinates and saved state
__desertDebug.boundary(90)                    // center-to-east edge, meters
__desertDebug.teleportToBoundary(90, 3)        // 3 meters inside; at rest
// Click East, then physically walk those last meters to test escape.
__desertDebug.advanceHours(48, 23.5)          // 48 simulated active hours at fixed night
```

Debug advancement uses larger integration steps for fast QA; ordinary play always uses bounded 60 Hz steps at the true pace. The methods are absent without `debug=1` and have no normal UI. Both explicit debug sessions and valid lighting previews use a separate save namespace so QA cannot replace a real journey.

## GitHub Pages

Choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. Push to `main` or dispatch **Test and deploy Desert Finding**. Pull requests run checks without deploying. The workflow runs unit and Chromium tests, packages only `index.html`, `style.css`, `src/`, `assets/` and `.nojekyll`, then uses the official configure/upload/deploy Pages actions. [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The project path is https://aru-tris.github.io/Desert-Finding/. For a 404, check the Pages source, latest deployment job, exact project name and trailing slash. Relative art/module URLs work under the project prefix.

## Source and original art

- `src/game.js`: physical simulation, fixed steps, footprints, escape state.
- `src/world.js`: meter scale, area calibration, deterministic terrain and boundary.
- `src/navigation.js`: correlated angular drift and visual reference effects.
- `src/save.js`: versioned validation, exact restoration, guarded storage and backup.
- `src/renderer.js`: vertical Canvas 2D view, atlases, edge biome, shadows, lamp and compass.
- `src/main.js`: input, accessible green HTML menus, visibility, clock and autosaves.
- `src/debug.js`: opt-in QA tools, never loaded in ordinary play.
- `docs/`: current design, art guide and acceptance matrix.

All supplied original pixel PNGs remain unchanged under **CC0-1.0**. Unused legacy art is preserved without assigning it a gameplay role. `build_assets.py` regenerates the supplied assets with Pillow; Python is not needed to play. The reference PNGs are art previews, not evidence of gameplay. UI accents use muted field green, preserving the sand/brass palette and strict vertical view. The eight-direction atlas follows the closest visual pose while movement and compass physics retain the continuous actual heading. Hand instruments attach to that pose. Desktop art uses integer nearest-neighbor scaling, with centered 16:9 letterboxing and compact readable controls on smaller screens.
