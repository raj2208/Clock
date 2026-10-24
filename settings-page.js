const opacitySlider = document.getElementById("opacity");
const opacityValue = document.getElementById("opacity-value");
const widthSlider = document.getElementById("width");
const widthValue = document.getElementById("width-value");
const backgroundColor = document.getElementById("backgroundColor");
const textColor = document.getElementById("textColor");
const fontSelect = document.getElementById("font");
const hour12 = document.getElementById("hour12");
const timerMinutes = document.getElementById("timerMinutes");

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
  // Don't overwrite the number while I am in the middle of typing it.
  if (document.activeElement !== timerMinutes) timerMinutes.value = settings.timerMinutes;
}

// Each control sends its change to the main process, which checks it, applies it to the
// clock, and saves it. The main process then sends the settings back (see the bottom).
function send(partial) {
  window.clockApp.updateSettings(partial);
}

opacitySlider.addEventListener("input", () => send({ opacity: Number(opacitySlider.value) / 100 }));
widthSlider.addEventListener("input", () => send({ width: Number(widthSlider.value) }));
backgroundColor.addEventListener("input", () => send({ backgroundColor: backgroundColor.value }));
textColor.addEventListener("input", () => send({ textColor: textColor.value }));
fontSelect.addEventListener("change", () => send({ font: fontSelect.value }));
hour12.addEventListener("change", () => send({ hour12: hour12.checked }));
timerMinutes.addEventListener("input", () => {
  // An empty box while typing is not a number yet: wait for a real one.
  if (timerMinutes.value !== "") send({ timerMinutes: Number(timerMinutes.value) });
});
// When I leave the box, show the real saved value (for example 99 if I typed 500).
timerMinutes.addEventListener("blur", () => window.clockApp.getSettings().then(({ settings }) => showSettings(settings)));

for (const button of document.querySelectorAll("[data-corner]")) {
  button.addEventListener("click", () => window.clockApp.placeWindow(button.dataset.corner));
}

document.getElementById("reset").addEventListener("click", () => {
  if (confirm("Reset the size, position, colors, font, and everything else to the defaults?")) {
    window.clockApp.resetSettings();
  }
});

window.clockApp.getSettings().then(({ settings, fonts }) => {
  // The list of fonts comes from the main process, so it is defined in one place only.
  for (const font of fonts) {
    const option = document.createElement("option");
    option.value = font.key;
    option.textContent = font.label;
    fontSelect.append(option);
  }
  showSettings(settings);
});
// Also fires when I change the clock itself, for example by dragging its edge.
window.clockApp.onSettingsChanged(showSettings);
