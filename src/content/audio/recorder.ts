// Kari — a take. Main-thread side of the recorder: a "kari-recorder" worklet node hangs off the chain's meeting point
// (the analyser before the output), its chunks are written straight into a WavWriter, and every move (pitch, speed,
// key lock, loops, seeks, holds) is logged against the audio clock. Held stretches (the video paused, an ad, a seek)
// are cut out of the take frame-accurately, not recorded as silence. Works in the content world (YouTube) and in the
// SoundCloud hook's MAIN world alike: it only needs the context and the tap node.
//
// Time: every mark is taken at the context's frame counter on the main thread (ctx.currentTime × sampleRate) and
// turned into a take frame once the file closes, when the first chunk has said which context frame the take began
// on and every hold is closed: takeFrame = ctxFrame − start − (held frames before ctxFrame). A mark inside a hold
// lands on the cut. The worklet's chunk stamps are checked for continuity; a jump counts as dropped frames.

import { WavWriter, wavBlob, wavBytes } from "../../shared/wav";
import type { Params } from "../../shared/math";

export type MoveKind = "start" | "params" | "loop" | "seek" | "hold" | "resume" | "stop";
export type TakeMove = { frame: number; t: number; kind: MoveKind; data?: Record<string, unknown> };
export type TakeMeta = { site?: string; track?: string; title?: string; build?: string; params: Params };
export type TakeLog = {
  version: 1; kari: string; startedAt: string; site?: string; track?: string; title?: string;
  sampleRate: number; channels: number; bits: number; frames: number; seconds: number; dropped: number; peak: number;
  params: Params; moves: TakeMove[];
};
export type Take = { wav: Blob; bytes: number; log: TakeLog; frames: number; seconds: number; sampleRate: number; channels: number; peak: number; dropped: number; startedAt: string };

type Chunk = { type: "chunk"; frame: number; frames: number; peak: number; data: Float32Array[] };
type Hold = { from: number; to: number };   // context frames, `to` Infinity while open

export const MAX_TAKE_SECONDS = 60 * 60;   // an hour: 1.04 GB at 48 kHz stereo 24-bit, well under the RIFF limit and a sane memory cap

export const fmtMove = (m: TakeMove): string => {
  const d = (m.data || {}) as Record<string, any>;
  switch (m.kind) {
    case "params": return `pitch ${d.st >= 0 ? "+" : ""}${d.st} st${d.cents ? ` ${d.cents >= 0 ? "+" : ""}${d.cents} c` : ""} · ${(1 + (d.tempo || 0) / 100).toFixed(2)}×${d.keyLock ? " · key lock" : ""}`;
    case "loop": return d.beats ? `loop ${d.beats} beat${d.beats === 1 ? "" : "s"}` : "loop off";
    case "seek": return `seek ${typeof d.to === "number" ? d.to.toFixed(2) + " s" : ""}`.trim();
    default: return m.kind;
  }
};

export class Recorder {
  private node: AudioWorkletNode | null = null;
  private writer: WavWriter | null = null;
  private marks: { ctx: number; kind: MoveKind; data?: Record<string, unknown> }[] = [];
  private holds: Hold[] = [];
  private startFrame = -1;        // context frame of the first recorded sample (from the first chunk)
  private expect = -1;            // next chunk's context frame, for continuity
  private _dropped = 0; private _peak = 0;
  private startedAt = "";
  private flushed: { resolve: () => void } | null = null;
  private lastParams = "";
  private closed = false;

  constructor(private ctx: AudioContext, private tap: AudioNode, private meta: TakeMeta, private opts: { chunkFrames?: number; onProgress?: (frames: number, peak: number) => void } = {}) {}

  get on() { return !!this.node && !this.closed; }
  get holding() { const h = this.holds[this.holds.length - 1]; return !!h && h.to === Infinity; }
  get frames() { return this.writer ? this.writer.frames : 0; }
  get seconds() { return this.writer ? this.writer.seconds : 0; }
  get dropped() { return this._dropped; }
  get peak() { return this._peak; }
  get full() { return !!this.writer && (this.writer.full || this.writer.seconds >= MAX_TAKE_SECONDS); }

  /** Context frame now, as the main thread sees it. */
  private now() { return Math.round(this.ctx.currentTime * this.ctx.sampleRate); }

  start() {
    if (this.node) return;
    this.startedAt = new Date().toISOString();
    this.writer = new WavWriter({ sampleRate: this.ctx.sampleRate, channels: 2, bits: 24 });
    // Armed through processorOptions, not a message: the node records from its first render quantum.
    const node = new AudioWorkletNode(this.ctx, "kari-recorder", {
      numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2, channelCountMode: "explicit", channelInterpretation: "speakers",
      processorOptions: { chunkFrames: this.opts.chunkFrames, on: true },
    });
    node.port.onmessage = (e) => this.onMessage(e.data);
    this.tap.connect(node);
    this.node = node;
    this.lastParams = JSON.stringify(this.meta.params);
    this.mark("start", { ...this.meta.params });
  }

  /** Log a move at the audio clock. Params are logged only when they changed. */
  mark(kind: MoveKind, data?: Record<string, unknown>) {
    if (!this.node || this.closed) return;
    if (kind === "params") { const key = JSON.stringify(data); if (key === this.lastParams) return; this.lastParams = key; }
    this.marks.push({ ctx: this.now(), kind, data });
  }
  /** Stop keeping frames (paused, an ad, a seek in flight). Frame-accurate from the clock read here. */
  hold() { if (!this.node || this.closed || this.holding) return; this.holds.push({ from: this.now(), to: Infinity }); this.mark("hold"); }
  resume() { if (!this.node || this.closed || !this.holding) return; this.holds[this.holds.length - 1].to = this.now(); this.mark("resume"); }

  private onMessage(m: any) {
    if (!m || typeof m !== "object") return;
    if (m.type === "chunk") this.onChunk(m as Chunk);
    else if (m.type === "flushed" && this.flushed) { const f = this.flushed; this.flushed = null; f.resolve(); }
  }
  private onChunk(c: Chunk) {
    const w = this.writer; if (!w || this.closed) return;
    if (this.startFrame < 0) this.startFrame = c.frame;
    if (this.expect >= 0 && c.frame !== this.expect) this._dropped += Math.max(0, c.frame - this.expect);
    this.expect = c.frame + c.frames;
    if (c.peak > this._peak) this._peak = c.peak;
    // Keep the frames outside every hold. Holds are in order and never overlap (hold() refuses while holding).
    let a = c.frame; const end = c.frame + c.frames;
    for (const h of this.holds) {
      if (h.to <= a) continue;
      if (h.from >= end) break;
      if (h.from > a) this.put(c, a - c.frame, h.from - c.frame);
      a = Math.max(a, h.to);
      if (a >= end) break;
    }
    if (a < end) this.put(c, a - c.frame, end - c.frame);
    this.opts.onProgress?.(w.frames, c.peak);
  }
  private put(c: Chunk, from: number, to: number) {
    const w = this.writer!; if (to <= from || this.full) return;
    const n = Math.min(to - from, Math.round(MAX_TAKE_SECONDS * this.ctx.sampleRate) - w.frames);
    if (n > 0) w.write(c.data.map(d => d.subarray(from, from + n)), n);
  }

  /** Stop, wait for the worklet's last partial chunk, close the file. Resolves to the take. */
  async stop(): Promise<Take> {
    const node = this.node, w = this.writer;
    if (!node || !w) throw new Error("not recording");
    if (this.closed) throw new Error("stopped");
    if (this.holding) this.resume();
    const stopCtx = this.now();
    await new Promise<void>((resolve) => {
      this.flushed = { resolve };
      node.port.postMessage({ type: "rec", on: false });
      setTimeout(() => { if (this.flushed) { this.flushed = null; resolve(); } }, 1500);   // a dead port never answers
    });
    this.closed = true;
    try { this.tap.disconnect(node); } catch (_) { /* already gone */ }
    try { node.port.postMessage({ type: "close" }); } catch (_) { /* port closed */ }
    node.port.onmessage = null; this.node = null;
    this.marks.push({ ctx: stopCtx, kind: "stop" });
    const start = this.startFrame >= 0 ? this.startFrame : stopCtx;
    const moves: TakeMove[] = this.marks.map(m => {
      const frame = Math.max(0, Math.min(w.frames, this.takeFrame(m.ctx, start)));
      return { frame, t: +(frame / this.ctx.sampleRate).toFixed(4), kind: m.kind, ...(m.data ? { data: m.data } : {}) };
    });
    for (const m of moves) if (m.kind === "params" || m.kind === "loop" || m.kind === "seek") w.cue(fmtMove(m), m.frame);
    const parts = w.finish();
    const log: TakeLog = {
      version: 1, kari: this.meta.build || "", startedAt: this.startedAt, site: this.meta.site, track: this.meta.track, title: this.meta.title,
      sampleRate: this.ctx.sampleRate, channels: 2, bits: 24, frames: w.frames, seconds: +w.seconds.toFixed(4), dropped: this._dropped, peak: +this._peak.toFixed(6),
      params: this.meta.params, moves,
    };
    return { wav: wavBlob(parts), bytes: wavBytes(parts), log, frames: w.frames, seconds: w.seconds, sampleRate: this.ctx.sampleRate, channels: 2, peak: this._peak, dropped: this._dropped, startedAt: this.startedAt };
  }
  private takeFrame(ctxFrame: number, start: number) {
    let held = 0;
    for (const h of this.holds) {
      if (h.from >= ctxFrame) break;
      held += Math.min(h.to, ctxFrame) - h.from;
    }
    return ctxFrame - start - held;
  }
}

const pad2 = (n: number) => String(n).padStart(2, "0");
/** `kari-2026-11-03-14-05-<track>-+2st-0.94x` */
export function takeName(take: Take): string {
  const d = new Date(take.startedAt), p = take.log.params;
  const stamp = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-${pad2(d.getHours())}-${pad2(d.getMinutes())}`;
  const track = (take.log.title || take.log.track || "take").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "take";
  return `kari-${stamp}-${track}-${p.st >= 0 ? "+" : ""}${p.st}st-${(1 + p.tempo / 100).toFixed(2)}x`;
}

/** Hand the take to the browser's downloads as two files, no `downloads` permission needed. */
export function downloadTake(take: Take, name = takeName(take)) {
  const save = (blob: Blob, file: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = file; a.rel = "noopener"; a.style.display = "none";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  save(take.wav, `${name}.wav`);
  save(new Blob([JSON.stringify(take.log, null, 2)], { type: "application/json" }), `${name}.moves.json`);
}
