import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  headingFromPointer,
  movementVector,
  compassNeedleRotation,
  directionRow,
  pointerToCanvas,
  rotate,
  bearing,
} from "../src/math.js";
import {
  terrainHash,
  createDesert,
  TARGET_AREA_M2,
  WALKING_SPEED,
  PIXELS_PER_METER,
  WORLD_SEED,
} from "../src/world.js";
import { localHour, parseDebugTime, sunState } from "../src/time.js";
import { Game } from "../src/game.js";
import { ASSET_NAMES } from "../src/assets.js";
import { advanceDrift, newDrift, normalizeHeading } from "../src/navigation.js";
import {
  snapshot,
  restore,
  validSave,
  JourneyStore,
  SAVE_KEY,
} from "../src/save.js";

const close = (a, b, epsilon = 1e-9) =>
  assert.ok(Math.abs(a - b) < epsilon, `${a} ≠ ${b}`);
for (const [degrees, dx, dy] of [
  [0, 0, -1],
  [90, 1, 0],
  [180, 0, 1],
  [270, -1, 0],
  [35, Math.sin((35 * Math.PI) / 180), -Math.cos((35 * Math.PI) / 180)],
]) {
  test(`click heading and movement at ${degrees}°`, () => {
    const theta = headingFromPointer(dx, dy);
    close(theta, (degrees * Math.PI) / 180);
    const velocity = movementVector(theta, 45);
    close(velocity.x, dx * 45);
    close(velocity.y, dy * 45);
    close(Math.hypot(velocity.x, velocity.y), 45);
  });
}
test("compass seeks North in the player frame at all cardinal headings", () => {
  for (const [degrees, x, y] of [
    [0, 0, -1],
    [90, -1, 0],
    [180, 0, 1],
    [270, 1, 0],
  ]) {
    const heading = (degrees * Math.PI) / 180;
    close(compassNeedleRotation(heading), -heading);
    const tip = rotate(0, -1, compassNeedleRotation(heading));
    close(tip.x, x);
    close(tip.y, y);
  }
});
test("direction quantization wraps North and bearing wraps 360 to 000", () => {
  for (let row = 0; row < 8; row++)
    assert.equal(directionRow((row * Math.PI) / 4), row);
  assert.equal(directionRow((359 * Math.PI) / 180), 0);
  assert.equal(bearing((359.9 * Math.PI) / 180), "000");
  assert.equal(bearing((35 * Math.PI) / 180), "035");
});
test("scaled canvas coordinates include letterbox offset and arbitrary scale", () => {
  for (const scale of [0.7, 1, 2, 3.25]) {
    const rect = {
      left: 120,
      top: 67,
      width: 480 * scale,
      height: 270 * scale,
    };
    assert.deepEqual(
      pointerToCanvas(120 + 240 * scale, 67 + 135 * scale, rect),
      { x: 240, y: 135 },
    );
    const p = pointerToCanvas(120 + 400 * scale, 67 + 50 * scale, rect);
    close(p.x, 400);
    close(p.y, 50);
  }
});
test("terrain is stable, coordinate-sensitive and covers all variants at negative coordinates", () => {
  const variants = new Set();
  for (let y = -20; y <= 20; y++)
    for (let x = -20; x <= 20; x++) {
      assert.equal(terrainHash(x, y), terrainHash(x, y));
      assert.ok(terrainHash(x, y) >= 0);
      variants.add(terrainHash(x, y) % 16);
    }
  assert.equal(variants.size, 16);
  assert.notEqual(terrainHash(-7, 3), terrainHash(7, 3));
  assert.notEqual(terrainHash(-7, 3), terrainHash(-7, 3, 17));
});
test("solar source moves East, South, West; shadows shorten at noon", () => {
  const dawn = sunState(6),
    noon = sunState(12),
    dusk = sunState(18);
  close(dawn.x, 1);
  close(dawn.y, 0);
  close(noon.x, 0);
  close(noon.y, 1);
  close(noon.elevation, 1);
  close(dusk.x, -1);
  close(dusk.y, 0);
  assert.ok(noon.shadowLength < dawn.shadowLength);
  assert.ok(noon.shadowLength < dusk.shadowLength);
});
for (const [hour, night] of [
  [5.75, true],
  [6 + 10 / 60, false],
  [12, false],
  [17 + 50 / 60, false],
  [18.25, true],
  [23.5, true],
]) {
  test(`lighting at local hour ${hour}`, () => {
    const s = sunState(hour);
    assert.equal(s.night, night);
    assert.ok(s.daylight >= 0 && s.daylight <= 1);
    if (hour === 12) assert.equal(s.daylight, 1);
    if (hour === 23.5) assert.equal(s.daylight, 0);
  });
}
test("twilight is continuous across sunrise and sunset", () => {
  for (const boundary of [5.5, 6, 6.5, 17.5, 18, 18.5])
    assert.ok(
      Math.abs(
        sunState(boundary - 0.0001).daylight -
          sunState(boundary + 0.0001).daylight,
      ) < 0.001,
    );
});
test("local wall clock and strict debug time parsing", () => {
  close(localHour(new Date(2026, 9, 8, 17, 50, 30)), 17 + 50 / 60 + 30 / 3600);
  assert.equal(parseDebugTime("23:30"), 23.5);
  for (const invalid of [null, "", "24:00", "12:60", "6:00", "abc"])
    assert.equal(parseDebugTime(invalid), null);
});
test("starting, steering, deadzone, continuous travel and delta cap", () => {
  const g = new Game();
  g.steer(340, 135);
  assert.equal(g.player.walking, false);
  g.reset();
  g.steer(243, 137);
  assert.equal(g.player.walking, false);
  g.steer(340, 135);
  for (let i = 0; i < 10; i++) g.update(0.1);
  close(g.player.x, WALKING_SPEED, 1e-8);
  close(g.player.y, 0, 1e-8);
  g.update(100);
  close(g.player.distance, WALKING_SPEED * 1.1);
  g.toggleWalking();
  g.update(0.1);
  close(g.player.distance, WALKING_SPEED * 1.1);
  g.toggleWalking();
  g.pause();
  g.update(0.1);
  close(g.player.distance, WALKING_SPEED * 1.1);
  g.resume();
  g.update(0.1);
  close(g.player.distance, WALKING_SPEED * 1.2);
});
test("exact 5 km/h physical walking and original 45 logical px/sec", () => {
  close(WALKING_SPEED, 5000 / 3600);
  close(WALKING_SPEED * PIXELS_PER_METER, 45);
  const g = new Game();
  g.reset();
  g.steer(350, 135);
  for (let i = 0; i < 3600; i++) g.tick(1, sunState(12), false);
  close(g.player.distance, 5000, 1e-7);
  close(g.age, 3600);
  g.pause();
  g.update(100000, sunState(12));
  close(g.player.distance, 5000, 1e-7);
  close(Math.sqrt(TARGET_AREA_M2 / Math.PI) / 1000, 1711.2717, 0.01);
  close(Math.sqrt(TARGET_AREA_M2 / Math.PI) / 5000 / 24, 14.2606, 0.001);
});
test("independent numerical polygon integration encloses 9.2 million km²", () => {
  for (const seed of [WORLD_SEED, 1, 42, 0xffffffff]) {
    const world = createDesert(seed),
      samples = 32768,
      angle = (2 * Math.PI) / samples;
    let twiceArea = 0,
      previous = movementVector(0, world.radiusAt(0));
    for (let i = 1; i <= samples; i++) {
      const current = movementVector(i * angle, world.radiusAt(i * angle));
      twiceArea += previous.x * current.y - current.x * previous.y;
      previous = current;
    }
    const area = Math.abs(twiceArea) / 2;
    assert.ok(Math.abs(area - TARGET_AREA_M2) / TARGET_AREA_M2 < 0.00001);
  }
});
test("every perimeter bearing is reachable at true geographical scale", () => {
  const world = createDesert();
  let minimum = Infinity,
    maximum = 0;
  for (let degree = 0; degree < 360; degree++) {
    const heading = (degree * Math.PI) / 180,
      r = world.radiusAt(heading);
    minimum = Math.min(minimum, r);
    maximum = Math.max(maximum, r);
    for (const fraction of [0, 0.1, 0.5, 0.99]) {
      const p = movementVector(heading, r * fraction);
      assert.ok(world.contains(p.x, p.y));
    }
    const beyond = movementVector(heading, r + 1);
    assert.equal(world.contains(beyond.x, beyond.y), false);
    const inside = movementVector(heading, r - 1);
    assert.ok(world.contains(inside.x, inside.y));
    assert.ok(r / WALKING_SPEED / 3600 > 200);
  }
  assert.ok(minimum > 1_000_000 && maximum < 2_600_000);
  assert.ok(world.radiusAt(Math.PI / 2) > world.radiusAt(0) * 1.5);
  assert.ok(world.radiusAt((3 * Math.PI) / 2) > world.radiusAt(Math.PI) * 1.5);
});
test("walking across any tested natural edge ends the journey; standing inside does not", () => {
  for (let degree = 0; degree < 360; degree += 15) {
    const g = new Game();
    g.reset();
    const h = (degree * Math.PI) / 180;
    const p = movementVector(h, g.desert.radiusAt(h) - 0.5);
    Object.assign(g.player, p);
    g.update(0.1, sunState(12));
    assert.equal(g.mode, "playing");
    g.steer(240 + Math.sin(h) * 100, 135 - Math.cos(h) * 100);
    for (let i = 0; i < 10; i++) g.update(0.1, sunState(12));
    assert.equal(g.mode, "ending");
    assert.equal(g.escaped, true);
    assert.equal(g.player.walking, false);
    assert.equal(g.desert.contains(g.player.x, g.player.y), false);
    g.wander();
    g.update(0.1);
    assert.equal(g.mode, "playing");
    g.pause();
    g.resume();
    assert.equal(g.mode, "playing");
  }
});
test("edge biome develops over kilometers and has stable seed/position", () => {
  const world = createDesert();
  assert.equal(world.vegetation(0, 0), 0);
  const at = (distance) => movementVector(0, world.radiusAt(0) - distance);
  for (const [distance, amount] of [
    [2500, 0],
    [1500, 0.25],
    [1000, 0.5],
    [100, 0.95],
    [-1, 1],
  ]) {
    const p = at(distance);
    close(world.vegetation(p.x, p.y), amount, 1e-8);
  }
  assert.equal(createDesert(17).radiusAt(1), createDesert(17).radiusAt(1));
  assert.notEqual(createDesert(17).radiusAt(1), createDesert(18).radiusAt(1));
});
test("footprints alternate, stay in world coordinates, fade and bound memory", () => {
  const g = new Game();
  g.reset();
  g.steer(340, 135);
  for (let i = 0; i < 20; i++) g.update(0.1);
  assert.ok(g.footprints.length > 8);
  const first = { ...g.footprints[0] };
  for (let i = 1; i < g.footprints.length; i++)
    assert.notEqual(g.footprints[i - 1].side, g.footprints[i].side);
  g.update(0.1);
  assert.deepEqual(g.footprints[0], first);
  for (let i = 0; i < 2000; i++) g.update(0.1);
  assert.ok(g.footprints.length <= 320);
  assert.ok(g.footprints.every((f) => g.age - f.born < 55));
  g.toggleWalking();
  for (let i = 0; i < 560; i++) g.update(0.1);
  assert.equal(g.footprints.length, 0);
});
test("original PNG dimensions and every atlas crop match manifest", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../assets/manifest.json", import.meta.url)),
  );
  const dimensions = (name) => {
    const png = readFileSync(new URL(`../assets/${name}`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };
  for (const name of ASSET_NAMES) dimensions(`${name}.png`);
  for (const [name, sheet] of Object.entries(manifest.sheets)) {
    const [w, h] = dimensions(name);
    assert.equal(w, sheet.columns * sheet.frameWidth);
    assert.equal(h, sheet.rows * sheet.frameHeight);
    for (let row = 0; row < sheet.rows; row++)
      for (let frame = 0; frame < sheet.columns; frame++) {
        assert.ok((frame + 1) * sheet.frameWidth <= w);
        assert.ok((row + 1) * sheet.frameHeight <= h);
      }
    if (name.startsWith("player"))
      assert.deepEqual(sheet.directions, [
        "N",
        "NE",
        "E",
        "SE",
        "S",
        "SW",
        "W",
        "NW",
      ]);
  }
  for (const [name, size] of Object.entries(manifest.static))
    assert.deepEqual(dimensions(name), size);
});

test("navigation drift is gradual, correlated, deterministic and stronger without cues", () => {
  const night = newDrift(),
    day = newDrift(),
    landmark = newDrift(),
    repeat = newDrift();
  let maximumStep = 0,
    previous = 0;
  for (let i = 0; i < 6 * 3600; i++) {
    advanceDrift(night, 1, WORLD_SEED, {
      daylight: 0,
      elevation: 0,
      landmarks: 0,
    });
    advanceDrift(repeat, 1, WORLD_SEED, {
      daylight: 0,
      elevation: 0,
      landmarks: 0,
    });
    advanceDrift(day, 1, WORLD_SEED, {
      daylight: 1,
      elevation: 1,
      landmarks: 0,
    });
    advanceDrift(landmark, 1, WORLD_SEED, {
      daylight: 0,
      elevation: 0,
      landmarks: 1,
    });
    maximumStep = Math.max(maximumStep, Math.abs(night.offset - previous));
    previous = night.offset;
    assert.ok(Math.abs(night.rate) <= 0.00024);
  }
  assert.deepEqual(night, repeat);
  assert.ok(maximumStep < 0.000241);
  assert.ok(Math.abs(night.offset) > 0.2);
  assert.ok(Math.abs(night.offset) > Math.abs(day.offset) * 10);
  assert.ok(Math.abs(night.offset) > Math.abs(landmark.offset) * 10);
});
test("prolonged cue-free walking can accumulate full rotations; a click resets the error", () => {
  const g = new Game();
  g.reset();
  g.steer(350, 135);
  let maxOffset = 0;
  for (let i = 0; i < 72 * 360; i++) {
    g.tick(10, sunState(23.5), false);
    maxOffset = Math.max(maxOffset, Math.abs(g.drift.offset));
  }
  assert.ok(maxOffset > 2 * Math.PI, `maximum offset ${maxOffset}`);
  close(
    g.player.actualHeading,
    normalizeHeading(g.player.intendedHeading + g.drift.offset),
  );
  assert.notEqual(g.player.actualHeading, g.player.intendedHeading);
  g.steer(240, 24);
  assert.equal(g.drift.offset, 0);
  assert.equal(g.drift.rate, 0);
  assert.equal(g.drift.sinceCorrection, 0);
  assert.equal(g.player.actualHeading, 0);
  assert.equal(g.player.intendedHeading, 0);
});
test("versioned save roundtrip retains exact position, terrain, drift and continued simulation", () => {
  const a = new Game(17);
  a.reset();
  a.steer(350, 135);
  for (let i = 0; i < 800; i++) a.tick(10, sunState(23.5), false);
  a.player.walking = false;
  const data = JSON.parse(JSON.stringify(snapshot(a))),
    b = new Game();
  assert.ok(validSave(data));
  restore(b, data);
  assert.deepEqual(snapshot(b), data);
  assert.equal(b.mode, "title");
  assert.equal(a.desert.radiusAt(1), b.desert.radiusAt(1));
  a.mode = b.mode = "playing";
  a.player.walking = b.player.walking = true;
  for (let i = 0; i < 50; i++) {
    a.update(0.07, sunState(23.5));
    b.update(0.07, sunState(23.5));
  }
  assert.deepEqual(snapshot(a), snapshot(b));
});
test("restored journey does not walk until intentional input, even after long offline interval", () => {
  const a = new Game();
  a.reset();
  a.steer(350, 135);
  a.update(0.1);
  const saved = snapshot(a),
    b = new Game();
  restore(b, saved);
  assert.equal(b.player.walking, false);
  b.update(1e9);
  assert.equal(b.player.x, saved.player.x);
  b.resume();
  b.update(1e9);
  assert.equal(b.player.x, saved.player.x);
});
test("storage keeps backup, recovers corrupt records and handles disabled/quota storage", () => {
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => values.set(k, v),
    };
  const store = new JourneyStore(storage),
    g = new Game();
  g.reset();
  assert.equal(store.read(), null);
  assert.equal(store.write(g), true);
  const previous = store.read();
  g.steer(350, 135);
  g.update(0.1);
  store.write(g);
  values.set(SAVE_KEY, "broken JSON");
  assert.deepEqual(store.read(), previous);
  assert.match(store.error, /Recovered/);
  assert.equal(new JourneyStore(null).write(g), false);
  const blocked = new JourneyStore({
    getItem: () => null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  });
  assert.equal(blocked.write(g), false);
  assert.match(blocked.error, /could not be saved/);
  for (const mutate of [
    (d) => (d.version = 999),
    (d) => (d.player.x = NaN),
    (d) => (d.drift.rate = 99),
    (d) => (d.nextStep = 0),
  ]) {
    const bad = snapshot(g);
    mutate(bad);
    assert.equal(!!validSave(bad), false);
    assert.throws(() => restore(new Game(), bad));
  }
});
test("runtime has no former quest, destination or nearby exit", () => {
  const runtime = ["main.js", "game.js", "world.js", "renderer.js"]
    .map((name) =>
      readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8"),
    )
    .join("\n");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.doesNotMatch(
    runtime + html,
    /OASIS|reachedOasis|YOU FOUND WATER|035°|well lies/i,
  );
  const g = new Game();
  g.reset();
  g.steer(350, 135);
  for (let i = 0; i < 360; i++) g.tick(10, sunState(12), false);
  assert.equal(g.mode, "playing");
  assert.equal(g.escaped, false);
});
