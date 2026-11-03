// Kari — WAV writer. Pure, streaming, no DOM: encodes PCM as each chunk arrives, writes the exact RIFF sizes at the
// end, carries cue markers (the take's moves) and refuses to pass the RIFF 4 GB limit rather than write a corrupt
// file. Layout: RIFF · fmt (PCM tag 1, 16 or 24 bit) · data · cue · LIST/adtl/labl. Tag-1 24-bit PCM is what every
// editor and Chrome's own decoder read (Audacity, Logic, Ableton, ffmpeg, sox); WAVE_FORMAT_EXTENSIBLE is only needed
// past two channels. Samples: round(x × 2^(bits−1)) clipped to the integer range, so −1.0 is exact, +1.0 lands on the
// top code, and any float in (−1, 1) round-trips within half a step (24 bit: 6e−8). NaN writes a 0, never garbage.
// Node runs the tests straight from this file: nothing here touches the browser.

export type WavBits = 16 | 24;
export type WavSpec = { sampleRate: number; channels: number; bits?: WavBits };
export type WavCue = { frame: number; label: string };

const RIFF_MAX = 0xffffffff;     // a RIFF chunk size is 32 bits
const CUE_RESERVE = 1 << 17;     // bytes kept free for the cue and label chunks (MAX_CUES × (24 + 8 + 4 + MAX_LABEL + 2) < 131072)
export const MAX_CUES = 1024;
export const MAX_LABEL = 64;     // bytes of UTF-8 per label
export const HEADER_BYTES = 44;

const ascii = (dv: DataView, o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
const utf8 = (s: string): Uint8Array => {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
  const out: number[] = []; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c < 128) out.push(c); else out.push(63); } return Uint8Array.from(out);
};

/** Clip a UTF-8 label to MAX_LABEL bytes without cutting a multi-byte character in half. */
export function clipLabel(label: string): Uint8Array {
  let b = utf8(String(label).replace(/[\u0000-\u001f]/g, " "));
  if (b.length <= MAX_LABEL) return b;
  let n = MAX_LABEL; while (n > 0 && (b[n] & 0xc0) === 0x80) n--;   // step back to a character boundary
  return b.subarray(0, n);
}

export class WavWriter {
  readonly sampleRate: number; readonly channels: number; readonly bits: WavBits; readonly blockAlign: number;
  /** The most frames this file can hold under the RIFF size limit, cues included. */
  readonly maxFrames: number;
  private parts: Uint8Array[] = [];
  private _frames = 0;
  private cues: WavCue[] = [];
  private finished = false;

  constructor(spec: WavSpec) {
    const sr = Math.round(spec.sampleRate), ch = Math.round(spec.channels), bits = spec.bits ?? 24;
    if (!Number.isFinite(sr) || sr < 8000 || sr > 384000) throw new RangeError(`sample rate ${spec.sampleRate}`);
    if (!Number.isFinite(ch) || ch < 1 || ch > 2) throw new RangeError(`channels ${spec.channels}`);
    if (bits !== 16 && bits !== 24) throw new RangeError(`bits ${bits}`);
    this.sampleRate = sr; this.channels = ch; this.bits = bits; this.blockAlign = ch * (bits / 8);
    this.maxFrames = Math.floor((RIFF_MAX - HEADER_BYTES - 1 - CUE_RESERVE) / this.blockAlign);
  }

  get frames() { return this._frames; }
  get seconds() { return this._frames / this.sampleRate; }
  get full() { return this._frames >= this.maxFrames; }
  /** Bytes the file would be if finished now, cues aside. */
  get bytes() { return HEADER_BYTES + this._frames * this.blockAlign; }
  get cueCount() { return this.cues.length; }

  /**
   * Append `frames` frames. `input` holds one array per channel; a missing channel repeats the last one given (a mono
   * source into a stereo file), an empty input writes silence. Returns the frames written: fewer than asked only when
   * the file is full, never a partial frame.
   */
  write(input: ArrayLike<number>[], frames?: number): number {
    if (this.finished) throw new Error("finished");
    const want = frames ?? (input.length ? input[0].length : 0);
    const n = Math.max(0, Math.min(want, this.maxFrames - this._frames));
    if (n === 0) return 0;
    const ch = this.channels, out = new Uint8Array(n * this.blockAlign);
    let o = 0;
    if (this.bits === 24) {
      for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
        const src = input.length ? input[c < input.length ? c : input.length - 1] : null;
        let x = src ? src[i] : 0;
        if (x !== x) x = 0;                                  // NaN
        let v = Math.round(x * 8388608);
        if (v > 8388607) v = 8388607; else if (v < -8388608) v = -8388608;
        out[o] = v & 255; out[o + 1] = (v >> 8) & 255; out[o + 2] = (v >> 16) & 255; o += 3;
      }
    } else {
      for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
        const src = input.length ? input[c < input.length ? c : input.length - 1] : null;
        let x = src ? src[i] : 0;
        if (x !== x) x = 0;
        let v = Math.round(x * 32768);
        if (v > 32767) v = 32767; else if (v < -32768) v = -32768;
        out[o] = v & 255; out[o + 1] = (v >> 8) & 255; o += 2;
      }
    }
    this.parts.push(out);
    this._frames += n;
    return n;
  }

  /** A marker at `frame` (default: the end of what is written). False when the cue table is full or the frame is off the file. */
  cue(label: string, frame: number = this._frames): boolean {
    if (this.finished) throw new Error("finished");
    if (this.cues.length >= MAX_CUES) return false;
    const f = Math.round(frame);
    if (!Number.isFinite(f) || f < 0 || f > this.maxFrames) return false;
    this.cues.push({ frame: f, label: String(label) });
    return true;
  }

  /**
   * Close the file: the header with exact sizes, the PCM parts as written, a pad byte when the data length is odd,
   * then the cue and label chunks. Returns the byte parts in order (make a Blob of them or concatenate). Calling it
   * twice returns the same parts; writing after it throws.
   */
  finish(): Uint8Array[] {
    if (this.finished) return this.out!;
    const dataBytes = this._frames * this.blockAlign, pad = dataBytes & 1;
    const cues = [...this.cues].sort((a, b) => a.frame - b.frame);
    const tail: Uint8Array[] = [];
    let tailBytes = 0;
    if (cues.length) {
      const cue = new Uint8Array(12 + 24 * cues.length), dv = new DataView(cue.buffer);
      ascii(dv, 0, "cue "); dv.setUint32(4, 4 + 24 * cues.length, true); dv.setUint32(8, cues.length, true);
      const labels: Uint8Array[] = []; let listBytes = 4;
      cues.forEach((c, i) => {
        const o = 12 + 24 * i;
        dv.setUint32(o, i + 1, true); dv.setUint32(o + 4, c.frame, true); ascii(dv, o + 8, "data");
        dv.setUint32(o + 12, 0, true); dv.setUint32(o + 16, 0, true); dv.setUint32(o + 20, c.frame, true);
        const text = clipLabel(c.label), body = 4 + text.length + 1, lp = body & 1;
        const l = new Uint8Array(8 + body + lp), ld = new DataView(l.buffer);
        ascii(ld, 0, "labl"); ld.setUint32(4, body, true); ld.setUint32(8, i + 1, true); l.set(text, 12);
        labels.push(l); listBytes += l.length;
      });
      const head = new Uint8Array(12), hd = new DataView(head.buffer);
      ascii(hd, 0, "LIST"); hd.setUint32(4, listBytes, true); ascii(hd, 8, "adtl");
      tail.push(cue, head, ...labels);
      tailBytes = cue.length + head.length + labels.reduce((s, l) => s + l.length, 0);
    }
    const riff = 4 + (8 + 16) + (8 + dataBytes + pad) + tailBytes;
    if (riff > RIFF_MAX) throw new RangeError("file too large for RIFF");
    const h = new Uint8Array(HEADER_BYTES), dv = new DataView(h.buffer);
    ascii(dv, 0, "RIFF"); dv.setUint32(4, riff, true); ascii(dv, 8, "WAVE");
    ascii(dv, 12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, this.channels, true);
    dv.setUint32(24, this.sampleRate, true); dv.setUint32(28, this.sampleRate * this.blockAlign, true);
    dv.setUint16(32, this.blockAlign, true); dv.setUint16(34, this.bits, true);
    ascii(dv, 36, "data"); dv.setUint32(40, dataBytes, true);
    const out: Uint8Array[] = [h, ...this.parts];
    if (pad) out.push(new Uint8Array(1));
    out.push(...tail);
    this.out = out; this.finished = true;
    return out;
  }
  private out: Uint8Array[] | null = null;

  /** One shot: whole channels in, finished parts out. */
  static encode(input: ArrayLike<number>[], spec: WavSpec, cues: WavCue[] = []): Uint8Array[] {
    const w = new WavWriter(spec);
    w.write(input);
    for (const c of cues) w.cue(c.label, c.frame);
    return w.finish();
  }
}

export const wavBytes = (parts: Uint8Array[]) => parts.reduce((s, p) => s + p.length, 0);

/** Concatenate the parts (tests and small files; a take goes to a Blob instead). */
export function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(wavBytes(parts)); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** A Blob of the parts, for a download or for storage. */
export function wavBlob(parts: Uint8Array[]): Blob { return new Blob(parts as BlobPart[], { type: "audio/wav" }); }
