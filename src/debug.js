import { movementVector } from "./math.js";
import { snapshot } from "./save.js";
import { sunState } from "./time.js";
// Only loaded with ?debug=1. Debug sessions use a separate save namespace.
export function installDebug(game, changed) {
  window.__desertDebug = Object.freeze({
    state: () => snapshot(game),
    boundary: (degrees) => game.desert.radiusAt((degrees * Math.PI) / 180),
    teleportToBoundary(degrees, distanceInside = 3) {
      if (
        !Number.isFinite(degrees) ||
        !Number.isFinite(distanceInside) ||
        Math.abs(distanceInside) > 10000
      )
        throw new Error("Invalid debug location");
      game.reset();
      const theta = (degrees * Math.PI) / 180;
      const point = movementVector(
        theta,
        game.desert.radiusAt(theta) - distanceInside,
      );
      game.player.x = point.x;
      game.player.y = point.y;
      game.steer(240 + Math.sin(theta) * 100, 135 - Math.cos(theta) * 100);
      game.player.walking = false;
      changed();
    },
    advanceHours(hours, localHour = 23.5) {
      if (!Number.isFinite(hours) || hours < 0 || hours > 720)
        throw new Error("Debug range is 0–720 hours");
      let remaining = hours * 3600;
      while (remaining > 0 && game.mode === "playing") {
        const dt = Math.min(10, remaining);
        game.tick(dt, sunState(localHour), false);
        remaining -= dt;
      }
      changed();
      return snapshot(game);
    },
  });
}
