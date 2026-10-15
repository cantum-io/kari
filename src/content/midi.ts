// Kari — Web MIDI for the loop buttons. Note-on fires an action; a learn mode binds the next note to an armed action.
// Click + MIDI only: Kari never takes the page's keyboard. The browser asks the user once per origin when connect()
// runs, so it is only ever called from a click on the dock. Sysex is never requested.

export type MidiAction = "loop-q" | "loop-h" | "loop-1" | "release" | "tap";
export type MidiMap = Record<MidiAction, number>;   // note number, any channel
export const MIDI_ACTIONS: MidiAction[] = ["loop-q", "loop-h", "loop-1", "release", "tap"];
export const DEFAULT_MIDI_MAP: MidiMap = { "loop-q": 36, "loop-h": 37, "loop-1": 38, release: 39, tap: 40 }; // C1..E1, the first pads on most controllers

export type MidiState = { supported: boolean; connected: boolean; inputs: number; learning: MidiAction | null; lastNote: number | null; error: string | null };

export class Midi {
  private access: MIDIAccess | null = null;
  private map: MidiMap;
  private _state: MidiState = { supported: typeof navigator !== "undefined" && "requestMIDIAccess" in navigator, connected: false, inputs: 0, learning: null, lastNote: null, error: null };
  constructor(map: Partial<MidiMap> | undefined, private onAction: (a: MidiAction) => void, private onMap: (m: MidiMap) => void, private onState: (s: MidiState) => void) {
    this.map = { ...DEFAULT_MIDI_MAP, ...(map || {}) };
  }
  get state() { return this._state; }
  get mapping() { return this.map; }
  noteFor(a: MidiAction) { return this.map[a]; }
  private set(patch: Partial<MidiState>) { this._state = { ...this._state, ...patch }; this.onState(this._state); }

  /** Ask for MIDI access (shows the browser's permission prompt the first time). Resolves true when inputs are wired. */
  async connect(): Promise<boolean> {
    if (!this._state.supported) { this.set({ error: "no Web MIDI in this browser" }); return false; }
    if (this.access) return true;
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      this.access = access;
      const wire = () => { let n = 0; access.inputs.forEach(inp => { inp.onmidimessage = this.onMessage; n++; }); this.set({ connected: n > 0, inputs: n, error: n ? null : "no MIDI inputs" }); };
      access.onstatechange = wire;
      wire();
      return this._state.connected;
    } catch (err) {
      this.set({ error: String((err as Error)?.message || err), connected: false });
      return false;
    }
  }
  /** Learn mode: the next note-on binds to `action` (null leaves learn mode). */
  learn(action: MidiAction | null) { this.set({ learning: action }); }
  setMap(map: Partial<MidiMap>) { this.map = { ...DEFAULT_MIDI_MAP, ...map }; }

  private onMessage = (e: MIDIMessageEvent) => {
    const d = e.data; if (!d || d.length < 3) return;
    const status = d[0] & 0xf0, note = d[1], velocity = d[2];
    if (status !== 0x90 || velocity === 0) return;   // note-on only; note-off and velocity-0 note-on are releases of the pad, not actions
    this.set({ lastNote: note });
    if (this._state.learning) {
      const a = this._state.learning;
      this.map = { ...this.map, [a]: note };
      this.onMap(this.map);
      this.set({ learning: null });
      return;
    }
    for (const a of MIDI_ACTIONS) if (this.map[a] === note) { this.onAction(a); return; }
  };
}
