import { clamp } from "./math.js";
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
export function localHour(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}
export function parseDebugTime(value) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value ?? "")) return null;
  const [h, m] = value.split(":").map(Number);
  return h + m / 60;
}
export function sunState(hour) {
  const t = clamp((hour - 6) / 12);
  const elevation = Math.max(0, Math.sin(Math.PI * t));
  const daylight = smooth(hour - 5.5) * (1 - smooth(hour - 17.5));
  return {
    night: hour < 6 || hour >= 18,
    daylight,
    elevation,
    x: Math.cos(Math.PI * t),
    y: Math.sin(Math.PI * t),
    shadowLength: 5 + 30 * (1 - elevation),
    warmth: daylight * (1 - elevation) * 0.18,
  };
}
