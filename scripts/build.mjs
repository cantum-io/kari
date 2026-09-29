// Kari build — esbuild bundles for MV3. `node scripts/build.mjs [--watch]`
import { build, context } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("..", import.meta.url)); // not .pathname: "~" in a folder name is %7E there
const out = path.join(root, "extension");
const gen = path.join(root, "src/worklet/generated");
fs.mkdirSync(gen, { recursive: true });

// 1) Signalsmith: extract the Emscripten factory from the npm bundle (it is written for worklets already).
{
  const src = fs.readFileSync(path.join(root, "node_modules/signalsmith-stretch/SignalsmithStretch.mjs"), "utf8");
  const cut = src.indexOf("function registerWorkletProcessor");
  let body = src.slice(0, cut).replace(/^let module = \{\}, exports = \{\};/, "");
  body = body.replace(/if \(typeof exports === 'object' && typeof module === 'object'\)[\s\S]*$/, "");
  fs.writeFileSync(path.join(gen, "signalsmith-core.js"), "// generated from signalsmith-stretch@1.3.2 (MIT). Do not edit.\nvar module = {}, exports = {};\n" + body + "\nexport default SignalsmithStretch;\n");
}

// 2) Licence texts ship inside the package (GPL-2.0 §1: keep notices with every copy)
fs.copyFileSync(path.join(root, "LICENSE"), path.join(out, "LICENSE"));
fs.copyFileSync(path.join(root, "THIRD-PARTY-NOTICES.txt"), path.join(out, "THIRD-PARTY-NOTICES.txt"));

// 3) Rubber Band wasm → extension root (web_accessible_resource)
fs.copyFileSync(path.join(root, "node_modules/rubberband-wasm/dist/rubberband.wasm"), path.join(out, "rubberband.wasm"));

// Build stamp: package version + a hash of everything that shapes the bundle. No clock, no git state, so the same
// source always builds byte-identical files. That is what lets extension/ be committed and CI prove it matches.
const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
function sourceHash() {
  const h = createHash("sha256");
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach((e) => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== "generated") walk(f); } else { h.update(path.relative(root, f)); h.update(fs.readFileSync(f)); }
  });
  walk(path.join(root, "src"));
  for (const f of ["scripts/build.mjs", "package-lock.json"]) { h.update(f); h.update(fs.readFileSync(path.join(root, f))); }
  return h.digest("hex").slice(0, 8);
}
const stamp = process.argv.includes("--watch") ? "dev" : `${pkgJson.version}+${sourceHash()}`;
const common = { bundle: true, sourcemap: false, target: ["chrome120"], legalComments: "eof", logLevel: "info", define: { "process.env.NODE_ENV": '"production"', __KARI_BUILD__: JSON.stringify(stamp) } };
const entries = [
  { entryPoints: [path.join(root, "src/content/index.ts")], outfile: path.join(out, "content.js"), format: "iife" },
  { entryPoints: [path.join(root, "src/worklet/processor.js")], outfile: path.join(out, "worklet.js"), format: "iife" },
  { entryPoints: [path.join(root, "src/background/sw.ts")], outfile: path.join(out, "sw.js"), format: "esm" },
  { entryPoints: [path.join(root, "src/options/options.ts")], outfile: path.join(out, "options.js"), format: "iife" },
];

const watch = process.argv.includes("--watch");
for (const e of entries) {
  const opts = { ...common, ...e, minify: !watch };
  if (watch) { const c = await context(opts); await c.watch(); } else await build(opts);
}
// stamp version from package.json into manifest
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const mfPath = path.join(out, "manifest.json");
const mf = JSON.parse(fs.readFileSync(mfPath, "utf8"));
if (mf.version !== pkg.version) { mf.version = pkg.version; fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + "\n"); }
console.log(watch ? "watching…" : "built extension/");
