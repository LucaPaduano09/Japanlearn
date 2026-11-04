/** A bit slower than normal speech, for learners. */
export const SPEECH_RATE = 0.8;

/**
 * Speaks Japanese text. The plugin uses the native engine in the app and the
 * Web Speech API in the browser; devices without a Japanese voice stay silent.
 * Imported lazily: the plugin touches `window` at load, which would break the
 * static prerender.
 */
export function speak(text: string) {
  plugin()
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

function plugin() {
  return import("@capacitor-community/text-to-speech");
}

/**
 * Whether the device can speak Japanese. Browsers load voices lazily, so an
 * empty list is retried once after the voices arrive.
 */
export async function hasJapaneseVoice(): Promise<boolean> {
  try {
    const { TextToSpeech } = await plugin();
    const check = async () =>
      (await TextToSpeech.getSupportedVoices()).voices.some((v) =>
        v.lang.toLowerCase().startsWith("ja"),
      );
    if (await check()) return true;
    if (typeof speechSynthesis === "undefined") return false;
    await new Promise((resolve) => {
      speechSynthesis.addEventListener("voiceschanged", resolve, { once: true });
      setTimeout(resolve, 1500);
    });
    return await check();
  } catch {
    return false;
  }
}
