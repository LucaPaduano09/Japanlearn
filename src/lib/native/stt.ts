import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { SPOKEN_CARD_TYPES, type CardType } from "@/lib/srs/decks";

/**
 * Speech recognition: the native engine in the app (via
 * @capacitor-community/speech-recognition), the Web Speech API in browsers
 * that have it. The plugin is imported lazily, like the TTS one, so the
 * static prerender never loads it.
 */

const LANG = "ja-JP";
/** Alternatives asked for (the plugin's maximum). */
const MAX_RESULTS = 5;
/** Time to start talking before listening gives up. */
const START_MS = 5000;
/** Silence after the last word before listening stops on its own. */
const SILENCE_MS = 1500;
/** The final transcript can arrive a moment after the engine stops. */
const FINAL_MS = 800;

export type ListenErrorKind = "permission" | "unavailable" | "failed";

export class ListenError extends Error {
  constructor(readonly kind: ListenErrorKind) {
    super(kind);
  }
}

export interface Listening {
  /** Stops now; `result` resolves with what was heard so far. */
  stop: () => void;
  /** Alternatives, most likely first; empty if nothing was understood. */
  result: Promise<string[]>;
}

let available: Promise<boolean> | null = null;

/** Whether this device can turn Japanese speech into text (checked once per run). */
export function canRecognizeJapanese(): Promise<boolean> {
  available ??= (Capacitor.isNativePlatform() ? nativeAvailable() : Promise.resolve(webAvailable()))
    .catch(() => false);
  return available;
}

/** The card types to leave out of reviews: spoken ones, unless enabled and possible. */
export async function skippedCardTypes(speakingEnabled: boolean): Promise<CardType[]> {
  return speakingEnabled && (await canRecognizeJapanese()) ? [] : SPOKEN_CARD_TYPES;
}

/** Starts listening for one short answer. `onPartial` gets the transcript as it grows. */
export function listen(onPartial: (text: string) => void): Listening {
  return Capacitor.isNativePlatform() ? listenNative(onPartial) : listenWeb(onPartial);
}

function plugin() {
  return import("@capacitor-community/speech-recognition").then((m) => m.SpeechRecognition);
}

async function nativeAvailable(): Promise<boolean> {
  const sr = await plugin();
  if (!(await sr.available()).available) return false;
  // Android 13+ can't list languages; there the system recognizer is trusted.
  const languages = await sr
    .getSupportedLanguages()
    .then((r) => r.languages.map(String))
    .catch(() => []);
  return languages.length === 0 || languages.some((l) => l.toLowerCase().startsWith("ja"));
}

async function nativePermission(): Promise<boolean> {
  const sr = await plugin();
  let { speechRecognition } = await sr.checkPermissions();
  if (speechRecognition !== "granted") {
    ({ speechRecognition } = await sr.requestPermissions());
  }
  return speechRecognition === "granted";
}

/**
 * Listens with partial results on both platforms: without them iOS only
 * answers after stop(), and Android shows its own popup. Stopping is ours:
 * on silence, on stop(), or when the engine ends by itself.
 */
function listenNative(onPartial: (text: string) => void): Listening {
  let matches: string[] = [];
  let done = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const handles: Promise<PluginListenerHandle>[] = [];
  let finish: () => void = () => {};

  const wait = (ms: number, then: () => void) => {
    clearTimeout(timer);
    timer = setTimeout(then, ms);
  };
  const stopEngine = () => {
    if (stopped) return;
    stopped = true;
    plugin().then((sr) => sr.stop()).catch(() => {});
    wait(FINAL_MS, finish);
  };

  const result = new Promise<string[]>((resolve, reject) => {
    finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      for (const h of handles) h.then((x) => x.remove()).catch(() => {});
      if (!stopped) plugin().then((sr) => sr.stop()).catch(() => {});
      resolve(matches);
    };
    (async () => {
      if (!(await nativePermission())) throw new ListenError("permission");
      const sr = await plugin();
      handles.push(
        sr.addListener("partialResults", (data) => {
          if (done || !data.matches?.length) return;
          matches = data.matches;
          onPartial(matches[0]);
          // After the engine stopped, this is the final transcript.
          if (stopped) finish();
          else wait(SILENCE_MS, stopEngine);
        }),
        sr.addListener("listeningState", ({ status }) => {
          if (status === "stopped" && !stopped) {
            stopped = true;
            wait(FINAL_MS, finish);
          }
        }),
      );
      await Promise.all(handles);
      wait(START_MS, stopEngine);
      await sr.start({ language: LANG, maxResults: MAX_RESULTS, partialResults: true, popup: false });
    })().catch((e) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      for (const h of handles) h.then((x) => x.remove()).catch(() => {});
      reject(e instanceof ListenError ? e : new ListenError("failed"));
    });
  });

  return { stop: () => !done && stopEngine(), result };
}

// The Web Speech API isn't in TypeScript's DOM types everywhere yet.
interface WebRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type WebRecognitionCtor = new () => WebRecognition;

function webRecognition(): WebRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, WebRecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function webAvailable() {
  return webRecognition() !== undefined;
}

function listenWeb(onPartial: (text: string) => void): Listening {
  const Ctor = webRecognition();
  if (!Ctor) {
    return { stop: () => {}, result: Promise.reject(new ListenError("unavailable")) };
  }
  const rec = new Ctor();
  rec.lang = LANG;
  rec.interimResults = true;
  rec.maxAlternatives = MAX_RESULTS;
  rec.continuous = false;
  let matches: string[] = [];
  const result = new Promise<string[]>((resolve, reject) => {
    let failed = false;
    rec.onresult = (e) => {
      // Earlier segments joined, then each alternative of the latest one.
      const segments = Array.from(e.results);
      const head = segments
        .slice(0, -1)
        .map((s) => s[0]?.transcript ?? "")
        .join("");
      matches = Array.from(segments.at(-1) ?? [], (alt) => head + alt.transcript);
      if (matches[0]) onPartial(matches[0]);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      failed = true;
      reject(
        new ListenError(
          e.error === "not-allowed" || e.error === "service-not-allowed" ? "permission" : "failed",
        ),
      );
    };
    rec.onend = () => {
      if (!failed) resolve(matches);
    };
  });
  try {
    rec.start();
  } catch {
    return { stop: () => {}, result: Promise.reject(new ListenError("failed")) };
  }
  return { stop: () => rec.stop(), result };
}
