import { directionRow, rotate, compassNeedleRotation } from "./math.js";
import { terrainHash, PIXELS_PER_METER } from "./world.js";
export class Renderer {
  constructor(canvas, compass, assets) {
    this.ctx = canvas.getContext("2d");
    this.hud = compass.getContext("2d");
    this.a = assets;
    this.mask = document.createElement("canvas");
    this.mask.width = 480;
    this.mask.height = 270;
    this.light = this.mask.getContext("2d");
    this.ctx.imageSmoothingEnabled = this.hud.imageSmoothingEnabled = false;
  }
  draw(game, sun, elapsed) {
    const c = this.ctx,
      a = this.a,
      p = game.player;
    const cx = p.x * PIXELS_PER_METER - 240,
      cy = p.y * PIXELS_PER_METER - 135;
    const nearBoundary = game.desert.signedDistance(p.x, p.y) < 2010;
    c.clearRect(0, 0, 480, 270);
    for (let y = Math.floor(cy / 64); y <= Math.floor((cy + 270) / 64); y++) {
      for (let x = Math.floor(cx / 64); x <= Math.floor((cx + 480) / 64); x++) {
        const v = terrainHash(x, y, game.seed) % 16;
        c.drawImage(
          a.sand_tiles,
          (v % 4) * 64,
          Math.floor(v / 4) * 64,
          64,
          64,
          Math.round(x * 64 - cx),
          Math.round(y * 64 - cy),
          64,
          64,
        );
        const worldX = (x * 64 + 32) / PIXELS_PER_METER,
          worldY = (y * 64 + 32) / PIXELS_PER_METER;
        const vegetation = nearBoundary
          ? game.desert.vegetation(worldX, worldY)
          : 0;
        if (vegetation > 0) {
          const nearEdge = game.desert.signedDistance(worldX, worldY);
          const greenness =
            vegetation * 0.24 +
            Math.max(0, Math.min(1, 1 - nearEdge / 120)) * 0.37;
          c.fillStyle = `rgba(77,108,65,${greenness})`;
          c.fillRect(Math.round(x * 64 - cx), Math.round(y * 64 - cy), 64, 64);
          // Sparse deterministic grass tufts and stones, strictly top-down.
          for (let tuft = 0; tuft < 10; tuft++) {
            const h = terrainHash(x * 11 + tuft, y, game.seed ^ 539);
            if (h / 0xffffffff > vegetation * 0.8) continue;
            const tx = Math.round(x * 64 + ((h >>> 8) % 58) - cx),
              ty = Math.round(y * 64 + ((h >>> 16) % 58) - cy);
            c.fillStyle = vegetation > 0.75 ? "#59734d" : "#928a50";
            c.fillRect(tx, ty, 1, 4);
            c.fillRect(tx - 2, ty + 2, 5, 1);
            c.fillStyle = "#859064";
            c.fillRect(tx + 1, ty - 1, 1, 3);
            if (tuft % 3 === 0) {
              c.fillStyle = "#8b8875";
              c.fillRect(tx + 9, ty + 10, 4, 3);
              c.fillStyle = "#b1ad91";
              c.fillRect(tx + 10, ty + 10, 2, 1);
            }
          }
        }
      }
    }
    for (
      let y = Math.floor(cy / 96) - 1;
      y <= Math.floor((cy + 270) / 96);
      y++
    ) {
      for (
        let x = Math.floor(cx / 96) - 1;
        x <= Math.floor((cx + 480) / 96);
        x++
      ) {
        const h = terrainHash(x, y, game.seed ^ 347);
        if (h % 3 === 0) continue;
        const v = h % 12;
        c.drawImage(
          a.sand_details,
          (v % 4) * 32,
          Math.floor(v / 4) * 32,
          32,
          32,
          Math.round(x * 96 + ((h >>> 8) % 64) - cx),
          Math.round(y * 96 + ((h >>> 16) % 64) - cy),
          32,
          32,
        );
      }
    }
    for (const f of game.footprints) {
      c.save();
      c.globalAlpha = 0.38 * (1 - (game.age - f.born) / 55);
      c.translate(
        Math.round(f.x * PIXELS_PER_METER - cx),
        Math.round(f.y * PIXELS_PER_METER - cy),
      );
      c.rotate(f.heading);
      c.drawImage(a.footprints, f.side * 16, 0, 16, 16, -8, -8, 16, 16);
      c.restore();
    }
    c.save();
    c.globalAlpha = 0.65 * sun.daylight;
    c.translate(
      240 - sun.x * sun.shadowLength * 0.45,
      135 - sun.y * sun.shadowLength * 0.45,
    );
    c.rotate(Math.atan2(-sun.y, -sun.x) - Math.PI / 2);
    c.scale(0.8, 0.65 + sun.shadowLength / 22);
    c.drawImage(a.player_shadow, -32, -32);
    c.restore();
    const row = directionRow(p.actualHeading),
      pose = (row * Math.PI) / 4;
    const frame =
      p.walking && game.mode === "playing"
        ? Math.floor((p.distance * PIXELS_PER_METER) / 8) % 6
        : 0;
    c.drawImage(
      sun.night ? a.player_night : a.player_day,
      frame * 64,
      row * 64,
      64,
      64,
      208,
      103,
      64,
      64,
    );
    // The atlas turns in 45° steps. Attach both instruments to that visible pose;
    // the handheld needle itself stays world-North, independent of the pose.
    const dial = rotate(19, 8, pose);
    c.fillStyle = "#cc5748";
    c.fillRect(Math.round(240 + dial.x), Math.round(135 + dial.y) - 3, 1, 3);
    this.lighting(sun, pose, elapsed);
    const h = this.hud;
    h.clearRect(0, 0, 128, 128);
    h.drawImage(a.compass_base, 0, 0);
    h.save();
    h.translate(64, 64);
    h.rotate(compassNeedleRotation(p.actualHeading));
    h.drawImage(a.compass_needle, -64, -64);
    h.restore();
    h.drawImage(a.compass_glass, 0, 0);
  }
  lighting(sun, pose, elapsed) {
    const c = this.ctx,
      l = this.light;
    l.clearRect(0, 0, 480, 270);
    l.fillStyle = `rgba(12,25,49,${(1 - sun.daylight) * 0.83})`;
    l.fillRect(0, 0, 480, 270);
    if (sun.night) {
      const hand = rotate(-20, 9, pose),
        x = 240 + hand.x,
        y = 135 + hand.y;
      const radius =
        91 + Math.sin(elapsed * 3.1) * 1.2 + Math.sin(elapsed * 7.7) * 0.6;
      const hole = l.createRadialGradient(x, y, 3, x, y, radius);
      hole.addColorStop(0, "rgba(0,0,0,.97)");
      hole.addColorStop(0.3, "rgba(0,0,0,.86)");
      hole.addColorStop(1, "rgba(0,0,0,0)");
      l.globalCompositeOperation = "destination-out";
      l.fillStyle = hole;
      l.fillRect(0, 0, 480, 270);
      l.globalCompositeOperation = "source-over";
      c.drawImage(this.mask, 0, 0);
      const glow = c.createRadialGradient(x, y, 1, x, y, radius * 0.8);
      glow.addColorStop(0, "rgba(255,209,112,.23)");
      glow.addColorStop(1, "rgba(255,209,112,0)");
      c.fillStyle = glow;
      c.fillRect(0, 0, 480, 270);
    } else c.drawImage(this.mask, 0, 0);
    c.fillStyle = `rgba(221,110,52,${sun.warmth})`;
    c.fillRect(0, 0, 480, 270);
  }
}
