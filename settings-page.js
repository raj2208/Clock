const opacitySlider = document.getElementById("opacity");
const opacityValue = document.getElementById("opacity-value");
const widthSlider = document.getElementById("width");
const widthValue = document.getElementById("width-value");

// Shows the given settings in the controls.
function showSettings(settings) {
  opacitySlider.value = Math.round(settings.opacity * 100);
  opacityValue.textContent = `${Math.round(settings.opacity * 100)}%`;
  widthSlider.value = settings.width;
  widthValue.textContent = `${settings.width} px`;
}

// The sliders send each change to the main process, which applies it to the clock
// and saves it. The main process then sends the settings back (see below).
opacitySlider.addEventListener("input", () => {
  window.clockApp.updateSettings({ opacity: Number(opacitySlider.value) / 100 });
});

widthSlider.addEventListener("input", () => {
  window.clockApp.updateSettings({ width: Number(widthSlider.value) });
});

for (const button of document.querySelectorAll("[data-corner]")) {
  button.addEventListener("click", () => window.clockApp.placeWindow(button.dataset.corner));
}

window.clockApp.getSettings().then(({ settings }) => showSettings(settings));
// Also fires when I change the clock itself, for example by dragging its edge.
window.clockApp.onSettingsChanged(showSettings);
