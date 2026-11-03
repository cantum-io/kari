// Kari — the take across the SoundCloud world boundary. Pure, DOM-free, unit-tested in Node.
//
// On SoundCloud the recorder hangs off the AudioController inside the MAIN-world hook (the chain's meeting point lives
// there); the Rec pill and the download live in the isolated bridge. Two pieces bridge the gap, as for loops (loops.ts):
//   - TakeRequests (bridge side): turns the pill's start / stop into protocol messages. Each is a request with a
//     sequence number whose promise resolves on the hook's answer (or false / null after a timeout), so the pill never
//     claims a take that did not start or a file that never came.
//   - runRecordCommand (hook side): applies a parsed RecordCommand to the controller that holds the take.
import type { RecordCommand } from "./protocol";
import type { Take, TakeLog, TakeMeta } from "../content/audio/recorder";

export type TakePayload = { wav: Blob; log: TakeLog };
export type RecordPost = (cmd: RecordCommand) => void;

export class TakeRequests {
  private seq = 0;
  private starts = new Map<number, { resolve(ok: boolean): void; timer: ReturnType<typeof setTimeout> }>();
  private stops = new Map<number, { resolve(t: TakePayload | null): void; timer: ReturnType<typeof setTimeout> }>();
  private post: RecordPost; private startMs: number; private stopMs: number;
  // A first take may wait for the engine bytes (the hook's attach); a stop waits up to 1.5 s for the worklet's last chunk.
  constructor(post: RecordPost, startMs = 8000, stopMs = 10000) { this.post = post; this.startMs = startMs; this.stopMs = stopMs; } // no parameter properties: Node strips types only

  /** The pill's start: resolves on the hook's ack for this request, false on timeout. */
  start(track: string, title: string): Promise<boolean> {
    const seq = ++this.seq;
    return new Promise<boolean>(resolve => {
      const timer = setTimeout(() => { if (this.starts.delete(seq)) resolve(false); }, this.startMs);
      this.starts.set(seq, { resolve, timer });
      this.post({ action: "start", seq, track, title });
    });
  }
  /** The pill's stop: resolves to the take the hook sends back for this request, null when nothing was kept or on timeout. */
  stop(): Promise<TakePayload | null> {
    const seq = ++this.seq;
    return new Promise<TakePayload | null>(resolve => {
      const timer = setTimeout(() => { if (this.stops.delete(seq)) resolve(null); }, this.stopMs);
      this.stops.set(seq, { resolve, timer });
      this.post({ action: "stop", seq });
    });
  }
  /** Kari hidden on SoundCloud (true) or shown again (false): a running take keeps nothing meanwhile. */
  hide(on: boolean) { this.post({ action: "hide", on }); }

  /** A start ack from the hook. Unknown or late sequence numbers are ignored. */
  ack(seq: number, ok: boolean) {
    const p = this.starts.get(seq); if (!p) return false;
    clearTimeout(p.timer); this.starts.delete(seq); p.resolve(ok); return true;
  }
  /** A take from the hook. Only the stop that asked for it is answered: the page cannot hand the bridge a file unasked. */
  take(seq: number, t: TakePayload | null) {
    const p = this.stops.get(seq); if (!p) return false;
    clearTimeout(p.timer); this.stops.delete(seq); p.resolve(t); return true;
  }
  get inFlight() { return this.starts.size + this.stops.size; }
}

/** A sanitized payload as the recorder's Take, for downloadTake / takeName (they read wav, log and startedAt). */
export const asTake = (t: TakePayload): Take => ({
  wav: t.wav, bytes: t.wav.size, log: t.log, frames: t.log.frames, seconds: t.log.seconds, sampleRate: t.log.sampleRate,
  channels: t.log.channels, peak: t.log.peak, dropped: t.log.dropped, startedAt: t.log.startedAt,
});

/** The slice of AudioController the hook routes record commands to. */
export type RecordTarget = {
  startRecording(meta: Omit<TakeMeta, "params">): Promise<boolean>;
  stopRecording(): Promise<Take | null>;
  holdTake(on: boolean): void;
};
export type RecordAnswer = { type: "record-ack"; seq: number; ok: boolean } | { type: "take"; seq: number; ok: boolean; wav?: Blob; log?: TakeLog } | null;

/**
 * Hook side: one command against the controller. `holder` is the controller that started the take (a stop goes to it
 * even if another element became the active one meanwhile); `targets` are every controller on the page (hide reaches
 * them all). Resolves to the answer to post, and the new holder.
 */
export async function runRecordCommand(cmd: RecordCommand, active: RecordTarget | null, holder: RecordTarget | null, targets: RecordTarget[], build: string): Promise<{ answer: RecordAnswer; holder: RecordTarget | null }> {
  switch (cmd.action) {
    case "start": {
      const c = holder || active;
      const ok = c ? await c.startRecording({ site: "sc", track: cmd.track || undefined, title: cmd.title || undefined, build }).catch(() => false) : false;
      return { answer: { type: "record-ack", seq: cmd.seq, ok }, holder: ok ? c : holder };
    }
    case "stop": {
      const t = holder ? await holder.stopRecording().catch(() => null) : null;
      return { answer: t && t.frames ? { type: "take", seq: cmd.seq, ok: true, wav: t.wav, log: t.log } : { type: "take", seq: cmd.seq, ok: false }, holder: null };
    }
    case "hide": for (const c of targets) c.holdTake(cmd.on); return { answer: null, holder };
  }
}
