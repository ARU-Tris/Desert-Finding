# Desert Finding — Art Integration Guide (V2)

All supplied pixel PNGs are original CC0-1.0 assets and remain unchanged. `build_assets.py` can regenerate them with Pillow; runtime uses PNGs directly. The original preview PNGs are reference composites, not screenshots of the live game. Preserved unused imagery has no objective or victory role.

## Coordinates and sheets

The framebuffer is 480×270. World coordinates are **meters**, East +X, South +Y, North -Y. Multiply positions by **32.4 px/m** only for camera/rendering. Player anchor is always (240,135). Heading is clockwise from North. Canvas smoothing is disabled; desktop scaling uses nearest-neighbor integer multiples and centered letterboxing.

| Asset | Dimensions | Cell / meaning |
| --- | --- | --- |
| player_day.png / player_night.png | 384×512 | 64×64, 6 frames × 8 direction rows |
| sand_tiles.png | 256×256 | 64×64, 16 variants |
| sand_details.png | 128×96 | 32×32, 12 transparent details |
| footprints.png | 32×16 | 16×16, alternating left/right |
| compass_base / needle / glass | 128×128 each | Compose original brass instrument |
| player_shadow.png | 64×64 | Dynamic projected silhouette |
| oasis.png | 160×160 | Preserved original unused asset |

Directions are N, NE, E, SE, S, SW, W, NW. Quantize **actualHeading**, not the intended click course, to choose the nearest row. Walking frame is floor(distanceMeters×32.4/8) mod 6; idle frame is 0. Preserve exact continuous heading for movement and instrument readings.

## Accurate instruments

Enlarged compass needle rotation is **-actualHeading** relative to its fixed player-facing housing. N/E/S/W traveler orientations must produce up/left/down/right red tips. No goal bearing or false readings. The numeric bearing is actualHeading rounded to degrees and padded to three digits, modulo 360.

For the small compass, rotate the N-facing dial offset (+19,+8) by the rendered eight-way pose to keep it on the atlas hand. Draw an independent red 1×3px needle upward from that dial center; camera is fixed North-up. The lamp center similarly uses (-20,+9), rotated by the rendered pose. Pose quantization avoids detached needles/lights while the continuous compass reading stays physically correct.

## Light and environment

Use the browser local clock, 06:00 sunrise / noon 12:00 / sunset 18:00 with one-hour twilight blending. Sun source vector (cos(πt),sin(πt)), t=clamp((hour-6)/12); shadow extends oppositely, length falls with sin(πt) elevation. Night uses the lantern atlas, a cool dark overlay with a warm radial transparent light mask at the actual left hand, and subtle smooth flicker. Composite the readable HUD after scene lighting.

Hash integer world tile coordinates and seed to draw original sand variations and details. Never use per-frame random terrain. Generate only visible tiles with a margin. Near the geographical perimeter, blend sage/ochre ground grading, deterministic pixel grass tufts and small stones into the existing sand. Vegetation builds over about 2km and recognizable scrubland appears in the final 120m. This transition is environmental context, not a marker. Use muted green interface accents while preserving original sand/brass colors. No horizon, palm side views, face, isometric perspective, minimap or unrelated props.

Footprints use world-meter anchors and fade over 55 active seconds, bounded to 320. Saved seed/position and footprint snapshots reproduce the same scene after loading. The area and world shape are numerical geometry; never build a global bitmap/cache.
