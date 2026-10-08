import { Game } from "./game.js";
import { loadAssets } from "./assets.js";
import { Renderer } from "./renderer.js";
import { bearing, pointerToCanvas } from "./math.js";
import { localHour, parseDebugTime, sunState } from "./time.js";
import { JourneyStore, restore, SAVE_KEY } from "./save.js";

const $ = (id) => document.getElementById(id);
const game = new Game();
const params = new URLSearchParams(location.search);
const debugHour = parseDebugTime(params.get("debugTime"));
const debugEnabled = params.get("debug") === "1";
const previewSession = debugEnabled || debugHour !== null;
let storage = null;
try {
  storage = localStorage;
} catch {
  /* Storage may be disabled by the browser. */
}
const store = new JourneyStore(
  storage,
  previewSession ? `${SAVE_KEY}:debug` : SAVE_KEY,
);
const saved = store.read();
if (saved) restore(game, saved);
let hasJourney = !!saved,
  lastSaveAge = game.age,
  resetReturnMode = "paused";
let renderer,
  previousTime = null,
  animationId,
  lastMode,
  lastClock,
  lastBearing,
  lastTravel;
let notesShown = false;

function resize() {
  const available = Math.min(innerWidth / 480, innerHeight / 270);
  const scale = available >= 1 ? Math.max(1, Math.floor(available)) : available;
  document.documentElement.style.setProperty("--unit", `${scale}px`);
}
resize();
addEventListener("resize", resize);

function showNotes(show) {
  notesShown = show;
  $("notes").hidden = !show;
  $("notes-button").setAttribute("aria-expanded", String(show));
}
function saveJourney() {
  if (!hasJourney) return;
  store.write(game);
  lastSaveAge = game.age;
  showSaveStatus();
}
function showSaveStatus() {
  $("save-notice").hidden = !store.error;
  $("save-notice").textContent = store.error;
}

function syncUI() {
  const mode = game.mode;
  $("tools").hidden = mode !== "playing";
  const modal = mode !== "playing";
  $("overlay").hidden = !modal;
  $("world").tabIndex = modal ? -1 : 0;
  $("tools").inert = modal;
  $("notes").inert = modal;
  $("compass").setAttribute("aria-hidden", String(mode === "title"));
  if (mode === lastMode) return;
  lastMode = mode;
  if (!modal) {
    $("world").focus({ preventScroll: true });
    return;
  }
  showNotes(false);
  const title = mode === "title";
  const ending = mode === "ending";
  const resetting = mode === "reset-confirm";
  $("panel-eyebrow").textContent = title
    ? "A COMPASS. AN ENORMOUS SEA."
    : ending
      ? "THE GROUND HAS CHANGED."
      : resetting
        ? "A NEW FIRST STEP."
        : "THE SAND CAN WAIT.";
  $("panel-title").innerHTML = title
    ? "DESERT<br>FINDING"
    : ending
      ? "BEYOND<br>THE SAND."
      : resetting
        ? "BEGIN<br>AGAIN?"
        : "REST A<br>MOMENT.";
  $("panel-description").innerHTML = title
    ? "No route. No destination.<br>Only sand, and the way you choose."
    : ending
      ? "Grass beneath your feet.<br>The desert is behind you."
      : resetting
        ? "Return to the center of the desert?<br>This replaces your saved journey."
        : "Your journey waits here.<br>Continue whenever you are ready.";
  $("panel-controls").hidden = !title;
  $("primary").textContent = title
    ? hasJourney
      ? "Continue Journey"
      : "Begin Journey"
    : ending
      ? "Wander On"
      : resetting
        ? "Reset Journey"
        : "Continue";
  $("secondary").hidden = title && !hasJourney;
  $("secondary").textContent = resetting ? "Keep Journey" : "Reset Journey";
  $("panel-footnote").textContent = title
    ? "SPACE · REST   H · NOTES   ESC · PAUSE"
    : ending
      ? "THE JOURNEY IS YOURS TO KEEP."
      : resetting
        ? "YOUR PREVIOUS LOCATION WILL BE REPLACED."
        : store.error
          ? "SAVING UNAVAILABLE"
          : "SAVED ON THIS DEVICE · ESC TO CONTINUE";
  $("announcement").textContent = ending
    ? "You walked beyond the desert."
    : mode === "paused"
      ? "Journey paused."
      : "";
  $("primary").focus({ preventScroll: true });
}

$("primary").addEventListener("click", () => {
  if (!renderer) return;
  if (game.mode === "reset-confirm") {
    game.reset();
    hasJourney = true;
  } else if (game.mode === "title") {
    hasJourney = true;
    game.resume();
    game.player.walking = false;
  } else game.mode === "ending" ? game.wander() : game.resume();
  previousTime = null;
  saveJourney();
  syncUI();
});
$("secondary").addEventListener("click", () => {
  if (game.mode === "reset-confirm") game.mode = resetReturnMode;
  else {
    resetReturnMode = game.mode;
    game.mode = "reset-confirm";
  }
  syncUI();
});
$("notes-button").addEventListener("click", () => showNotes(!notesShown));
$("close-notes").addEventListener("click", () => {
  showNotes(false);
  $("world").focus();
});
$("pause-button").addEventListener("click", () => {
  game.pause();
  saveJourney();
  syncUI();
});
$("world").addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !renderer || game.mode !== "playing") return;
  event.preventDefault();
  const point = pointerToCanvas(
    event.clientX,
    event.clientY,
    $("world").getBoundingClientRect(),
  );
  game.steer(point.x, point.y);
  if (game.player.walking) showNotes(false);
  saveJourney();
  $("world").focus({ preventScroll: true });
});

document.addEventListener("keydown", (event) => {
  if (!renderer) return;
  if (event.key === "Tab" && game.mode !== "playing") {
    const buttons = [
      ...$("panel-actions").querySelectorAll("button:not([hidden])"),
    ];
    const first = buttons[0],
      last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  if (event.repeat) return;
  if (event.key === "Escape") {
    if (game.mode === "reset-confirm") game.mode = resetReturnMode;
    else if (game.mode === "paused") game.resume();
    else game.pause();
    previousTime = null;
    saveJourney();
    syncUI();
  } else if (event.key.toLowerCase() === "h" && game.mode === "playing") {
    event.preventDefault();
    showNotes(!notesShown);
  } else if (
    event.code === "Space" &&
    game.mode === "playing" &&
    document.activeElement?.tagName !== "BUTTON"
  ) {
    event.preventDefault();
    game.toggleWalking();
    saveJourney();
  }
});

function frame(timestamp) {
  const dt = previousTime === null ? 0 : (timestamp - previousTime) / 1000;
  previousTime = timestamp;
  const hour = debugHour ?? localHour();
  const sun = sunState(hour);
  game.update(dt, sun);
  if (game.mode === "playing" && game.age - lastSaveAge >= 5) saveJourney();
  if (game.mode === "ending" && lastMode !== "ending") saveJourney();
  renderer.draw(game, sun, timestamp / 1000);
  syncUI();
  const currentBearing = `BEARING ${bearing(game.player.actualHeading)}°`;
  if (lastBearing !== currentBearing) {
    $("bearing").textContent = currentBearing;
    lastBearing = currentBearing;
  }
  const travel =
    game.mode === "playing" && game.player.walking ? "WALKING" : "AT REST";
  if (lastTravel !== travel) {
    $("travel-state").textContent = travel;
    lastTravel = travel;
  }
  const minutes = Math.floor(hour * 60);
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")} / ${sun.night ? "NIGHT" : sun.elevation < 0.25 ? "TWILIGHT" : "DAY"}${debugHour === null ? " · LOCAL" : " · PREVIEW"}`;
  if (lastClock !== clock) {
    $("clock").textContent = clock;
    lastClock = clock;
  }
  animationId = requestAnimationFrame(frame);
}

document.addEventListener("visibilitychange", () => {
  previousTime = null;
  if (document.hidden) {
    cancelAnimationFrame(animationId);
    game.pause();
    saveJourney();
    syncUI();
  } else if (renderer) animationId = requestAnimationFrame(frame);
});
addEventListener("pagehide", saveJourney);
addEventListener("beforeunload", saveJourney);

try {
  const assets = await loadAssets();
  renderer = new Renderer($("world"), $("dial"), assets);
  $("primary").disabled = false;
  if (debugEnabled) {
    const { installDebug } = await import("./debug.js");
    installDebug(game, () => {
      hasJourney = true;
      previousTime = null;
      saveJourney();
      syncUI();
    });
  }
  showSaveStatus();
  syncUI();
  if (!document.hidden) animationId = requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  $("panel-title").textContent = "THE DESERT IS OUT OF REACH.";
  $("panel-description").textContent = error.message;
  $("panel-controls").hidden = true;
  $("primary").textContent = "Reload";
  $("primary").disabled = false;
  $("primary").addEventListener("click", () => location.reload());
  $("announcement").textContent = error.message;
}
