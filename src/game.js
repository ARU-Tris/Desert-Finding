import { headingFromPointer, movementVector, rotate, clamp } from "./math.js";
import {
  createDesert,
  WORLD_SEED,
  WALKING_SPEED,
  PIXELS_PER_METER,
} from "./world.js";
import { newDrift, advanceDrift, normalizeHeading } from "./navigation.js";
const STEP = 1 / 60;
const FOOTSTEP_METERS = 8 / PIXELS_PER_METER;
export class Game {
  constructor(seed = WORLD_SEED) {
    this.reset(seed);
    this.mode = "title";
  }
  reset(seed = this.seed ?? WORLD_SEED) {
    this.seed = seed;
    this.desert = createDesert(seed);
    this.player = {
      x: 0,
      y: 0,
      intendedHeading: 0,
      actualHeading: 0,
      walking: false,
      distance: 0,
    };
    this.drift = newDrift();
    this.escaped = false;
    this.age = 0;
    this.accumulator = 0;
    this.footprints = [];
    this.nextStep = FOOTSTEP_METERS;
    this.step = 0;
    this.mode = "playing";
  }
  steer(x, y) {
    if (this.mode !== "playing" || Math.hypot(x - 240, y - 135) < 6) return;
    const heading = headingFromPointer(x - 240, y - 135);
    this.player.intendedHeading = this.player.actualHeading = heading;
    this.drift.offset = this.drift.rate = this.drift.sinceCorrection = 0;
    this.player.walking = true;
  }
  toggleWalking() {
    if (this.mode === "playing") this.player.walking = !this.player.walking;
  }
  pause() {
    if (this.mode === "playing") this.mode = "paused";
  }
  resume() {
    if (this.mode === "paused") this.mode = "playing";
    else if (this.mode === "title") this.mode = this.escaped ? "ending" : "playing";
  }
  wander() {
    this.mode = "playing";
    this.player.walking = false;
  }
  update(seconds, sun) {
    if (this.mode !== "playing") return;
    this.accumulator += clamp(Number.isFinite(seconds) ? seconds : 0, 0, 0.1);
    while (this.accumulator + 1e-12 >= STEP && this.mode === "playing") {
      this.accumulator = Math.max(0, this.accumulator - STEP);
      this.tick(STEP, sun);
    }
  }
  // Only bounded fixed-step update is used in normal play. The gated QA
  // module advances larger intervals to inspect weeks of navigation.
  tick(dt, sun = { daylight: 1, elevation: 1 }, emitFootprints = true) {
    if (this.mode !== "playing") return;
    this.age += dt;
    const p = this.player;
    if (p.walking) {
      const oldOffset = this.drift.offset;
      const landmarks = this.desert.vegetation(p.x, p.y);
      const offset = advanceDrift(this.drift, dt, this.seed, {
        ...sun,
        landmarks,
      });
      const half = (offset - oldOffset) / 2;
      const arcFactor = Math.abs(half) < 1e-8 ? 1 : Math.sin(half) / half;
      const v = movementVector(
        p.intendedHeading + (oldOffset + offset) / 2,
        WALKING_SPEED * dt * arcFactor,
      );
      p.x += v.x;
      p.y += v.y;
      p.distance += WALKING_SPEED * dt;
      p.actualHeading = normalizeHeading(p.intendedHeading + offset);
      if (emitFootprints)
        while (p.distance >= this.nextStep) {
          const side = this.step++ % 2;
          const offset = rotate(side ? 7 : -7, 12, p.actualHeading);
          this.footprints.push({
            x: p.x + offset.x / PIXELS_PER_METER,
            y: p.y + offset.y / PIXELS_PER_METER,
            heading: p.actualHeading,
            side,
            born: this.age,
          });
          this.nextStep += FOOTSTEP_METERS;
        }
      else {
        this.nextStep = p.distance + FOOTSTEP_METERS;
        this.footprints = [];
      }
      if (!this.escaped && !this.desert.contains(p.x, p.y)) {
        this.escaped = true;
        this.mode = "ending";
        p.walking = false;
      }
    }
    this.footprints = this.footprints
      .filter((f) => this.age - f.born < 55)
      .slice(-320);
  }
}
