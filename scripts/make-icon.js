// Turns assets/icon.svg into assets/icon.icns, the icon format macOS uses.
// Run it with: pnpm icon
//
// Electron draws the SVG (it is a browser, so it can), and two tools that come with
// macOS do the rest: `sips` makes the different sizes and `iconutil` bundles them.
const { app, BrowserWindow } = require("electron");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "assets", "icon.svg");
const OUTPUT = path.join(ROOT, "assets", "icon.icns");

// The sizes macOS expects inside an icon, each with a sharper "@2x" version for Retina screens.
const SIZES = [16, 32, 128, 256, 512];

async function drawBigPng() {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    useContentSize: true,
    show: false,
    // Transparent, so the corners outside the rounded square stay see-through.
    transparent: true,
    frame: false,
    backgroundColor: "#00000000",
  });
  await win.loadFile(SOURCE);
  const image = await win.webContents.capturePage();
  win.destroy();
  // A Retina screen captures at double size, so shrink to exactly 1024 x 1024.
  return image.resize({ width: 1024, height: 1024, quality: "best" });
}

async function main() {
  await app.whenReady();
  const big = await drawBigPng();

  // Check that the corners are really transparent, and the middle is not.
  const { width } = big.getSize();
  const pixels = big.toBitmap();
  const alphaAt = (x, y) => pixels[(y * width + x) * 4 + 3];
  if (alphaAt(2, 2) !== 0 || alphaAt(512, 200) === 0) {
    throw new Error(`Transparency is wrong (corner alpha ${alphaAt(2, 2)}, middle alpha ${alphaAt(512, 200)})`);
  }

  const work = fs.mkdtempSync(path.join(os.tmpdir(), "time-tracker-icon-"));
  const bigPath = path.join(work, "big.png");
  const iconset = path.join(work, "TimeTracker.iconset");
  fs.mkdirSync(iconset);
  fs.writeFileSync(bigPath, big.toPNG());

  for (const size of SIZES) {
    for (const scale of [1, 2]) {
      const pixelSize = size * scale;
      const name = scale === 1 ? `icon_${size}x${size}.png` : `icon_${size}x${size}@2x.png`;
      execFileSync("sips", ["-z", String(pixelSize), String(pixelSize), bigPath, "--out", path.join(iconset, name)], { stdio: "ignore" });
    }
  }

  execFileSync("iconutil", ["-c", "icns", iconset, "-o", OUTPUT]);
  fs.rmSync(work, { recursive: true });
  console.log(`Made ${path.relative(ROOT, OUTPUT)} (${fs.statSync(OUTPUT).size} bytes)`);
}

main()
  .then(() => app.exit(0))
  .catch((error) => {
    console.error("Making the icon failed:", error);
    app.exit(1);
  });
