/**
 * ElevenLabs Text-to-Speech — client-side only.
 *
 * Usage:
 *   import { speak } from "@/lib/tts";
 *   await speak("Great pace! Keep it up.");
 *
 * Set NEXT_PUBLIC_ELEVENLABS_API_KEY in your .env.local file.
 * Set NEXT_PUBLIC_ELEVENLABS_VOICE_ID to override the default voice (optional).
 */

const API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? "";

// Rachel — a clear, neutral voice well-suited for audio cues.
// Override via env var if you prefer a different voice.
const VOICE_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

const TTS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Speak the given text aloud using ElevenLabs TTS.
 * Resolves when the audio finishes playing.
 * Rejects if the API call fails or the key is missing.
 */
export async function speak(text: string): Promise<void> {
  if (!API_KEY) {
    console.warn("[tts] NEXT_PUBLIC_ELEVENLABS_API_KEY is not set — skipping.");
    return;
  }

  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5", // low-latency model — good for real-time cues
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`[tts] ElevenLabs API error ${response.status}: ${detail}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const ctx = getAudioContext();

  // Resume the context if it was suspended (browser autoplay policy)
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  return new Promise((resolve) => {
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => resolve();
    source.start();
  });
}
