import type {
  CallProvider,
  DialParams,
  DialResult,
  BridgeParams,
  WebRTCTokenParams,
  WebRTCTokenResult,
} from "@call-provider/core";
import { InfobipClient } from "./client";
import { verifyInfobipSignature } from "./verify";

type Cfg = { baseUrl: string; apiKey: string };

function hasIdentity(
  p: WebRTCTokenParams
): p is { identity: string; displayName?: string } {
  return typeof (p as any)?.identity === "string";
}

export function createInfobipProvider(cfg: Cfg): CallProvider {
  const client = new InfobipClient(cfg);

  return {
    name: "infobip",

    async createWebRTCToken(p: WebRTCTokenParams): Promise<WebRTCTokenResult> {
      if (!hasIdentity(p)) {
        throw new Error("Infobip WebRTC requires { identity, displayName? }");
      }
      const res = await client.createWebRTCToken({
        identity: p.identity,
        displayName: p.displayName,
      });

      return { token: String(res.token ?? "") };
    },

    async dial(_p: DialParams): Promise<DialResult> {
      throw new Error("Infobip PSTN not implemented (T9)");
    },
    async bridge(_p: BridgeParams): Promise<void> {
      throw new Error("Infobip PSTN not implemented (T9)");
    },

    verifySignature() {
      return verifyInfobipSignature();
    },
    parseEvent(_envelope: unknown) {
      return null;
    },
  };
}
