import { createDesert, PIXELS_PER_METER } from "./world.js";
export const SAVE_VERSION = 1;
export const SAVE_KEY = "desert-finding:journey";
const finite = (value, min = -Infinity, max = Infinity) =>
  Number.isFinite(value) && value >= min && value <= max;
export function snapshot(game) {
  return {
    version: SAVE_VERSION,
    seed: game.seed,
    player: { ...game.player },
    drift: { ...game.drift },
    age: game.age,
    accumulator: game.accumulator,
    escaped: game.escaped,
    nextStep: game.nextStep,
    step: game.step,
    footprints: game.footprints.map((f) => ({ ...f })),
  };
}
export function validSave(data) {
  const p = data?.player,
    d = data?.drift;
  return (
    data?.version === SAVE_VERSION &&
    Number.isInteger(data.seed) &&
    finite(data.seed, 0, 0xffffffff) &&
    p &&
    finite(p.x) &&
    finite(p.y) &&
    finite(p.intendedHeading, 0, Math.PI * 2) &&
    finite(p.actualHeading, 0, Math.PI * 2) &&
    finite(p.distance, 0) &&
    typeof p.walking === "boolean" &&
    d &&
    finite(d.elapsed, 0) &&
    finite(d.sinceCorrection, 0) &&
    finite(d.offset) &&
    finite(d.rate, -0.001, 0.001) &&
    finite(data.age, 0) &&
    finite(data.accumulator, 0, 0.1) &&
    typeof data.escaped === "boolean" &&
    finite(
      data.nextStep,
      p.distance,
      p.distance + 8 / PIXELS_PER_METER + 0.0001,
    ) &&
    data.nextStep > p.distance &&
    Number.isSafeInteger(data.step) &&
    data.step >= 0 &&
    Array.isArray(data.footprints) &&
    data.footprints.length <= 320 &&
    data.footprints.every(
      (f) =>
        finite(f.x) &&
        finite(f.y) &&
        finite(f.heading, 0, Math.PI * 2) &&
        (f.side === 0 || f.side === 1) &&
        finite(f.born, 0, data.age),
    )
  );
}
export function restore(game, data) {
  if (!validSave(data)) throw new Error("Invalid or unsupported journey save.");
  game.seed = data.seed;
  game.desert = createDesert(data.seed);
  game.player = { ...data.player, walking: false };
  game.drift = { ...data.drift };
  game.age = data.age;
  game.accumulator = data.accumulator;
  game.escaped = data.escaped;
  game.nextStep = data.nextStep;
  game.step = data.step;
  game.footprints = data.footprints.map((f) => ({ ...f }));
  game.mode = data.escaped ? "ending" : "title";
}
export class JourneyStore {
  constructor(storage, key = SAVE_KEY) {
    this.storage = storage;
    this.key = key;
    this.error = "";
  }
  read() {
    if (!this.storage) {
      this.error =
        "Saving is unavailable. Keep this tab open to preserve your journey.";
      return null;
    }
    let hadSave = false;
    try {
      for (const key of [this.key, `${this.key}:backup`]) {
        const value = this.storage.getItem(key);
        if (!value) continue;
        hadSave = true;
        try {
          const data = JSON.parse(value);
          if (validSave(data)) {
            if (key !== this.key)
              this.error = "Recovered the previous automatic save.";
            return data;
          }
        } catch {
          /* Try backup without deleting the damaged record. */
        }
      }
      if (hadSave)
        this.error =
          "This saved journey could not be read. It has been kept until you start a new journey.";
    } catch {
      this.error =
        "Saving is unavailable. Keep this tab open to preserve your journey.";
    }
    return null;
  }
  write(game) {
    try {
      if (!this.storage) throw new Error("No storage");
      const previous = this.storage.getItem(this.key);
      if (previous) {
        try {
          if (validSave(JSON.parse(previous)))
            this.storage.setItem(`${this.key}:backup`, previous);
        } catch {
          /* Keep a valid backup. */
        }
      }
      this.storage.setItem(this.key, JSON.stringify(snapshot(game)));
      this.error = "";
      return true;
    } catch {
      this.error =
        "Your journey could not be saved. Keep this tab open; browser storage may be full or blocked.";
      return false;
    }
  }
}
