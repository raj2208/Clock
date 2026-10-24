// Packages the clock into a real Mac app: out/Clock-darwin-arm64/Clock.app
// Run it with: pnpm package
const { execFileSync } = require("child_process");
const { packager } = require("@electron/packager");
const { version, author } = require("../package.json");

// Only the files the app needs go inside the finished app. Everything else (my notes,
// git history, local skills, earlier builds) is left out. Each pattern is matched against
// the path inside the project, starting with "/".
const LEFT_OUT = [
  // The app has no runtime dependencies: everything it needs is built into Electron.
  // node_modules only holds build tools (Electron itself, this packager), which must
  // not be copied into the app. If I ever add a real dependency (a package listed under
  // "dependencies" in package.json), this line must go, and pnpm needs
  // "nodeLinker: hoisted" in pnpm-workspace.yaml so the packager can find it.
  /^\/node_modules($|\/)/,
  /^\/docs($|\/)/,
  /^\/out($|\/)/,
  /^\/scripts($|\/)/,
  /^\/\.git($|\/)/,
  /^\/\.gitignore$/,
  /^\/\.agents($|\/)/,
  /^\/\.claude($|\/)/,
  /^\/README\.md$/,
  /^\/pnpm-lock\.yaml$/,
  /^\/pnpm-workspace\.yaml$/,
];

// Renaming the app breaks the signature it was shipped with, so macOS can no longer
// verify it. This signs everything inside the app again with an "ad-hoc" signature
// ("-"): it needs no Apple account, and it makes the signature consistent.
//
// It is NOT an Apple Developer signature, so other people's Macs will still show a
// warning when they open the app (Step 13 in the roadmap).
//
// The hardened runtime (the "--options runtime" flag) is left off on purpose. Apple
// requires it for notarization, but it only lets an app load code signed by the same Team
// ID. An ad-hoc signature has no Team ID, so with it on, the app cannot even load its own
// Electron framework and fails to start. Turn it on in Step 13, with a real identity.
function signAdHoc(appPath) {
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], { stdio: "inherit" });
}

async function main() {
  const outputPaths = await packager({
    dir: ".",
    out: "out",
    name: "Clock",
    // Apple Silicon Macs only, for now.
    platform: "darwin",
    arch: "arm64",
    // Replace an earlier build instead of stopping.
    overwrite: true,
    // Pack the app's files into a single archive file (app.asar) instead of loose files.
    asar: true,
    // Skip the "remove unused dependencies" step. It can't follow pnpm's folder layout,
    // and there is nothing to remove, because node_modules is left out above.
    prune: false,
    appBundleId: "com.raj2208.clock",
    appVersion: version,
    appCopyright: `Copyright © 2026 ${author}`,
    ignore: LEFT_OUT,
  });

  console.log("Built:");
  for (const outputPath of outputPaths) {
    const appPath = `${outputPath}/Clock.app`;
    signAdHoc(appPath);
    console.log(`  ${appPath} (signed ad-hoc)`);
  }
}

main().catch((error) => {
  console.error("Packaging failed:", error);
  process.exit(1);
});
