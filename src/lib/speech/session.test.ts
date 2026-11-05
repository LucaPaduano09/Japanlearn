import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LISTEN_TIMING as T,
  ListenError,
  runListening,
  type Engine,
  type EngineEvents,
} from "./session";

/** An engine driven by hand: `events` is what it would report. */
function fakeEngine() {
  const engine = {
    events: null as EngineEvents | null,
    stops: 0,
    aborted: false,
    start(events: EngineEvents) {
      engine.events = events;
    },
    stop() {
      engine.stops++;
    },
    abort() {
      engine.aborted = true;
    },
  };
  return engine satisfies Engine;
}

/** Whether the promise settled, without waiting for it. */
async function state<T>(p: Promise<T>): Promise<unknown> {
  let out: unknown = "pending";
  p.then(
    (v) => (out = v),
    (e) => (out = e),
  );
  for (let i = 0; i < 5; i++) await Promise.resolve();
  return out;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("runListening", () => {
  it("stops after a silence, then settles with the last transcript", async () => {
    const engine = fakeEngine();
    const partials: string[] = [];
    const { result } = runListening(engine, (t) => partials.push(t));
    engine.events!.started();
    engine.events!.matches(["ね"]);
    engine.events!.matches(["ねこ", "根っこ"]);
    expect(partials).toEqual(["ね", "ねこ"]);

    vi.advanceTimersByTime(T.silence);
    expect(engine.stops).toBe(1);
    expect(await state(result)).toBe("pending");
    vi.advanceTimersByTime(T.final);
    expect(await result).toEqual(["ねこ", "根っこ"]);
    expect(engine.aborted).toBe(true);
  });

  it("takes a transcript that arrives after stopping as the final one", async () => {
    const engine = fakeEngine();
    const session = runListening(engine, () => {});
    engine.events!.started();
    session.stop();
    engine.events!.matches(["猫"]);
    expect(await session.result).toEqual(["猫"]);
  });

  it("never listens forever when the engine doesn't end by itself", async () => {
    const engine = fakeEngine();
    const { result } = runListening(engine, () => {});
    engine.events!.started();
    vi.advanceTimersByTime(T.start + T.final);
    expect(await result).toEqual([]);
  });

  it("caps a session that keeps hearing something", async () => {
    const engine = fakeEngine();
    const { result } = runListening(engine, () => {});
    engine.events!.started();
    for (let t = 0; t < T.max; t += T.silence / 2) {
      engine.events!.matches([`ね${t}`]);
      vi.advanceTimersByTime(T.silence / 2);
    }
    vi.advanceTimersByTime(T.final);
    expect(await state(result)).not.toBe("pending");
  });

  it("fails when the microphone never opens", async () => {
    const engine = fakeEngine();
    const { result } = runListening(engine, () => {});
    vi.advanceTimersByTime(T.boot);
    await expect(result).rejects.toEqual(new ListenError("failed"));
  });

  it("settles at once when the engine says it's done", async () => {
    const engine = fakeEngine();
    const { result } = runListening(engine, () => {});
    engine.events!.started();
    engine.events!.matches(["いぬ"]);
    engine.events!.ended(true);
    expect(await result).toEqual(["いぬ"]);
  });

  it("waits briefly for the final transcript when the engine ends first (Android)", async () => {
    const engine = fakeEngine();
    const { result } = runListening(engine, () => {});
    engine.events!.started();
    engine.events!.ended(false);
    engine.events!.matches(["いぬ"]);
    expect(await result).toEqual(["いぬ"]);
  });

  it("passes engine errors on, and an engine that throws fails", async () => {
    const engine = fakeEngine();
    const { result } = runListening(engine, () => {});
    engine.events!.failed(new ListenError("permission"));
    await expect(result).rejects.toEqual(new ListenError("permission"));

    const broken: Engine = {
      start: () => {
        throw new Error("InvalidStateError");
      },
      stop: () => {},
      abort: () => {},
    };
    await expect(runListening(broken, () => {}).result).rejects.toEqual(new ListenError("failed"));
  });
});
