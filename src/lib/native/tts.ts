import { Capacitor } from "@capacitor/core";

/** A bit slower than normal speech, for learners. */
export const SPEECH_RATE = 0.8;
const LANG = "ja-JP";
/** How long to wait for the browser's voice list before speaking anyway. */
const VOICES_MS = 1500;

/**
 * Speaks Japanese text: the native engine (via the plugin) in the app, the
 * Web Speech API in the browser. Devices without a Japanese voice stay silent.
 *
 * In the browser the plugin isn't used: it sets only `lang`, so the first
 * utterance, before the voice list has loaded, came out in a wrong or
 * half-ready voice, and its cancel() before every speak() clips the start
 * on WebKit (every iPad browser). Here the Japanese voice is picked
 * explicitly and cancel() only runs when something is playing.
 */
export function speak(text: string) {
  if (isWebSpeech()) {
    speakWeb(text);
    return;
  }
  plugin()
    .then(({ QueueStrategy, TextToSpeech }) =>
      TextToSpeech.speak({
        text,
        lang: LANG,
        rate: SPEECH_RATE,
        queueStrategy: QueueStrategy.Flush,
      }),
    )
    .catch(() => {});
}

/**
 * The engines start cold: the first sound after loading comes out late or
 * clipped. A silent utterance at the first touch wakes them up (and, on iOS
 * browsers, unlocks speech, which needs a user gesture) before the learner
 * presses Listen.
 */
export function warmUpSpeech() {
  if (typeof window === "undefined") return;
  // The voice list starts loading now, so the first Listen can speak inside its tap.
  if (isWebSpeech()) japaneseVoice();
  const warm = () => {
    if (isWebSpeech()) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      warming = current = u;
      speechSynthesis.speak(u);
      return;
    }
    plugin()
      .then(({ QueueStrategy, TextToSpeech }) =>
        TextToSpeech.speak({ text: " ", lang: LANG, volume: 0, queueStrategy: QueueStrategy.Add }),
      )
      .catch(() => {});
  };
  window.addEventListener("pointerdown", warm, { once: true, capture: true });
  return () => window.removeEventListener("pointerdown", warm, { capture: true });
}

function plugin() {
  return import("@capacitor-community/text-to-speech");
}

function isWebSpeech() {
  return (
    !Capacitor.isNativePlatform() &&
    typeof window !== "undefined" &&
    "speechSynthesis" in window
  );
}

let voice: SpeechSynthesisVoice | null = null;
let voiceLoad: Promise<SpeechSynthesisVoice | null> | null = null;
/** Kept so the browser doesn't drop an utterance that is still playing. */
let current: SpeechSynthesisUtterance | null = null;
/** The silent warm-up: a Listen right after it queues instead of cancelling it. */
let warming: SpeechSynthesisUtterance | null = null;

/**
 * The browser's Japanese voice, preferring one that runs on the device.
 * Browsers load voices lazily, so an empty list waits for voiceschanged.
 */
function japaneseVoice(): Promise<SpeechSynthesisVoice | null> {
  voiceLoad ??= new Promise<SpeechSynthesisVoice | null>((resolve) => {
    const pick = () => {
      const ja = speechSynthesis
        .getVoices()
        .filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("ja"));
      return ja.find((v) => v.localService) ?? ja[0] ?? null;
    };
    const now = pick();
    if (now) return resolve(now);
    const done = () => resolve(pick());
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, VOICES_MS);
  }).then((v) => {
    voice = v;
    // An empty list may just be early: let the next call look again.
    if (!v) voiceLoad = null;
    return v;
  });
  return voiceLoad;
}

function speakWeb(text: string) {
  const say = () => {
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    if (busy && current !== warming) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG;
    u.rate = SPEECH_RATE;
    if (voice) u.voice = voice;
    current = u;
    u.onend = () => {
      if (current === u) current = null;
    };
    speechSynthesis.speak(u);
  };
  // Synchronous once the voice is known: iOS only lets speech start inside the tap.
  if (voice) say();
  else japaneseVoice().then(say);
}

/**
 * Whether the device can speak Japanese. Browsers load voices lazily, so an
 * empty list is retried once after the voices arrive.
 */
export async function hasJapaneseVoice(): Promise<boolean> {
  try {
    if (isWebSpeech()) return (await japaneseVoice()) !== null;
    const { TextToSpeech } = await plugin();
    const { voices } = await TextToSpeech.getSupportedVoices();
    return voices.some((v) => v.lang.toLowerCase().startsWith("ja"));
  } catch {
    return false;
  }
}
