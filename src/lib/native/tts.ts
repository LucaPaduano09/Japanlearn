/** A bit slower than normal speech, for learners. */
export const SPEECH_RATE = 0.8;

/**
 * Speaks Japanese text. The plugin uses the native engine in the app and the
 * Web Speech API in the browser; devices without a Japanese voice stay silent.
 * Imported lazily: the plugin touches `window` at load, which would break the
 * static prerender.
 */
export function speak(text: string) {
  import("@capacitor-community/text-to-speech")
    .then(({ QueueStrategy, TextToSpeech }) =>
      TextToSpeech.speak({
        text,
        lang: "ja-JP",
        rate: SPEECH_RATE,
        queueStrategy: QueueStrategy.Flush,
      }),
    )
    .catch(() => {});
}
