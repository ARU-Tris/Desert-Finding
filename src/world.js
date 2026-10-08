import { TAU, clamp, headingFromPointer } from "./math.js";
export const WORLD_SEED = 90210;
export const TARGET_AREA_M2 = 9_200_000 * 1_000_000;
export const WALKING_SPEED = 5000 / 3600;
export const PIXELS_PER_METER = 32.4;
export function terrainHash(x, y, seed = 90210) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// Positive radial shape: every bearing has one reachable edge. The low
// harmonics are smooth, and 1/2 ∫ r² dθ calibrates the area in square meters.
export function createDesert(seed = WORLD_SEED) {
  const phases = [3, 5, 7].map(
    (n) => (terrainHash(n, 81, seed) / 0xffffffff) * TAU,
  );
  const rawRadius = (theta) => {
    const s = Math.sin(theta),
      c = Math.cos(theta);
    const ellipse =
      1 / Math.sqrt((s * s) / 2_300_000 ** 2 + (c * c) / 1_280_000 ** 2);
    return (
      ellipse *
      (1 +
        0.075 * Math.sin(3 * theta + phases[0]) +
        0.04 * Math.cos(5 * theta + phases[1]) +
        0.025 * Math.sin(7 * theta + phases[2]))
    );
  };
  const samples = 4096;
  let integral = 0;
  for (let i = 0; i < samples; i++)
    integral += rawRadius((i * TAU) / samples) ** 2;
  const rawArea = (integral * Math.PI) / samples;
  const scale = Math.sqrt(TARGET_AREA_M2 / rawArea);
  const radiusAt = (theta) => rawRadius(theta) * scale;
  const signedDistance = (x, y) =>
    radiusAt(headingFromPointer(x, y)) - Math.hypot(x, y);
  return Object.freeze({
    seed,
    radiusAt,
    signedDistance,
    contains: (x, y) => signedDistance(x, y) >= 0,
    vegetation: (x, y) => clamp(1 - signedDistance(x, y) / 2000),
    calibratedArea: rawArea * scale * scale,
  });
}
