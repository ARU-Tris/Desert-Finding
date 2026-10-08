import { test, expect } from "@playwright/test";
const urlFor = path => {
  if (!process.env.TEST_BASE_URL) return path;
  const relative = path.replace(/^\/Desert-Finding\//, "/").replace(/^\//, "");
  const base = process.env.TEST_BASE_URL.replace(/\/?$/, "/");
  return new URL(relative, base).href;
};
const errors = (page) => {
  const found = [];
  page.on("pageerror", (e) => found.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) found.push(`${r.status()} ${r.url()}`);
  });
  return found;
};
async function boot(page, path = "/?debugTime=12:00") {
  await page.clock.install({ time: new Date("2026-10-08T03:00:00Z") });
  await page.goto(urlFor(path));
  await expect(
    page.getByRole("button", { name: "Begin Journey", exact: true }),
  ).toBeEnabled();
  await page.clock.pauseAt(new Date("2026-10-08T03:00:02Z"));
  await page
    .getByRole("button", { name: "Begin Journey", exact: true })
    .click();
}
async function clickDirection(page, x, y) {
  const rect = await page.locator("#world").boundingBox();
  await page.mouse.click(
    rect.x + (x / 480) * rect.width,
    rect.y + (y / 270) * rect.height,
  );
  await page.clock.runFor(32);
}
async function pixels(page, canvas = "#world", region = null) {
  return page.locator(canvas).evaluate((c, r) => {
    const d = c
      .getContext("2d")
      .getImageData(
        r?.x ?? 0,
        r?.y ?? 0,
        r?.width ?? c.width,
        r?.height ?? c.height,
      ).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 4)
      h = (Math.imul(h, 31) + d[i] * 3 + d[i + 1] * 5 + d[i + 2]) | 0;
    return h;
  }, region);
}

test("continuous movement, turning, deadzone, UI isolation, rest and pause", async ({
  page,
}) => {
  const failures = errors(page);
  await boot(page);
  await expect(page.locator("#travel-state")).toHaveText("AT REST");
  const atRest = await pixels(page);
  await page.clock.runFor(1000);
  expect(await pixels(page)).toBe(atRest);
  await clickDirection(page, 240, 135);
  await expect(page.locator("#travel-state")).toHaveText("AT REST");
  for (const [x, y, b] of [
    [240, 24, "000"],
    [350, 135, "090"],
    [240, 240, "180"],
    [40, 135, "270"],
  ]) {
    await clickDirection(page, x, y);
    await expect(page.locator("#bearing")).toHaveText(`BEARING ${b}°`);
    const before = await pixels(page);
    await page.clock.runFor(800);
    expect(await pixels(page)).not.toBe(before);
  }
  await page.locator("#compass").click();
  await page.clock.runFor(32);
  await expect(page.locator("#bearing")).toHaveText("BEARING 270°");
  await page.getByRole("button", { name: "Field notes", exact: true }).click();
  await expect(page.locator("#notes")).toBeVisible();
  await page.getByRole("button", { name: "Put away field notes" }).click();
  await page.keyboard.press("Space");
  await page.clock.runFor(32);
  await expect(page.locator("#travel-state")).toHaveText("AT REST");
  // Footprints still fade while resting. Compare distant terrain to test that
  // the camera has stopped without rejecting that intended visual change.
  const corner = { x: 5, y: 80, width: 70, height: 70 };
  const stopped = await pixels(page, "#world", corner);
  await page.clock.runFor(1000);
  expect(await pixels(page, "#world", corner)).toBe(stopped);
  await page.keyboard.press("Space");
  await page.clock.runFor(200);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(32);
  const paused = await pixels(page);
  await page.clock.runFor(1000);
  expect(await pixels(page)).toBe(paused);
  await page.keyboard.press("Escape");
  await page.clock.runFor(200);
  expect(await pixels(page)).not.toBe(paused);
  expect(failures).toEqual([]);
});

test("physically crossing a distant natural edge, ending, wander and reset", async ({
  page,
}, testInfo) => {
  const failures = errors(page);
  await boot(page, "/?debug=1&debugTime=12:00");
  const radius = await page.evaluate(() => window.__desertDebug.boundary(90));
  expect(radius).toBeGreaterThan(2_000_000);
  await page.evaluate(() => window.__desertDebug.teleportToBoundary(90, 3));
  await page.clock.runFor(32);
  await page.screenshot({ path: testInfo.outputPath("boundary.png") });
  await clickDirection(page, 350, 135);
  await page.clock.runFor(4000);
  await expect(
    page.getByRole("button", { name: "Wander On", exact: true }),
  ).toBeVisible();
  const state = await page.evaluate(() => window.__desertDebug.state());
  expect(state.player.x).toBeGreaterThan(radius);
  expect(state.escaped).toBe(true);
  expect(state.player.distance).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: testInfo.outputPath("escape-ending.png") });
  await page.getByRole("button", { name: "Wander On", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.locator("#overlay")).toBeHidden();
  await expect(page.locator("#travel-state")).toHaveText("AT REST");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Reset Journey", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep Journey", exact: true }).click();
  expect(
    (await page.evaluate(() => window.__desertDebug.state())).player.x,
  ).toBeGreaterThan(radius);
  await page
    .getByRole("button", { name: "Reset Journey", exact: true })
    .click();
  await page.locator("#primary").click();
  await page.clock.runFor(32);
  expect(
    (await page.evaluate(() => window.__desertDebug.state())).player.x,
  ).toBe(0);
  await expect(page.locator("#bearing")).toHaveText("BEARING 000°");
  expect(failures).toEqual([]);
});

test("all static resources load from Pages subpath and game works offline after load", async ({
  page,
  context,
}) => {
  const failures = errors(page);
  await boot(page, "/Desert-Finding/?debugTime=12:00");
  await context.setOffline(true);
  await clickDirection(page, 350, 135);
  await page.clock.runFor(1000);
  await expect(page.locator("#bearing")).toHaveText("BEARING 090°");
  expect(failures).toEqual([]);
});

test("cardinal compass red tips point up, left, down, right", async ({
  page,
}) => {
  await boot(page);
  for (const [x, y, dx, dy] of [
    [240, 24, 0, -1],
    [350, 135, -1, 0],
    [240, 240, 0, 1],
    [40, 135, 1, 0],
  ]) {
    await clickDirection(page, x, y);
    const tip = await page.locator("#dial").evaluate((canvas) => {
      const c = canvas.getContext("2d");
      const d = c.getImageData(0, 0, 128, 128).data;
      let x = 0,
        y = 0,
        n = 0;
      for (let j = 15; j < 113; j++)
        for (let i = 15; i < 113; i++) {
          // Exclude red lettering on the outer dial; measure the needle shaft.
          const r = Math.hypot(i - 64, j - 64);
          if (r < 12 || r > 22) continue;
          const k = (j * 128 + i) * 4;
          if (
            d[k] >= 190 &&
            d[k + 1] < 150 &&
            d[k] - d[k + 1] > 90 &&
            d[k + 2] < 125
          ) {
            x += i - 64;
            y += j - 64;
            n++;
          }
        }
      return { x: x / n, y: y / n, n };
    });
    expect(tip.n).toBeGreaterThan(5);
    expect(tip.x * dx + tip.y * dy).toBeGreaterThan(10);
  }
});

test("default clock is local real time and crosses sunset without accelerated time", async ({
  page,
}) => {
  await boot(page, "/");
  await expect(page.locator("#clock")).toContainText("12:00 / DAY · LOCAL");
  await page.clock.runFor(61000);
  await expect(page.locator("#clock")).toContainText("12:01");
  await page.clock.setSystemTime(new Date("2026-10-08T09:15:00Z"));
  await page.clock.runFor(32);
  await expect(page.locator("#clock")).toContainText("18:15 / NIGHT · LOCAL");
});

for (const time of ["05:45", "06:10", "12:00", "17:50", "18:15", "23:30"]) {
  test(`lighting screenshot ${time}`, async ({ page }, testInfo) => {
    const failures = errors(page);
    await boot(page, `/?debugTime=${time}`);
    await clickDirection(page, 240, 24);
    await page.clock.runFor(2500);
    await page.keyboard.press("Space");
    await page.clock.runFor(32);
    await expect(page.locator("#clock")).toContainText(time);
    await page.screenshot({ path: testInfo.outputPath("lighting.png") });
    if (time === "23:30") {
      const samples = await page.locator("#world").evaluate((canvas) => {
        const c = canvas.getContext("2d");
        const avg = (x, y) => {
          const d = c.getImageData(x, y, 10, 10).data;
          let l = 0;
          for (let i = 0; i < d.length; i += 4)
            l += d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
          return l / 100;
        };
        return { near: avg(212, 148), far: avg(30, 30) };
      });
      expect(samples.near).toBeGreaterThan(samples.far * 2);
      await clickDirection(page, 350, 135);
      await page.screenshot({ path: testInfo.outputPath("lantern-east.png") });
    }
    expect(failures).toEqual([]);
  });
}

for (const viewport of [
  { width: 1000, height: 1000 },
  { width: 1920, height: 700 },
  { width: 390, height: 844 },
]) {
  test(`resize and letterbox ${viewport.width}×${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await boot(page);
    const rect = await page.locator("#world").boundingBox();
    expect(rect.width / rect.height).toBeCloseTo(16 / 9, 3);
    await clickDirection(page, 350, 135);
    await expect(page.locator("#bearing")).toHaveText("BEARING 090°");
    if (rect.y > 20) {
      await page.mouse.click(viewport.width / 2, 5);
      await page.clock.runFor(32);
      await expect(page.locator("#bearing")).toHaveText("BEARING 090°");
    }
    await page.screenshot({ path: testInfo.outputPath("viewport.png") });
  });
}

test("failed image loads show a recoverable error", async ({ page }) => {
  await page.route("**/assets/player_day.png", (route) => route.abort());
  await page.goto(urlFor("/"));
  await expect(
    page.getByRole("button", { name: "Reload", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("#panel-description")).toContainText(
    "Could not load assets/player_day.png",
  );
});

test("mobile title, accessible start, keyboard dialog focus and field notes", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(urlFor("/"));
  await expect(
    page.getByRole("button", { name: "Begin Journey", exact: true }),
  ).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("mobile-title.png") });
  await page.keyboard.press("Tab");
  await expect(page.locator("#primary")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("h");
  await expect(page.locator("#notes")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mobile-notes.png") });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("#secondary")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#primary")).toBeFocused();
});

test.describe("touch input", () => {
  test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });
  test("single tap walks persistently and UI taps do not steer", async ({
    page,
  }) => {
    await boot(page);
    const r = await page.locator("#world").boundingBox();
    await page.touchscreen.tap(r.x + r.width * 0.7, r.y + r.height * 0.5);
    await page.clock.runFor(1000);
    await expect(page.locator("#bearing")).toHaveText("BEARING 090°");
    await expect(page.locator("#travel-state")).toHaveText("WALKING");
    await page.getByRole("button", { name: "Field notes", exact: true }).tap();
    await page.clock.runFor(32);
    await expect(page.locator("#bearing")).toHaveText("BEARING 090°");
  });
});

test("automatic save and reload retain exact world coordinates and navigation state", async ({
  page,
}) => {
  await boot(page, "/?debug=1&debugTime=23:30");
  await clickDirection(page, 350, 135);
  await page.evaluate(() => window.__desertDebug.advanceHours(5, 23.5));
  await page.clock.runFor(32);
  await page.keyboard.press("Space");
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("desert-finding:journey:debug")),
  );
  expect(Math.abs(before.drift.offset)).toBeGreaterThan(0.1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Continue Journey", exact: true }),
  ).toBeEnabled();
  const after = await page.evaluate(() => window.__desertDebug.state());
  expect(after.player.x).toBe(before.player.x);
  expect(after.player.y).toBe(before.player.y);
  expect(after.drift).toEqual(before.drift);
  expect(after.seed).toBe(before.seed);
  expect(after.player.distance).toBe(before.player.distance);
  expect(after.player.walking).toBe(false);
  await page.clock.fastForward(3600_000);
  expect(
    (await page.evaluate(() => window.__desertDebug.state())).player.x,
  ).toBe(before.player.x);
  await page
    .getByRole("button", { name: "Continue Journey", exact: true })
    .click();
  await page.clock.runFor(32);
  await expect(page.locator("#travel-state")).toHaveText("AT REST");
  await clickDirection(page, 240, 24);
  const corrected = await page.evaluate(() => window.__desertDebug.state());
  expect(Math.abs(corrected.drift.offset)).toBeLessThan(0.000001);
  await expect(page.locator("#bearing")).toHaveText("BEARING 000°");
});

test("normal players have no debug shortcut, quest UI or nearby exits", async ({
  page,
}) => {
  await boot(page,"/");
  expect(await page.evaluate(() => window.__desertDebug)).toBeUndefined();
  await clickDirection(page, 350, 135);
  await page.clock.runFor(40000);
  await expect(page.locator("#overlay")).toBeHidden();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("desert-finding:journey")),
  );
  expect(saved.escaped).toBe(false);
  expect(saved.player.distance).toBeLessThan(60);
  expect(await page.locator("body").innerText()).not.toMatch(
    /035|well lies|found water/i,
  );
});

test("hidden tabs pause and resume without advancing physical progress", async ({
  page,
}) => {
  await boot(page, "/?debug=1&debugTime=12:00");
  await clickDirection(page, 350, 135);
  await page.clock.runFor(1000);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const before = await page.evaluate(() => window.__desertDebug.state());
  await page.clock.fastForward(3600_000);
  expect(
    (await page.evaluate(() => window.__desertDebug.state())).player,
  ).toEqual(before.player);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(32);
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.clock.runFor(1000);
  const after = await page.evaluate(() => window.__desertDebug.state());
  expect(after.player.distance - before.player.distance).toBeGreaterThan(1.2);
  expect(after.player.distance - before.player.distance).toBeLessThan(1.5);
});

test("blocked storage reports failure while game remains playable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("SecurityError");
      },
    });
  });
  await boot(page);
  await expect(page.locator("#save-notice")).toBeVisible();
  await clickDirection(page, 350, 135);
  await expect(page.locator("#bearing")).toHaveText("BEARING 090°");
});
