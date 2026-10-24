// Turns assets/tray-icon.svg into the two PNG files used for the menu bar icon.
// Run it with: pnpm icon  (this also rebuilds the app icon)
//
// The file names end in "Template" on purpose: macOS treats such images as "template"
// images, which it recolors itself (white on a dark menu bar, black on a light one).
// The "@2x" file is the sharper version for Retina screens, and Electron picks it up
// automatically when it loads the plain file.
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ASSETS = path.join(__dirname, "..", "assets");
const SOURCE = path.join(ASSETS, "tray-icon.svg");

// Menu bar icons are about 18 points tall.
const OUTPUTS = [
  { name: "trayIconTemplate.png", size: 18 },
  { name: "trayIconTemplate@2x.png", size: 36 },
];

async function drawBigBitmap() {
  // Draw the SVG large first, then shrink it, so the edges stay smooth.
  const svg = fs.readFileSync(SOURCE, "utf8").replace('width="18" height="18"', 'width="144" height="144"');
  // Load it from a real file, like the app icon script does.
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "time-tracker-tray-"));
  const page = path.join(work, "tray.html");
  fs.writeFileSync(page, `<body style="margin:0;background:transparent">${svg}</body>`);

  const win = new BrowserWindow({
    width: 144,
    height: 144,
    useContentSize: true,
    show: false,
    transparent: true,
    frame: false,
    backgroundColor: "#00000000",
  });
  await win.loadFile(page);
  // A window that was never shown has not painted yet. Wait for two frames, then capture.
  await win.webContents.executeJavaScript("new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))");
  const image = await win.webContents.capturePage();
  win.destroy();
  fs.rmSync(work, { recursive: true });
  return image;
}

async function main() {
  await app.whenReady();
  const big = await drawBigBitmap();

  for (const { name, size } of OUTPUTS) {
    const small = big.resize({ width: size, height: size, quality: "best" });
    // The corner must be see-through, and the picture must be black, or macOS cannot recolor it.
    const pixels = small.toBitmap();
    const alphaAt = (x, y) => pixels[(y * size + x) * 4 + 3];
    const drawn = [];
    for (let i = 0; i < size * size; i++) if (pixels[i * 4 + 3] > 200) drawn.push(i);
    if (alphaAt(0, 0) !== 0 || drawn.length === 0) throw new Error(`${name}: wrong transparency`);
    const notBlack = drawn.filter((i) => pixels[i * 4] > 20 || pixels[i * 4 + 1] > 20 || pixels[i * 4 + 2] > 20);
    if (notBlack.length > 0) throw new Error(`${name}: ${notBlack.length} solid pixels are not black`);
    fs.writeFileSync(path.join(ASSETS, name), small.toPNG());
    console.log(`Made assets/${name} (${size}x${size})`);
  }
}

main()
  .then(() => app.exit(0))
  .catch((error) => {
    console.error("Making the menu bar icon failed:", error);
    app.exit(1);
  });
