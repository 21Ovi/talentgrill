import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const g = globalThis as unknown as { __elevenlabs?: ElevenLabsClient };

/**
 * The official ElevenLabs SDK client. It reads ELEVENLABS_API_KEY from the
 * environment itself; created lazily so `next build` runs without the key.
 */
export function elevenlabs(): ElevenLabsClient {
  return (g.__elevenlabs ??= new ElevenLabsClient());
}
