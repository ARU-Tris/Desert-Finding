# Desert Finding — V2 Acceptance Test Matrix

Run `npm test`, `npm run test:browser` and optionally `python verify_assets.py`. Chromium runs against a real local HTTP server. Explicit QA saves are isolated from normal saves. Runtime code has no destination-based quest.

| Area | Test | Expected |
| --- | --- | --- |
| Start | Begin Journey | At origin, initially stationary, no assigned route/clue |
| Continue | Reload / Continue Journey | Exact saved coordinates, seed, drift and progress; at rest |
| Movement | Cardinal/diagonal click or tap | Persistent exact course, 5 km/h physical pace |
| Scale | Simulate 3600 active seconds | Exactly 5000 meters walked, visually 45 px/sec |
| Geography | Independent 32768-vertex polygon area | Within ±2% of 9.2 million km²; tested tighter |
| Boundary | Test 360 radial directions | All interior rays remain inside; each crosses a distant edge |
| Ending | Physically walk through edge in QA fixture | Subtle Beyond the Sand ending, position genuinely outside |
| Environment | Compare interior / near-edge / outside | Sand → dry grass/rocks → recognizable green scrubland |
| Drift | Multi-hour seeded repeat | Same gradual curved course, no discontinuous turns |
| Cues | Night vs daylight/vegetation | Night/repetition stronger, sunlight/landmarks reduce error |
| Correction | New click after long drift | Intended and actual course align immediately, error cleared |
| Compass | Cardinal / drifted actual headings | Trustworthy North needle and true actual numeric bearing |
| Terrain | Negative/large coordinates, seed, revisit | Stable original atlas placement, bounded local rendering |
| Footprints | Walk/rest over 55 seconds | Alternating world marks fade, <=320 retained |
| UI | Click instruments, notes, menus | No steering; reset confirmation preserves until confirmed |
| Keys | Space / H / Escape | Stop/resume, field notes, pause/continue |
| Saving | Save/reload exact navigation state | Same coordinates and deterministic continued trajectory |
| Storage | Corrupt/future/full/blocked storage | Backup recovery or clear notice; no crash or silent loss |
| Active time | Hide/return tab, idle title | No offline travel and no resumed delta jump |
| Day | 06:10, 12:00, 17:50 previews | East/South/West sun, shadows opposite, noon shortest |
| Night | 05:45, 18:15, 23:30 previews | Night atlas, left-hand warm radial lamp, readable blue scene |
| Clock | Normal URL, minute elapsed | Actual local wall clock, no accelerated ordinary time |
| Display | Square/wide/phone, touch | 16:9 letterbox, correct coordinate transform, readable menus |
| Assets | Manifest/dimensions/all cells | Every original atlas/static PNG valid and unchanged |
| Paths | Root /Desert-Finding/ | All scripts/art load; no errors; offline after load works |
| QA gates | Normal URL vs debug=1 | No normal shortcut; separate debug storage |
| Deploy | GitHub Actions | Tests precede official Pages publication of static site |

Unit tests validate pure geometry, physical speed, navigation, time, compass, save validation and state transitions. Browser tests use real pointer/touch/keyboard input; only explicitly opted-in far-edge fixtures accelerate setup. Actual edge crossing remains simulated at real 5 km/h. Screenshots cover lighting, mobiles and perimeter ending. No test should assert a static entire canvas while resting because old footprints intentionally continue fading.
