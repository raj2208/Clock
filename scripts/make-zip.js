// Zips the packaged app so it can be uploaded to a GitHub Release (Step 11) and installed
// with Homebrew (Step 12). Run "pnpm package" first, or just run: pnpm dist
//
// Makes two files in out/:
//   Time-Tracker-<version>-arm64.zip          the app
//   Time-Tracker-<version>-arm64.zip.sha256   its checksum, which Homebrew uses to check the download
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { version } = require("../package.json");

const OUT = path.join(__dirname, "..", "out");
const APP_FOLDER = path.join(OUT, "Time Tracker-darwin-arm64");
const ZIP_NAME = `Time-Tracker-${version}-arm64.zip`;
const ZIP_PATH = path.join(OUT, ZIP_NAME);

if (!fs.existsSync(path.join(APP_FOLDER, "Time Tracker.app"))) {
  console.error("There is no Time Tracker.app to zip yet. Run: pnpm package");
  process.exit(1);
}

fs.rmSync(ZIP_PATH, { force: true });

// "ditto" is the macOS tool for this. A plain "zip" can break the symbolic links (shortcuts)
// inside Electron's frameworks, which leaves an app that will not open.
//   -c -k           make a zip archive
//   --keepParent    keep "Time Tracker.app" as the top folder inside the zip
//   --sequesterRsrc keep macOS file extras (resource forks) in a way unzipping restores
execFileSync("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", path.join(APP_FOLDER, "Time Tracker.app"), ZIP_PATH], { stdio: "inherit" });

const checksum = crypto.createHash("sha256").update(fs.readFileSync(ZIP_PATH)).digest("hex");
// Same format as the "shasum -a 256" command, so either tool can check it.
fs.writeFileSync(`${ZIP_PATH}.sha256`, `${checksum}  ${ZIP_NAME}\n`);

const megabytes = (fs.statSync(ZIP_PATH).size / 1024 / 1024).toFixed(1);
console.log(`Made out/${ZIP_NAME} (${megabytes} MB)`);
console.log(`SHA-256: ${checksum}`);
