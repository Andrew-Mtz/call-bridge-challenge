import type { CallProvider } from "@call-provider/core";
import { createTelnyxProvider } from "@call-provider/telnyx";
import { env } from "@config";

let cached: CallProvider | null = null;

export function getProvider(): CallProvider {
  if (cached) return cached;

  switch (env.CALL_PROVIDER.toLowerCase()) {
    case "telnyx":
      cached = createTelnyxProvider({
        apiKey: env.TELNYX_API_KEY!,
        connectionId: env.TELNYX_CONNECTION_ID!,
        fromNumber: env.TELNYX_NUMBER!,
        publicKeyB64: env.TELNYX_PUBLIC_KEY!,
      });
      break;
    default:
      throw new Error(`Unknown CALL_PROVIDER: ${env.CALL_PROVIDER}`);
  }
  return cached!;
}
