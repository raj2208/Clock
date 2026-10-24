const MINUTE = 60 * 1000;
const MIN_DURATION = 1 * MINUTE;
const MAX_DURATION = 99 * MINUTE;

const timeElement = document.getElementById("time");
const timerDisplay = document.getElementById("timer-display");
const timerMinus = document.getElementById("timer-minus");
const timerPlus = document.getElementById("timer-plus");
const timerToggle = document.getElementById("timer-toggle");
const timerReset = document.getElementById("timer-reset");
const stopwatchDisplay = document.getElementById("stopwatch-display");
const stopwatchToggle = document.getElementById("stopwatch-toggle");
const stopwatchReset = document.getElementById("stopwatch-reset");

const PLAY = "▶";
const PAUSE = "⏸";

function pad(number) {
  return String(number).padStart(2, "0");
}

// Turns milliseconds into "MM:SS". Rounding up means 25:00 stays on screen for a
// full second and the display hits 00:00 exactly when the countdown ends.
function formatMinutesSeconds(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

// ---- Clock ----

let use12Hour = false;
let lastClockText = "";

function renderClock() {
  const now = new Date();
  const minutesAndSeconds = `${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  let text;
  let suffix = "";
  if (use12Hour) {
    // 0 and 12 o'clock both show as 12.
    text = `${now.getHours() % 12 || 12}:${minutesAndSeconds}`;
    suffix = now.getHours() < 12 ? "AM" : "PM";
  } else {
    text = `${pad(now.getHours())}:${minutesAndSeconds}`;
  }

  // Only touch the page when the text really changes, not ten times a second.
  if (text + suffix === lastClockText) return;
  lastClockText = text + suffix;
  timeElement.textContent = text;
  if (suffix) {
    const suffixElement = document.createElement("span");
    suffixElement.className = "ampm";
    suffixElement.textContent = suffix;
    timeElement.append(suffixElement);
  }
}

// ---- Countdown timer ----
//
// The timer is always in one of four states:
//   idle      not started, shows the full duration
//   running   endTime is set
//   paused    pausedRemainingMs is set
//   finished  reached zero, shows 00:00

const timer = {
  durationMs: 25 * MINUTE,
  // The moment the countdown reaches zero. null when it is not running.
  // Storing the end time, instead of subtracting a second on every tick,
  // keeps it accurate even if a tick is late.
  endTime: null,
  // Time left when it was paused. null when it is not paused.
  pausedRemainingMs: null,
  finished: false,
};

const timerIsRunning = () => timer.endTime !== null;
const timerIsPaused = () => timer.pausedRemainingMs !== null;
const timerIsIdle = () => !timerIsRunning() && !timerIsPaused() && !timer.finished;

function changeDuration(deltaMs) {
  // The duration can only change while the timer is idle or finished.
  if (timerIsRunning() || timerIsPaused()) return;
  timer.durationMs = Math.min(MAX_DURATION, Math.max(MIN_DURATION, timer.durationMs + deltaMs));
  timer.finished = false;
  renderTimer();
}

function toggleTimer() {
  if (timerIsRunning()) {
    // Pause: remember how much time is left.
    timer.pausedRemainingMs = timer.endTime - Date.now();
    timer.endTime = null;
  } else {
    // Start, resume, or restart after finishing.
    const remainingMs = timerIsPaused() ? timer.pausedRemainingMs : timer.durationMs;
    timer.endTime = Date.now() + remainingMs;
    timer.pausedRemainingMs = null;
    timer.finished = false;
  }
  renderTimer();
}

function resetTimer() {
  timer.endTime = null;
  timer.pausedRemainingMs = null;
  timer.finished = false;
  renderTimer();
}

function renderTimer() {
  const now = Date.now();
  if (timerIsRunning() && now >= timer.endTime) {
    timer.endTime = null;
    timer.finished = true;
  }

  let remainingMs = timer.durationMs;
  if (timerIsRunning()) remainingMs = timer.endTime - now;
  else if (timerIsPaused()) remainingMs = timer.pausedRemainingMs;
  else if (timer.finished) remainingMs = 0;

  timerDisplay.textContent = formatMinutesSeconds(remainingMs);
  timerDisplay.classList.toggle("finished", timer.finished);

  timerToggle.textContent = timerIsRunning() ? PAUSE : PLAY;
  timerToggle.title = timerIsRunning() ? "Pause" : timerIsPaused() ? "Resume" : "Start";
  timerReset.disabled = timerIsIdle();
  timerMinus.disabled = timerIsRunning() || timerIsPaused();
  timerPlus.disabled = timerIsRunning() || timerIsPaused();
}

timerMinus.addEventListener("click", () => changeDuration(-MINUTE));
timerPlus.addEventListener("click", () => changeDuration(MINUTE));
timerToggle.addEventListener("click", toggleTimer);
timerReset.addEventListener("click", resetTimer);

// ---- Stopwatch ----

const stopwatch = {
  // Time counted in earlier runs, before the last pause.
  elapsedBeforeMs: 0,
  // When the current run began. null when it is not running.
  // Like the timer, we compare against the real clock instead of adding up ticks.
  startTime: null,
};

const stopwatchIsRunning = () => stopwatch.startTime !== null;

function stopwatchElapsedMs() {
  if (!stopwatchIsRunning()) return stopwatch.elapsedBeforeMs;
  return stopwatch.elapsedBeforeMs + (Date.now() - stopwatch.startTime);
}

function toggleStopwatch() {
  if (stopwatchIsRunning()) {
    // Pause: bank the time counted so far.
    stopwatch.elapsedBeforeMs = stopwatchElapsedMs();
    stopwatch.startTime = null;
  } else {
    stopwatch.startTime = Date.now();
  }
  renderStopwatch();
}

function resetStopwatch() {
  stopwatch.elapsedBeforeMs = 0;
  stopwatch.startTime = null;
  renderStopwatch();
}

// Turns milliseconds into "MM:SS.t", where t is tenths of a second.
function formatStopwatch(ms) {
  const tenths = Math.floor(ms / 100) % 10;
  const totalSeconds = Math.floor(ms / 1000);
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}.${tenths}`;
}

function renderStopwatch() {
  const elapsedMs = stopwatchElapsedMs();
  stopwatchDisplay.textContent = formatStopwatch(elapsedMs);

  stopwatchToggle.textContent = stopwatchIsRunning() ? PAUSE : PLAY;
  stopwatchToggle.title = stopwatchIsRunning() ? "Pause" : elapsedMs > 0 ? "Resume" : "Start";
  stopwatchReset.disabled = !stopwatchIsRunning() && elapsedMs === 0;
}

stopwatchToggle.addEventListener("click", toggleStopwatch);
stopwatchReset.addEventListener("click", resetStopwatch);

// ---- Modes ----

const MODES = ["clock", "timer", "stopwatch"];
const MODE_LABELS = { clock: "Clock", timer: "Timer", stopwatch: "Stopwatch" };
let currentMode = "clock";

const modeButton = document.getElementById("mode-button");

function setMode(mode) {
  currentMode = mode;
  modeButton.textContent = MODE_LABELS[mode];
  // Show only the display and controls that belong to the current mode.
  // The timer and stopwatch keep running in the background while hidden.
  for (const element of document.querySelectorAll("[data-mode]")) {
    element.hidden = element.dataset.mode !== mode;
  }
}

function nextMode() {
  setMode(MODES[(MODES.indexOf(currentMode) + 1) % MODES.length]);
}

modeButton.addEventListener("click", nextMode);
setMode(currentMode);

// ---- Menu bar ----
//
// The menu bar icon's menu lives in main.js. It needs to know what I am doing, so the
// labels are right ("Pause timer" while it runs), and it can ask me to do things.

let lastReportedState = "";

function reportState() {
  const state = { mode: currentMode, timerRunning: timerIsRunning(), stopwatchRunning: stopwatchIsRunning() };
  const key = JSON.stringify(state);
  // Only send a message when something changed, not ten times a second.
  if (key === lastReportedState) return;
  lastReportedState = key;
  window.timeTrackerApp.reportState(state);
}

window.timeTrackerApp.onCommand((command) => {
  if (!command) return;
  if (command.type === "set-mode" && MODES.includes(command.mode)) {
    setMode(command.mode);
  } else if (command.type === "toggle") {
    // Start or pause whichever of the timer and stopwatch is on screen.
    if (currentMode === "timer") toggleTimer();
    else if (currentMode === "stopwatch") toggleStopwatch();
  }
});

// ---- Opacity ----

// Each click makes the window a bit more see-through, then it wraps back to solid.
const OPACITY_LEVELS = [1, 0.8, 0.6, 0.4, 0.2];
let currentOpacity = 1;

const opacityButton = document.getElementById("opacity-button");

// The next step down from the current opacity, or back to solid if already at the lowest.
// Starting from the current value means it still makes sense after opacity was set elsewhere.
function nextOpacity(opacity) {
  return OPACITY_LEVELS.find((level) => level < opacity - 0.01) ?? 1;
}

function showOpacity(opacity) {
  currentOpacity = opacity;
  const next = nextOpacity(opacity);
  opacityButton.title = `Opacity: ${Math.round(opacity * 100)}%. Click for ${next === 1 ? "solid" : "less"}.`;
}

// timeTrackerApp comes from preload.js. The window itself is changed in main.js,
// which also saves the setting so it is remembered next time.
opacityButton.addEventListener("click", () => {
  window.timeTrackerApp.updateSettings({ opacity: nextOpacity(currentOpacity) });
});

document.getElementById("settings-button").addEventListener("click", () => window.timeTrackerApp.openSettings());

// ---- Settings ----

let fontStacks = {};
let lastTimerMinutes = null;

function applyAppearance(settings) {
  const root = document.documentElement.style;
  root.setProperty("--background", settings.backgroundColor);
  root.setProperty("--text", settings.textColor);
  // Only fonts from the list the main process sent can be used.
  if (fontStacks[settings.font]) root.setProperty("--font", fontStacks[settings.font]);
}

function applySettings(settings) {
  showOpacity(settings.opacity);
  applyAppearance(settings);

  use12Hour = settings.hour12;
  timeElement.classList.toggle("twelve-hour", use12Hour);
  renderClock();

  // The timer length changes only when I actually change that setting. This function also
  // runs when I just move or resize the window, which must not undo the + and - buttons.
  if (settings.timerMinutes !== lastTimerMinutes) {
    lastTimerMinutes = settings.timerMinutes;
    if (!timerIsRunning() && !timerIsPaused()) {
      timer.durationMs = settings.timerMinutes * MINUTE;
      timer.finished = false;
      renderTimer();
    }
  }
}

window.timeTrackerApp.getSettings().then(({ settings, fonts }) => {
  fontStacks = Object.fromEntries(fonts.map((font) => [font.key, font.stack]));
  applySettings(settings);
});
window.timeTrackerApp.onSettingsChanged(applySettings);

// ---- Main loop ----

function render() {
  renderClock();
  renderTimer();
  renderStopwatch();
  reportState();
}

render();
// Check ten times a second, so the display never skips a second.
setInterval(render, 100);
