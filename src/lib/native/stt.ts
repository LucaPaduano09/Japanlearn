import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import {
  ListenError,
  runListening,
  type Engine,
  type Listening,
} from "@/lib/speech/session";
import { SPOKEN_CARD_TYPES, type CardType } from "@/lib/srs/decks";

export { ListenError, type Listening };

/**
 * Speech recognition: the native engine in the app (via
 * @capacitor-community/speech-recognition), the Web Speech API in browsers
 * that have it. The plugin is imported lazily, like the TTS one, so the
 * static prerender never loads it.
 */

const LANG = "ja-JP";
/** Alternatives asked for (the plugin's maximum). */
const MAX_RESULTS = 5;

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
  return runListening(Capacitor.isNativePlatform() ? nativeEngine() : webEngine(), onPartial);
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
 * Partial results on both platforms: without them iOS only answers after
 * stop(), and Android shows its own popup. Both report the last transcript
 * through partialResults, also after "stopped".
 */
function nativeEngine(): Engine {
  const handles: Promise<PluginListenerHandle>[] = [];
  let aborted = false;
  const stop = () => plugin().then((sr) => sr.stop()).catch(() => {});
  return {
    start: (events) => {
      (async () => {
        if (!(await nativePermission())) throw new ListenError("permission");
        const sr = await plugin();
        handles.push(
          sr.addListener("partialResults", (data) => events.matches(data.matches ?? [])),
          sr.addListener("listeningState", ({ status }) => {
            if (status === "stopped") events.ended(false);
          }),
        );
        await Promise.all(handles);
        if (aborted) return;
        await sr.start({ language: LANG, maxResults: MAX_RESULTS, partialResults: true, popup: false });
        events.started();
      })().catch((e) => events.failed(e instanceof ListenError ? e : new ListenError("failed")));
    },
    stop,
    abort: () => {
      aborted = true;
      stop();
      for (const h of handles) h.then((x) => x.remove()).catch(() => {});
    },
  };
}

// The Web Speech API isn't in TypeScript's DOM types everywhere yet.
interface WebRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
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

function webEngine(): Engine {
  const Ctor = webRecognition();
  let rec: WebRecognition | null = null;
  return {
    start: (events) => {
      if (!Ctor) return events.failed(new ListenError("unavailable"));
      rec = new Ctor();
      rec.lang = LANG;
      rec.interimResults = true;
      rec.maxAlternatives = MAX_RESULTS;
      rec.continuous = false;
      rec.onstart = events.started;
      rec.onresult = (e) => {
        // Earlier segments joined, then each alternative of the latest one.
        const segments = Array.from(e.results);
        const head = segments
          .slice(0, -1)
          .map((s) => s[0]?.transcript ?? "")
          .join("");
        events.matches(Array.from(segments.at(-1) ?? [], (alt) => head + alt.transcript));
      };
      rec.onerror = (e) => {
        if (e.error === "aborted") return;
        if (e.error === "no-speech") return events.ended(true);
        events.failed(
          new ListenError(
            e.error === "not-allowed" || e.error === "service-not-allowed" ? "permission" : "failed",
          ),
        );
      };
      // onend comes after the last onresult: nothing more will follow.
      rec.onend = () => events.ended(true);
      rec.start();
    },
    stop: () => {
      try {
        rec?.stop();
      } catch {}
    },
    abort: () => {
      if (!rec) return;
      rec.onstart = rec.onresult = rec.onerror = rec.onend = null;
      try {
        (rec.abort ?? rec.stop).call(rec);
      } catch {}
    },
  };
}
