// Test build for automation. `KARI_TEST_HOSTS=soundcloud npm run build`
//
// Runs after scripts/build.mjs and copies extension/ to test-build/<host>/ with the host's sites in host_permissions
// and its scripts registered statically in the manifest, so a headless browser never meets the optional-permission
// prompt (automation cannot click it). extension/ itself is never touched, and with the variable unset this script
// does nothing, so the production build stays byte-identical. Lives outside build.mjs on purpose: build.mjs is hashed
// into the build stamp, and any edit there would change every shipped file.
//
// test-build/ is gitignored. Never load it as the real extension: it asks for SoundCloud at install.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const want = (process.env.KARI_TEST_HOSTS || "").split(",").map((s) => s.trim()).filter(Boolean);
if (!want.length) process.exit(0);

const root = fileURLToPath(new URL("..", import.meta.url)); // not .pathname: "~" in a folder name is %7E there
const src = path.join(root, "extension");

// Per host: the sites, and the scripts the shipped build registers at runtime once the user grants the optional
// permission. The test build lists the same files statically. A file that does not exist is skipped with a
// warning; keep these names in step with src/background/sw.ts.
const HOSTS = {
  soundcloud: {
    sites: ["https://soundcloud.com/*"],
    scripts: [
      { id: "kari-sc-hook", js: ["sc-hook.js"], world: "MAIN", run_at: "document_start" },
      { id: "kari-sc-bridge", js: ["sc-bridge.js"], run_at: "document_start" },
    ],
  },
};

for (const name of want) {
  const h = HOSTS[name];
  if (!h) { console.error(`KARI_TEST_HOSTS: unknown host "${name}" (known: ${Object.keys(HOSTS).join(", ")})`); process.exit(1); }
  const out = path.join(root, "test-build", name);
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(src, out, { recursive: true });

  const mf = JSON.parse(fs.readFileSync(path.join(out, "manifest.json"), "utf8"));
  const onSite = (m) => h.sites.includes(m);
  mf.host_permissions = [...new Set([...(mf.host_permissions || []), ...h.sites])];
  if (mf.optional_host_permissions) {
    mf.optional_host_permissions = mf.optional_host_permissions.filter((m) => !onSite(m));
    if (!mf.optional_host_permissions.length) delete mf.optional_host_permissions;
  }
  mf.content_scripts = mf.content_scripts || [];
  const already = new Set(mf.content_scripts.filter((c) => (c.matches || []).some(onSite)).flatMap((c) => c.js || []));
  const registered = [], missing = [];
  for (const s of h.scripts) {
    const js = s.js.filter((f) => !already.has(f));
    if (!js.length) { registered.push(...s.js.map((f) => f + " (manifest)")); continue; }
    const absent = js.filter((f) => !fs.existsSync(path.join(out, f)));
    if (absent.length) { missing.push(...absent); continue; }
    const cs = { matches: h.sites, js, run_at: s.run_at };
    if (s.world) cs.world = s.world;
    mf.content_scripts.push(cs);
    registered.push(...js.map((f) => f + (s.world ? ` (${s.world}, ${s.run_at})` : ` (${s.run_at})`)));
  }
  // The engine's worklet and WASM are fetched from the page's AudioContext on these sites.
  for (const war of mf.web_accessible_resources || []) war.matches = [...new Set([...(war.matches || []), ...h.sites])];
  mf.name = mf.name + " (test build: " + name + ")";
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(mf, null, 2) + "\n");

  console.log(`test build: test-build/${name}/  hosts ${h.sites.join(" ")}`);
  console.log(`  scripts registered: ${registered.length ? registered.join(", ") : "none"}`);
  if (missing.length) console.warn(`  WARN not built yet, skipped: ${missing.join(", ")}`);
}
