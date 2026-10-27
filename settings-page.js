const opacitySlider = document.getElementById("opacity");
const opacityValue = document.getElementById("opacity-value");
const widthSlider = document.getElementById("width");
const widthValue = document.getElementById("width-value");
const backgroundColor = document.getElementById("backgroundColor");
const textColor = document.getElementById("textColor");
const fontSelect = document.getElementById("font");
const hour12 = document.getElementById("hour12");
const timerMinutes = document.getElementById("timerMinutes");
const alertSound = document.getElementById("alertSound");
const alertFlash = document.getElementById("alertFlash");

// Shows the given settings in the controls.
function showSettings(settings) {
  opacitySlider.value = Math.round(settings.opacity * 100);
  opacityValue.textContent = `${Math.round(settings.opacity * 100)}%`;
  widthSlider.value = settings.width;
  widthValue.textContent = `${settings.width} px`;
  backgroundColor.value = settings.backgroundColor;
  textColor.value = settings.textColor;
  fontSelect.value = settings.font;
  hour12.checked = settings.hour12;
  alertSound.value = settings.alertSound;
  alertFlash.checked = settings.alertFlash;
  // Don't overwrite the number while I am in the middle of typing it.
  if (document.activeElement !== timerMinutes) timerMinutes.value = settings.timerMinutes;
}

// Each control sends its change to the main process, which checks it, applies it to the
// main window, and saves it. The main process then sends the settings back (see the bottom).
function send(partial) {
  window.timeTrackerApp.updateSettings(partial);
}

opacitySlider.addEventListener("input", () => send({ opacity: Number(opacitySlider.value) / 100 }));
widthSlider.addEventListener("input", () => send({ width: Number(widthSlider.value) }));
backgroundColor.addEventListener("input", () => send({ backgroundColor: backgroundColor.value }));
textColor.addEventListener("input", () => send({ textColor: textColor.value }));
fontSelect.addEventListener("change", () => send({ font: fontSelect.value }));
hour12.addEventListener("change", () => send({ hour12: hour12.checked }));
alertSound.addEventListener("change", () => send({ alertSound: alertSound.value }));
alertFlash.addEventListener("change", () => send({ alertFlash: alertFlash.checked }));
// Plays the chosen sound once ("off" is not a sound, so it plays nothing).
document.getElementById("alertPreview").addEventListener("click", () => playAlertSound(alertSound.value, 1));
timerMinutes.addEventListener("input", () => {
  // An empty box while typing is not a number yet: wait for a real one.
  if (timerMinutes.value !== "") send({ timerMinutes: Number(timerMinutes.value) });
});
// When I leave the box, show the real saved value (for example 99 if I typed 500).
timerMinutes.addEventListener("blur", () => window.timeTrackerApp.getSettings().then(({ settings }) => showSettings(settings)));

for (const button of document.querySelectorAll("[data-corner]")) {
  button.addEventListener("click", () => window.timeTrackerApp.placeWindow(button.dataset.corner));
}

document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Reset the size, position, colors, font, and everything else to the defaults?")) {
    window.timeTrackerApp.resetSettings();
  }
});

// Fills a drop-down from a list of { key, label } sent by the main process.
function fillSelect(select, options) {
  for (const { key, label } of options) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    select.append(option);
  }
}

window.timeTrackerApp.getSettings().then(({ settings, fonts, sounds }) => {
  // The lists come from the main process, so each one is defined in one place only.
  fillSelect(fontSelect, fonts);
  fillSelect(alertSound, sounds);
  showSettings(settings);
});
// Also fires when I change the main window itself, for example by dragging its edge.
window.timeTrackerApp.onSettingsChanged(showSettings);
