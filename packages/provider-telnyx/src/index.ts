import type {
  CallProvider,
  DialParams,
  DialResult,
  BridgeParams,
  ProviderEvent,
  WebRTCTokenParams,
  WebRTCTokenResult,
} from "@call-provider/core";
import { makeClient, type TelnyxConfig } from "./client";
import { verifySignature as telnyxVerify } from "./verify";

export type CreateTelnyxProviderOptions = TelnyxConfig & {
  publicKeyB64: string;
};

export function createTelnyxProvider(
  opts: CreateTelnyxProviderOptions
): CallProvider {
  const http = makeClient(opts);
  return {
    name: "telnyx",
    async dial(p: DialParams): Promise<DialResult> {
      return http.dial(p);
    },
    async bridge(p: BridgeParams): Promise<void> {
      return http.bridge(p);
    },
    async createWebRTCToken(p: WebRTCTokenParams): Promise<WebRTCTokenResult> {
      const { token } = await http.createWebRTCToken(p.credentialId);
      return { token };
    },
    verifySignature(raw, headers) {
      return telnyxVerify(raw, headers, opts.publicKeyB64);
    },
    parseEvent(envelope: any): ProviderEvent | null {
      try {
        const data = envelope?.data;
        const payload = data?.payload;
        const eventType = data?.event_type as string;
        const id = data?.id ?? envelope?.id ?? "";
        const clientStateB64 = payload?.client_state;
        let sessionId: string | undefined;
        let leg: "A" | "B" | null = null;

        if (clientStateB64) {
          try {
            const cs = JSON.parse(
              Buffer.from(clientStateB64, "base64").toString("utf8")
            );
            sessionId = cs?.sessionId;
            leg = cs?.leg ?? null;
          } catch {}
        }

        const map: Record<string, ProviderEvent["type"]> = {
          "call.initiated": "initiated",
          "call.answered": "answered",
          "call.bridged": "bridged",
          "call.hangup": "hangup",
        };
        const type = map[eventType];
        if (!type) return null;

        return {
          id: String(id || ""),
          type,
          leg,
          to: payload?.to,
          from: payload?.from,
          callControlId: payload?.call_control_id,
          sessionId,
          raw: envelope,
        };
      } catch {
        return null;
      }
    },
  };
}
