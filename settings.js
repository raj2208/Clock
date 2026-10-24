// Settings storage. This file does not use Electron, so it can be tested with plain Node.
const fs = require("fs");
const path = require("path");

// Width limits for resizing, and the bounds for other settings.
// On a typical MacBook screen (about 125 pixels per inch) 66 is roughly a fingernail
// and 490 is roughly four inches. Change these to suit your screen.
const LIMITS = {
  minWidth: 66,
  maxWidth: 490,
  minOpacity: 0.1,
};

// The fonts I can pick from. The settings file stores only the short `key`.
// The page looks up the matching `stack` (the CSS font-family value) from this list,
// so there is a single source of truth, and no arbitrary text ever becomes CSS.
const FONT_OPTIONS = [
  { key: "system", label: "System", stack: '-apple-system, BlinkMacSystemFont, sans-serif' },
  { key: "helvetica", label: "Helvetica Neue", stack: '"Helvetica Neue", Helvetica, sans-serif' },
  { key: "avenir", label: "Avenir Next", stack: '"Avenir Next", Avenir, sans-serif' },
  { key: "futura", label: "Futura", stack: 'Futura, "Century Gothic", sans-serif' },
  { key: "georgia", label: "Georgia (serif)", stack: 'Georgia, "Times New Roman", serif' },
  { key: "mono", label: "Menlo (monospace)", stack: '"SF Mono", Menlo, monospace' },
];

const DEFAULTS = {
  width: 220,
  opacity: 1,
  // null means "not placed yet", so the window starts in the top-right corner.
  x: null,
  y: null,
  backgroundColor: "#111111",
  textColor: "#ffffff",
  font: "system",
  // false shows 24-hour time (14:30), true shows 12-hour time with AM or PM.
  hour12: false,
  // How long the countdown timer starts at, in minutes.
  timerMinutes: 25,
};

const clamp = (number, min, max) => Math.min(max, Math.max(min, number));

// One checker per setting. Each returns a clean value, or undefined if the input is
// not usable. Settings come from a file and from the page, so nothing is trusted.
const VALIDATORS = {
  width: (v) => (Number.isFinite(v) ? Math.round(clamp(v, LIMITS.minWidth, LIMITS.maxWidth)) : undefined),
  opacity: (v) => (Number.isFinite(v) ? clamp(v, LIMITS.minOpacity, 1) : undefined),
  x: (v) => (v === null ? null : Number.isFinite(v) ? Math.round(v) : undefined),
  y: (v) => (v === null ? null : Number.isFinite(v) ? Math.round(v) : undefined),
  // Only a plain "#rrggbb" color is accepted, so nothing else can slip into the page's CSS.
  backgroundColor: (v) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : undefined),
  textColor: (v) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : undefined),
  font: (v) => (FONT_OPTIONS.some((option) => option.key === v) ? v : undefined),
  hour12: (v) => (typeof v === "boolean" ? v : undefined),
  timerMinutes: (v) => (Number.isFinite(v) ? Math.round(clamp(v, 1, 99)) : undefined),
};

// Copies the usable values from `input` over `base`. Unknown keys and bad values are skipped.
function applyValid(base, input) {
  const result = { ...base };
  if (!input || typeof input !== "object") return result;
  for (const key of Object.keys(VALIDATORS)) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    const value = VALIDATORS[key](input[key]);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function createSettingsStore(filePath) {
  let settings = load();
  let saveTimer = null;

  function load() {
    try {
      return applyValid(DEFAULTS, JSON.parse(fs.readFileSync(filePath, "utf8")));
    } catch {
      // No file yet, or it is damaged: start from the defaults.
      return { ...DEFAULTS };
    }
  }

  function writeNow() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    // Write to a temporary file and rename it, so a crash can never leave half a file.
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(settings, null, 2));
    fs.renameSync(tempPath, filePath);
  }

  // Dragging a window changes its position many times a second, so wait for a pause.
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(writeNow, 300);
  }

  return {
    get: () => ({ ...settings }),
    update(partial) {
      settings = applyValid(settings, partial);
      scheduleSave();
      return { ...settings };
    },
    reset() {
      settings = { ...DEFAULTS };
      scheduleSave();
      return { ...settings };
    },
    // Writes any change that is still waiting. Call before quitting.
    flush() {
      if (saveTimer) writeNow();
    },
  };
}

module.exports = { createSettingsStore, DEFAULTS, FONT_OPTIONS, LIMITS };
