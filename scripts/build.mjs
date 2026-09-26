// Mimi build — esbuild bundles for MV3. `node scripts/build.mjs [--watch]`
import { build, context } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
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

// 2) Rubber Band wasm → extension root (web_accessible_resource)
fs.copyFileSync(path.join(root, "node_modules/rubberband-wasm/dist/rubberband.wasm"), path.join(out, "rubberband.wasm"));

const common = { bundle: true, sourcemap: false, target: ["chrome120"], legalComments: "none", logLevel: "info", define: { "process.env.NODE_ENV": '"production"' } };
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
