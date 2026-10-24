const MINUTE = 60 * 1000;
const MIN_DURATION = 1 * MINUTE;
const MAX_DURATION = 99 * MINUTE;

const timeElement = document.getElementById("time");
const timerDisplay = document.getElementById("timer-display");
const timerMinus = document.getElementById("timer-minus");
const timerPlus = document.getElementById("timer-plus");
const timerStart = document.getElementById("timer-start");
const stopwatchDisplay = document.getElementById("stopwatch-display");
const stopwatchStart = document.getElementById("stopwatch-start");

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

function renderClock() {
  const now = new Date();
  timeElement.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// ---- Countdown timer ----

const timer = {
  durationMs: 25 * MINUTE,
  // The moment the countdown reaches zero. null when it is not running.
  // Storing the end time, instead of subtracting a second on every tick,
  // keeps it accurate even if a tick is late.
  endTime: null,
  finished: false,
};

function changeDuration(deltaMs) {
  if (timer.endTime !== null) return;
  timer.durationMs = Math.min(MAX_DURATION, Math.max(MIN_DURATION, timer.durationMs + deltaMs));
  timer.finished = false;
  renderTimer();
}

function startTimer() {
  if (timer.endTime !== null) return;
  timer.endTime = Date.now() + timer.durationMs;
  timer.finished = false;
  renderTimer();
}

function renderTimer() {
  const now = Date.now();
  if (timer.endTime !== null && now >= timer.endTime) {
    timer.endTime = null;
    timer.finished = true;
  }

  const running = timer.endTime !== null;
  let remainingMs = timer.durationMs;
  if (running) remainingMs = timer.endTime - now;
  else if (timer.finished) remainingMs = 0;

  timerDisplay.textContent = formatMinutesSeconds(remainingMs);
  timerDisplay.classList.toggle("finished", timer.finished);
  timerStart.disabled = running;
  timerMinus.disabled = running;
  timerPlus.disabled = running;
}

timerMinus.addEventListener("click", () => changeDuration(-MINUTE));
timerPlus.addEventListener("click", () => changeDuration(MINUTE));
timerStart.addEventListener("click", startTimer);

// ---- Stopwatch ----

const stopwatch = {
  // Time counted before the current run began. Pause and reset will use this.
  elapsedBeforeMs: 0,
  // When the current run began. null when it is not running.
  // Like the timer, we compare against the real clock instead of adding up ticks.
  startTime: null,
};

function stopwatchElapsedMs() {
  if (stopwatch.startTime === null) return stopwatch.elapsedBeforeMs;
  return stopwatch.elapsedBeforeMs + (Date.now() - stopwatch.startTime);
}

function startStopwatch() {
  if (stopwatch.startTime !== null) return;
  stopwatch.startTime = Date.now();
  renderStopwatch();
}

// Turns milliseconds into "MM:SS.t", where t is tenths of a second.
function formatStopwatch(ms) {
  const tenths = Math.floor(ms / 100) % 10;
  const totalSeconds = Math.floor(ms / 1000);
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}.${tenths}`;
}

function renderStopwatch() {
  stopwatchDisplay.textContent = formatStopwatch(stopwatchElapsedMs());
  stopwatchStart.disabled = stopwatch.startTime !== null;
}

stopwatchStart.addEventListener("click", startStopwatch);

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

// ---- Main loop ----

function render() {
  renderClock();
  renderTimer();
  renderStopwatch();
}

render();
// Check ten times a second, so the display never skips a second.
setInterval(render, 100);
