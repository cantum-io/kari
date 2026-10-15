// Kari — beat loops across the SoundCloud world boundary. Pure, DOM-free, unit-tested in Node.
//
// On SoundCloud the AudioController (grid, tap tempo, latch, release) runs inside the MAIN-world hook, next to the
// element it reads the clock from; the dock and the MIDI pads run in the isolated bridge. Two pieces bridge the gap:
//   - LoopRequests (bridge side): turns the dock's loop deps into protocol messages; a latch is a request with a
//     sequence number whose promise resolves on the hook's ack (or false after `timeoutMs`), so the dock's "latch took"
//     reaction stays honest instead of assuming.
//   - runLoopCommand (hook side): applies a parsed LoopCommand to the controller's loop API.
import type { LoopBeats } from "../content/beat/grid";
import type { LoopCommand } from "./protocol";

/** The slice of AudioController the hook routes loop commands to. */
export type LoopTarget = {
  latchLoop(beats: LoopBeats): Promise<boolean>;
  releaseLoop(): void;
  tap(): number | null;
  setBpm(bpm: number): void;
  nudgeBpm(delta: number): void;
  setGrid(g: null): void;
};

/** Apply one command. Resolves the latch result (false without a target); every other action resolves true. */
export async function runLoopCommand(cmd: LoopCommand, target: LoopTarget | null): Promise<boolean> {
  if (!target) return false;
  switch (cmd.action) {
    case "latch": return target.latchLoop(cmd.beats);
    case "release": target.releaseLoop(); return true;
    case "tap": target.tap(); return true;
    case "bpm": target.setBpm(cmd.bpm); return true;
    case "nudge": target.nudgeBpm(cmd.delta); return true;
    case "clear": target.setGrid(null); return true;
  }
}

export type LoopPost = (cmd: LoopCommand) => void;

export class LoopRequests {
  private seq = 0;
  private pending = new Map<number, { resolve(ok: boolean): void; timer: ReturnType<typeof setTimeout> }>();
  private post: LoopPost; private timeoutMs: number;
  constructor(post: LoopPost, timeoutMs = 2000) { this.post = post; this.timeoutMs = timeoutMs; } // no parameter properties: Node strips types only

  /** The dock's latch: resolves on the hook's ack for this request, false on timeout. */
  latch(beats: LoopBeats): Promise<boolean> {
    const seq = ++this.seq;
    return new Promise<boolean>(resolve => {
      const timer = setTimeout(() => { if (this.pending.delete(seq)) resolve(false); }, this.timeoutMs);
      this.pending.set(seq, { resolve, timer });
      this.post({ action: "latch", beats, seq });
    });
  }
  release() { this.post({ action: "release" }); }
  /** The bpm comes back through status, not through this call: the dock reads status, so null here is correct. */
  tap(): null { this.post({ action: "tap" }); return null; }
  setBpm(bpm: number) { if (Number.isFinite(bpm)) this.post({ action: "bpm", bpm }); }
  nudge(delta: number) { if (Number.isFinite(delta) && delta !== 0) this.post({ action: "nudge", delta }); }
  clear() { this.post({ action: "clear" }); }

  /** An ack from the hook. Unknown or late sequence numbers are ignored. */
  ack(seq: number, ok: boolean) {
    const p = this.pending.get(seq); if (!p) return false;
    clearTimeout(p.timer); this.pending.delete(seq); p.resolve(ok); return true;
  }
  get inFlight() { return this.pending.size; }
}
