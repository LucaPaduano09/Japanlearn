/**
 * One listening session, whatever the engine (native plugin or Web Speech
 * API). Engines differ in when, or whether, they stop by themselves: WebKit
 * with interim results may never end on its own, Android ends before its
 * final transcript, iOS only gives a final one after stop(). So stopping is
 * decided here, with timers, and the session always settles.
 */

export type ListenErrorKind = "permission" | "unavailable" | "failed";

export class ListenError extends Error {
  constructor(readonly kind: ListenErrorKind) {
    super(kind);
  }
}

export interface EngineEvents {
  /** The microphone is open (any permission prompt is behind us). */
  started: () => void;
  /** Transcript alternatives so far, most likely first. */
  matches: (matches: string[]) => void;
  /** The engine stopped by itself; `final`: nothing more will come. */
  ended: (final: boolean) => void;
  failed: (error: ListenError) => void;
}

export interface Engine {
  start: (events: EngineEvents) => void;
  /** Asks to stop; a final transcript may still follow. */
  stop: () => void;
  /** Stops for good and drops listeners. */
  abort: () => void;
}

export interface Listening {
  /** Stops now; `result` resolves with what was heard so far. */
  stop: () => void;
  /** Alternatives, most likely first; empty if nothing was understood. */
  result: Promise<string[]>;
}

export const LISTEN_TIMING = {
  /** Microphone never opened (engine stuck, prompt ignored): give up. */
  boot: 15_000,
  /** Open, but no words yet: stop. */
  start: 5_000,
  /** Silence after the last words: stop. */
  silence: 1_500,
  /** After stopping, how long a final transcript may take. */
  final: 800,
  /** Longest a session may listen, words or not. */
  max: 15_000,
};

export function runListening(
  engine: Engine,
  onPartial: (text: string) => void,
  timing = LISTEN_TIMING,
): Listening {
  let matches: string[] = [];
  let settled = false;
  let stopping = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cap: ReturnType<typeof setTimeout> | undefined;
  let resolve!: (m: string[]) => void;
  let reject!: (e: ListenError) => void;
  const result = new Promise<string[]>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const wait = (ms: number, then: () => void) => {
    clearTimeout(timer);
    timer = setTimeout(then, ms);
  };
  const settle = (error?: ListenError) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    clearTimeout(cap);
    engine.abort();
    if (error) reject(error);
    else resolve(matches);
  };
  const stop = () => {
    if (settled || stopping) return;
    stopping = true;
    engine.stop();
    wait(timing.final, () => settle());
  };

  wait(timing.boot, () => settle(new ListenError("failed")));
  try {
    engine.start({
      started: () => {
        if (settled || stopping) return;
        wait(timing.start, stop);
        clearTimeout(cap);
        cap = setTimeout(stop, timing.max);
      },
      matches: (m) => {
        if (settled || m.length === 0) return;
        matches = m;
        if (m[0]) onPartial(m[0]);
        cap ??= setTimeout(stop, timing.max);
        // After stopping, this is the final transcript.
        if (stopping) settle();
        else wait(timing.silence, stop);
      },
      ended: (final) => {
        if (settled) return;
        if (final) return settle();
        stopping = true;
        wait(timing.final, () => settle());
      },
      failed: (e) => settle(e),
    });
  } catch {
    settle(new ListenError("failed"));
  }

  return { stop, result };
}
