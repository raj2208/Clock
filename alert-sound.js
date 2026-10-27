// Makes the sounds for the end of the countdown. There are no sound files: each tone is
// built from sine waves with the browser's Web Audio API, so nothing has to be shipped,
// and no sound file can go missing. Loaded by both the clock page and the settings page.
//
// The keys must match SOUND_OPTIONS in settings.js ("off" is handled by the caller).

// A note is { freq, start, length } in Hz and seconds. `partials` are extra sine waves
// above the main pitch (multiples of its frequency, with a volume each) that give a bell
// its metallic ring. A plain tone has just the one wave.
const ALERT_SOUNDS = {
  chime: {
    notes: [
      { freq: 880, start: 0, length: 1.0 },
      { freq: 1318.5, start: 0.2, length: 1.4 },
    ],
    partials: [{ ratio: 1, volume: 1 }],
  },
  bell: {
    notes: [{ freq: 523.25, start: 0, length: 2.2 }],
    partials: [
      { ratio: 1, volume: 1 },
      { ratio: 2.76, volume: 0.45 },
      { ratio: 5.4, volume: 0.2 },
    ],
  },
  beep: {
    notes: [
      { freq: 1000, start: 0, length: 0.12 },
      { freq: 1000, start: 0.2, length: 0.12 },
      { freq: 1000, start: 0.4, length: 0.12 },
    ],
    partials: [{ ratio: 1, volume: 1 }],
  },
};

// Quiet enough not to startle, and each wave is scaled so stacked waves do not clip.
const ALERT_VOLUME = 0.22;
// Pause between repeats of the same sound, in seconds.
const ALERT_GAP = 0.5;

let alertAudio = null;

// Plays the sound called `key`, `repeats` times in a row. An unknown key plays nothing.
function playAlertSound(key, repeats = 1) {
  const sound = Object.prototype.hasOwnProperty.call(ALERT_SOUNDS, key) ? ALERT_SOUNDS[key] : null;
  if (!sound) return;
  const count = Math.min(Math.max(Math.floor(repeats) || 1, 1), 5);

  if (!alertAudio) alertAudio = new AudioContext();
  // A context can start out suspended. Resuming is harmless if it is already running.
  alertAudio.resume();

  const soundLength = Math.max(...sound.notes.map((note) => note.start + note.length));
  const totalVolume = sound.partials.reduce((sum, partial) => sum + partial.volume, 0);
  const begin = alertAudio.currentTime + 0.05;

  for (let round = 0; round < count; round++) {
    const roundStart = begin + round * (soundLength + ALERT_GAP);
    for (const note of sound.notes) {
      for (const partial of sound.partials) {
        const wave = alertAudio.createOscillator();
        const volume = alertAudio.createGain();
        const start = roundStart + note.start;
        const end = start + note.length;

        wave.type = "sine";
        wave.frequency.value = note.freq * partial.ratio;
        // A quick rise avoids a click, then a smooth fade to silence like a struck bell.
        // (An exponential ramp cannot reach exactly zero, so it goes to a tiny number.)
        volume.gain.setValueAtTime(0, start);
        volume.gain.linearRampToValueAtTime((ALERT_VOLUME * partial.volume) / totalVolume, start + 0.01);
        volume.gain.exponentialRampToValueAtTime(0.0001, end);

        wave.connect(volume).connect(alertAudio.destination);
        wave.start(start);
        wave.stop(end + 0.05);
      }
    }
  }
}
