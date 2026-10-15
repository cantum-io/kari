#!/usr/bin/env node
// SoundCloud graph guard — dev script, never shipped in the extension.
//
// Kari's SoundCloud hook (route 0) patches AudioContext.prototype.createMediaElementSource
// and AudioNode.prototype.connect in the MAIN world at document_start, so SoundCloud's own
// source node is wired through Kari's worklet. That only works while SoundCloud's player
// bundle still makes those calls the way it did when the hook was written.
//
// This script downloads the current bundle, hashes it, and runs a set of named probes
// (regexes with expected counts and one ordering rule) against the chunk that builds the
// audio graph. It fails loudly (exit 1) when a hooked call moves or vanishes.
//
// Everything downloaded is SoundCloud's code: it stays in ./cache (gitignored), is never
// copied into Kari, and is treated as data. Only hashes, counts and offsets are recorded
// in baseline.json.
//
// Usage:
//   node tools/soundcloud-guard/check.mjs            fast path: hash + probes
//   node tools/soundcloud-guard/check.mjs --rea      also run REA analyze + compare on the player module
//   node tools/soundcloud-guard/check.mjs --update   accept the current bundle as the new baseline
//   node tools/soundcloud-guard/check.mjs --strict   a changed-but-passing bundle exits 3 instead of 0
//
// Exit codes: 0 ok · 1 a probe failed (hook is at risk) · 2 fetch/parse failure · 3 changed bundle under --strict

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "cache");
const baselinePath = join(here, "baseline.json");
const args = new Set(process.argv.slice(2));
const UPDATE = args.has("--update");
const REA = args.has("--rea");
const STRICT = args.has("--strict");
// --probe-file <path>: run the probes against a local chunk instead of fetching (offline use and self-test)
const probeFileIdx = process.argv.indexOf("--probe-file");
const PROBE_FILE = probeFileIdx > 0 ? process.argv[probeFileIdx + 1] : null;

const PAGE_URL = "https://soundcloud.com/discover";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
const ASSET_RE = /https:\/\/a-v2\.sndcdn\.com\/assets\/[^"' ]+\.js/g;

// ---------------------------------------------------------------------------------------
// Probes. Each is a fact Kari's hook depends on, phrased as a pattern over the minified
// chunk with the count seen when the hook was designed. "min"/"max" bound the count.
// Identifiers are minified and may be renamed on any build, so patterns avoid them
// wherever the surrounding property names (which survive minification) are enough.
// ---------------------------------------------------------------------------------------
const PROBES = [
  {
    id: "source-call",
    why: "SoundCloud calls createMediaElementSource on a real AudioContext instance (prototype lookup, so the MAIN-world patch is hit)",
    re: /\.context\.createMediaElementSource\(/g,
    min: 1,
    max: 1,
  },
  {
    id: "source-method",
    why: "one base implementation plus the hls.js subclass override that waits for a DRM key session",
    re: /_createMediaElementSource=function\(/g,
    min: 2,
    max: 2,
  },
  {
    id: "source-connect",
    why: "the source node is connected into the pausePlay gain via AudioNode.prototype.connect (second patched call)",
    re: /\.connect\(this\._webAudioOrchestration\.gainNodes\.pausePlay\)/g,
    min: 1,
    max: 1,
  },
  {
    id: "gain-chain",
    why: "three GainNodes created and chained into destination: pausePlay -> seek -> glitchCoverup -> destination",
    re: /=\w+\.createGain\(\),\w+=\w+\.createGain\(\),\w+=\w+\.createGain\(\);return \w+\.connect\(\w+\),\w+\.connect\(\w+\),\w+\.connect\(\w+\.destination\),\{context:/g,
    min: 1,
    max: 1,
  },
  {
    id: "gain-names",
    why: "the three gains keep their roles (fades stay downstream of Kari)",
    re: /gainNodes:\{glitchCoverup:\w+,pausePlay:\w+,seek:\w+\}/g,
    min: 1,
    max: 1,
  },
  {
    id: "one-context",
    why: "exactly one lazily created AudioContext (a second context would split the graph)",
    re: /new (?:window\.)?(?:webkit)?AudioContext\b/g,
    min: 1,
    max: 1,
  },
  {
    id: "no-other-source-kinds",
    why: "no worklet, script processor, buffer or stream source in the player; a move to any of these bypasses route 0",
    re: /createMediaStreamSource|createBufferSource|AudioWorklet|ScriptProcessor|OfflineAudioContext/g,
    min: 0,
    max: 0,
  },
  {
    id: "rate-reset",
    why: "SoundCloud resets playbackRate to 1 when it (re)initialises the element; Kari's rate guard must keep re-applying",
    re: /\.playbackRate=1[,;]/g,
    min: 1,
    max: 3,
  },
  {
    id: "no-preserves-pitch",
    why: "SoundCloud does not touch preservesPitch today; if it starts, Kari's vinyl mode needs a guard",
    re: /preservesPitch/g,
    min: 0,
    max: 0,
  },
  {
    id: "crossorigin",
    why: "SoundCloud sets crossorigin=anonymous itself when the graph exists, so the source node is not CORS-muted",
    re: /setAttribute\("crossorigin","anonymous"\)/g,
    min: 1,
    max: 1,
  },
  {
    id: "drm-wait-guard",
    why: "the hls.js subclass only delays the source node while waiting for a key session (Firefox-only today)",
    re: /_waitingForKeySession\|\|/g,
    min: 1,
    max: 1,
  },
  {
    id: "element-create",
    why: "the media element is made with document.createElement in MediaElementManager, never new Audio(); route 1 hooks must target createElement",
    re: /this\._element=document\.createElement\(\w+\)/g,
    min: 1,
    max: 1,
  },
  {
    id: "no-new-audio",
    why: "no new Audio() anywhere in the chunk",
    re: /new (?:window\.)?Audio\(/g,
    min: 0,
    max: 0,
  },
  {
    id: "hls-attach",
    why: "hls.js attaches to the element after the base init that created the source node",
    re: /_hls\.attachMedia\(/g,
    min: 1,
    max: 1,
  },
  {
    id: "fade-ramp",
    why: "fades are linear gain ramps on SoundCloud's own gains (downstream of Kari, no action needed)",
    re: /linearRampToValueAtTime/g,
    min: 1,
    max: 1,
  },
  {
    id: "players-extend-base",
    why: "the two streaming players (own MSE and hls.js) both extend HTML5PlayerBase, so one hook covers both",
    re: /\}\(\w+\.HTML5PlayerBase\)/g,
    min: 2,
    max: 2,
  },
];

// Ordering rule: the createMediaElementSource call and the connect into pausePlay sit in
// the same small function. If they drift apart the hook's "connect redirect" assumption
// needs a second look.
const ORDER = { a: /\.context\.createMediaElementSource\(/, b: /\.connect\(this\._webAudioOrchestration\.gainNodes\.pausePlay\)/, maxGap: 600 };

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "*/*" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function runProbes(text) {
  const results = [];
  let allOk = true;
  for (const p of PROBES) {
    const matches = [...text.matchAll(p.re)];
    const count = matches.length;
    const ok = count >= p.min && count <= p.max;
    if (!ok) allOk = false;
    results.push({ id: p.id, count, min: p.min, max: p.max, ok, firstOffset: matches[0]?.index ?? null, why: p.why });
  }
  const ia = text.search(ORDER.a);
  const ib = text.search(ORDER.b);
  const orderOk = ia >= 0 && ib >= 0 && ib > ia && ib - ia <= ORDER.maxGap;
  if (!orderOk) allOk = false;
  results.push({ id: "source-then-connect", count: ia >= 0 && ib >= 0 ? ib - ia : -1, min: 1, max: ORDER.maxGap, ok: orderOk, firstOffset: ia, why: "createMediaElementSource is followed by the connect into pausePlay within the same function" });
  return { results, allOk };
}

// Find the webpack module (",function(e,t,r){" boundaries) that holds the base player, so REA
// can analyse a parseable 36 KB slice instead of the 2.9 MB chunk (which exhausts its heap).
function slicePlayerModule(text) {
  const anchor = text.indexOf("_createMediaElementSource=function(");
  if (anchor < 0) return null;
  const bounds = [];
  const re = /[,\[]function\(e,t,r\)\{/g;
  let m;
  while ((m = re.exec(text))) bounds.push(m.index + 1);
  let start = null;
  let end = null;
  for (const b of bounds) {
    if (b <= anchor) start = b;
    else if (end === null) end = b - 1;
  }
  if (start === null || end === null) return null;
  const body = text.slice(start, end).replace(/,\s*$/, "");
  return { start, end, source: `// slice of SoundCloud chunk, bytes ${start}-${end} (untrusted, not for Kari)\n(${body});\n` };
}

function reaCli(argv, cwd) {
  const env = { ...process.env };
  // REA supports node 22/24/26+. Prefer Homebrew's node@22 when present.
  const node22 = "/opt/homebrew/opt/node@22/bin";
  if (existsSync(node22)) env.PATH = `${node22}:${env.PATH}`;
  return spawnSync("npx", ["-y", "rea-agents@6.5.0", ...argv], { cwd, env, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

function reaAnalyze(sliceDir) {
  const r = reaCli(["analyze-javascript-application", sliceDir, "--source-path", "player-module.js", "--artifact-format", "directory", "--format", "json", "--full-output"], here);
  if (r.status !== 0) throw new Error(`rea analyze failed: ${(r.stderr || r.stdout || "").slice(0, 400)}`);
  return JSON.parse(r.stdout);
}

function pickEvidence(obj) {
  // Accept either a bare Evidence record or an envelope that wraps one.
  if (obj && typeof obj.evidence_id === "string" && obj.operation) return obj;
  for (const k of ["evidence", "result", "data"]) if (obj && obj[k]) { const e = pickEvidence(obj[k]); if (e) return e; }
  return null;
}

function reaCompare(leftEvidence, rightEvidence) {
  const inputPath = join(cacheDir, "compare-input.json");
  writeFileSync(inputPath, JSON.stringify({ left: leftEvidence, right: rightEvidence }));
  const r = reaCli(["compare-application-versions", inputPath, "--format", "json", "--full-output"], here);
  rmSync(inputPath, { force: true });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout); } catch { /* fall through */ }
  if (r.status !== 0 || !parsed?.ok) {
    const issues = parsed?.error?.details?.issues?.map((i) => i.message).join("; ") || (r.stderr || r.stdout || "").slice(0, 400);
    if (/must be distinct/i.test(issues)) return { identical: true, note: "baseline and current evidence are the same record; nothing to compare" };
    throw new Error(`rea compare failed: ${issues}`);
  }
  return parsed.data;
}

async function main() {
  mkdirSync(cacheDir, { recursive: true });
  const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : null;

  if (PROBE_FILE) {
    const text = readFileSync(PROBE_FILE, "utf8");
    console.log(`probe-file: ${PROBE_FILE} sha256 ${sha256(text)} ${text.length} chars`);
    const { results, allOk } = runProbes(text);
    for (const r of results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(22)} count=${String(r.count).padStart(4)} (want ${r.min}..${r.max})`);
    console.log(allOk ? "PASS probes hold on the local file" : "FAIL a probe did not hold on the local file");
    process.exit(allOk ? 0 : 1);
  }

  // 1. page -> script list
  let html;
  try {
    html = (await fetchText(PAGE_URL)).toString("utf8");
  } catch (e) {
    console.error(`FETCH FAIL ${e.message}`);
    process.exit(2);
  }
  const urls = [...new Set(html.match(ASSET_RE) || [])];
  if (urls.length === 0) {
    console.error("FETCH FAIL no a-v2.sndcdn.com/assets/*.js script tags in the page (markup changed?)");
    process.exit(2);
  }

  // 2. download every listed chunk, find the one(s) with the graph
  const chunks = [];
  for (const url of urls) {
    const name = url.split("/").pop();
    const buf = await fetchText(url);
    const hash = sha256(buf);
    const dir = join(cacheDir, hash);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, name);
    if (!existsSync(file)) writeFileSync(file, buf);
    const text = buf.toString("utf8");
    chunks.push({ url, name, hash, bytes: buf.length, text, hasGraph: text.includes("createMediaElementSource") });
  }
  const graphChunks = chunks.filter((c) => c.hasGraph);
  console.log(`page scripts: ${chunks.length}; chunks with createMediaElementSource: ${graphChunks.map((c) => c.name).join(", ") || "NONE"}`);
  if (graphChunks.length !== 1) {
    console.error(`FAIL expected exactly one chunk to build the audio graph, found ${graphChunks.length}`);
    process.exit(1);
  }
  const chunk = graphChunks[0];
  const unchanged = baseline && baseline.chunk.sha256 === chunk.hash;
  console.log(`graph chunk: ${chunk.name}  sha256 ${chunk.hash}  ${chunk.bytes} bytes  ${unchanged ? "UNCHANGED since baseline" : baseline ? `CHANGED (baseline was ${baseline.chunk.name})` : "no baseline yet"}`);

  // 3. probes (always run: a probe regression with the same hash is impossible, but running
  //    them keeps the script honest about what it checks)
  const { results, allOk } = runProbes(chunk.text);
  for (const r of results) {
    const flag = r.ok ? "ok  " : "FAIL";
    console.log(`  ${flag} ${r.id.padEnd(22)} count=${String(r.count).padStart(4)} (want ${r.min}..${r.max})${r.firstOffset !== null && r.firstOffset >= 0 ? ` @${r.firstOffset}` : ""}`);
    if (!r.ok) console.log(`       ${r.why}`);
  }

  // 4. optional REA pass on the player module slice
  let rea = null;
  if (REA) {
    try {
      const slice = slicePlayerModule(chunk.text);
      if (!slice) throw new Error("could not locate the player module for slicing");
      const sliceDir = join(cacheDir, chunk.hash, "slice");
      mkdirSync(sliceDir, { recursive: true });
      writeFileSync(join(sliceDir, "player-module.js"), slice.source);
      const current = reaAnalyze(sliceDir);
      const curEv = pickEvidence(current);
      writeFileSync(join(sliceDir, "evidence.json"), JSON.stringify(current));
      rea = { sliceBytes: [slice.start, slice.end], evidence_id: curEv?.evidence_id ?? null, artifact_sha256: curEv?.subject?.digest?.sha256 ?? null };
      console.log(`  rea  player module slice bytes ${slice.start}-${slice.end}; evidence ${rea.evidence_id ?? "(no id in output)"}`);
      const baseEvPath = baseline?.rea?.evidencePath ? join(here, baseline.rea.evidencePath) : null;
      if (baseEvPath && existsSync(baseEvPath) && !unchanged) {
        const baseEv = pickEvidence(JSON.parse(readFileSync(baseEvPath, "utf8")));
        if (baseEv && curEv) {
          const cmp = reaCompare(baseEv, curEv);
          if (cmp.identical) {
            console.log(`  rea  ${cmp.note}`);
          } else {
            const n = cmp?.normalized_result ?? cmp;
            const summary = n?.summary ?? n;
            console.log(`  rea  compare vs baseline: ${JSON.stringify(summary).slice(0, 800)}`);
            for (const k of ["added", "removed", "changed"]) if (Array.isArray(n?.[k]) && n[k].length) console.log(`  rea  ${k}: ${n[k].length} entit${n[k].length === 1 ? "y" : "ies"}`);
            rea.compare = summary;
          }
        }
      } else if (!unchanged) {
        console.log("  rea  no baseline evidence on disk (cache is gitignored); run --update --rea once to seed it");
      }
    } catch (e) {
      console.log(`  rea  WARN ${e.message} (REA explains changes; the probes above decide pass/fail)`);
    }
  }

  // 5. verdict
  if (!allOk) {
    console.error("FAIL one or more hooked calls moved or vanished. Do not ship a SoundCloud build until the hook is re-verified live.");
    process.exit(1);
  }
  if (UPDATE) {
    const next = {
      recorded: new Date().toISOString(),
      page: PAGE_URL,
      scripts: chunks.map((c) => ({ name: c.name, sha256: c.hash, bytes: c.bytes })),
      chunk: { name: chunk.name, sha256: chunk.hash, bytes: chunk.bytes },
      probes: results.map((r) => ({ id: r.id, count: r.count, firstOffset: r.firstOffset })),
      rea: rea ? { ...rea, evidencePath: `cache/${chunk.hash}/slice/evidence.json` } : baseline?.rea ?? null,
    };
    writeFileSync(baselinePath, JSON.stringify(next, null, 2) + "\n");
    console.log(`baseline written: ${baselinePath}`);
    process.exit(0);
  }
  if (!baseline) {
    console.log("PASS (no baseline yet; run with --update to record one)");
    process.exit(0);
  }
  if (unchanged) {
    console.log("PASS bundle unchanged, all probes hold");
    process.exit(0);
  }
  console.log("WARN BUNDLE CHANGED but every probe still holds. Re-verify the hook live, then run --update to accept.");
  process.exit(STRICT ? 3 : 0);
}

main().catch((e) => {
  console.error(`ERROR ${e.stack || e}`);
  process.exit(2);
});
