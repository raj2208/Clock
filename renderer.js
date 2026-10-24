const timeElement = document.getElementById("time");

function pad(number) {
  return String(number).padStart(2, "0");
}

function updateTime() {
  const now = new Date();
  timeElement.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

updateTime();
// Check four times a second instead of once, so the display never skips a second.
setInterval(updateTime, 250);
