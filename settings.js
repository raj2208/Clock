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

const DEFAULTS = {
  width: 220,
  opacity: 1,
  // null means "not placed yet", so the clock starts in the top-right corner.
  x: null,
  y: null,
};

const clamp = (number, min, max) => Math.min(max, Math.max(min, number));

// One checker per setting. Each returns a clean value, or undefined if the input is
// not usable. Settings come from a file and from the page, so nothing is trusted.
const VALIDATORS = {
  width: (v) => (Number.isFinite(v) ? Math.round(clamp(v, LIMITS.minWidth, LIMITS.maxWidth)) : undefined),
  opacity: (v) => (Number.isFinite(v) ? clamp(v, LIMITS.minOpacity, 1) : undefined),
  x: (v) => (v === null ? null : Number.isFinite(v) ? Math.round(v) : undefined),
  y: (v) => (v === null ? null : Number.isFinite(v) ? Math.round(v) : undefined),
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

module.exports = { createSettingsStore, DEFAULTS, LIMITS };
