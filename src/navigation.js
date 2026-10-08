import { clamp, TAU } from "./math.js";
import { terrainHash } from "./world.js";
export const newDrift = () => ({
  elapsed: 0,
  sinceCorrection: 0,
  offset: 0,
  rate: 0,
});
export const normalizeHeading = (radians) => ((radians % TAU) + TAU) % TAU;
function noise(time, period, seed, channel) {
  const k = Math.floor(time / period),
    t = time / period - k,
    smooth = t * t * (3 - 2 * t);
  const a = (terrainHash(k, channel, seed) / 0xffffffff) * 2 - 1;
  const b = (terrainHash(k + 1, channel, seed) / 0xffffffff) * 2 - 1;
  return a + (b - a) * smooth;
}
export function advanceDrift(
  state,
  dt,
  seed,
  { daylight = 1, elevation = 1, landmarks = 0 } = {},
) {
  state.elapsed += dt;
  state.sinceCorrection += dt;
  const references = clamp(
    daylight * (0.55 + 0.45 * elevation) + landmarks * 0.85,
  );
  const repetition = 1 - 0.8 * landmarks;
  // Correlated angular velocity, never independent arbitrary frame turns.
  const correlated =
    0.55 * noise(state.elapsed, 7200, seed, 43) +
    0.45 * noise(state.elapsed, 43200, seed, 97);
  const targetRate =
    correlated *
    0.00024 *
    (1 - 0.96 * references) *
    repetition *
    clamp(state.sinceCorrection / 600);
  state.rate += (targetRate - state.rate) * (1 - Math.exp(-dt / 120));
  state.offset =
    (state.offset + state.rate * dt) * Math.exp((-references * dt) / 1200);
  return state.offset;
}
