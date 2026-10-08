export const TAU = Math.PI * 2;
export const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const headingFromPointer = (dx, dy) => (Math.atan2(dx, -dy) + TAU) % TAU;
export const movementVector = (heading, speed = 1) => ({
  x: Math.sin(heading) * speed,
  y: -Math.cos(heading) * speed,
});
export const compassNeedleRotation = (heading) => -heading;
export const directionRow = (heading) =>
  ((Math.round(heading / (Math.PI / 4)) % 8) + 8) % 8;
export const rotate = (x, y, angle) => ({
  x: x * Math.cos(angle) - y * Math.sin(angle),
  y: x * Math.sin(angle) + y * Math.cos(angle),
});
export const bearing = (heading) =>
  String(Math.round((heading * 180) / Math.PI) % 360).padStart(3, "0");
export function pointerToCanvas(x, y, rect) {
  return {
    x: ((x - rect.left) * 480) / rect.width,
    y: ((y - rect.top) * 270) / rect.height,
  };
}
