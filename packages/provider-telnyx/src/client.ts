import { DialParams, DialResult, BridgeParams } from "@call-provider/core";

export type TelnyxConfig = {
  apiKey: string;
  connectionId: string;
  fromNumber: string;
  baseUrl?: string;
};

// Returns the raw Response. Callers decide how to read it (json/text).
async function tFetch(
  url: string,
  init: RequestInit,
  apiKey: string
): Promise<Response> {
  const hasBody = typeof init?.body !== "undefined";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "*/*",
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  const r = await fetch(url, { ...init, headers });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Telnyx ${r.status}: ${txt}`);
  }
  return r;
}

/** Robustly extract the JWT token from raw text or JSON-ish payloads. */
function extractTokenFromText(text: string): string {
  try {
    const j = JSON.parse(text) as
      | { data?: { token?: string }; token?: string; jwt?: string }
      | string;
    if (typeof j === "string") return j;
    return j?.data?.token ?? j?.token ?? j?.jwt ?? text;
  } catch {
    // API sometimes returns the raw JWT string
    return text;
  }
}

export function makeClient(cfg: TelnyxConfig) {
  const base = cfg.baseUrl ?? "https://api.telnyx.com";

  return {
    async dial(p: DialParams): Promise<DialResult> {
      const body = {
        to: p.to,
        from: cfg.fromNumber,
        connection_id: cfg.connectionId,
        client_state: Buffer.from(
          JSON.stringify({ sessionId: p.sessionId, leg: p.leg })
        ).toString("base64"),
        ...(p.commandId ? { command_id: p.commandId } : {}),
      };

      await tFetch(
        `${base}/v2/calls`,
        { method: "POST", body: JSON.stringify(body) },
        cfg.apiKey
      );
      return { accepted: true };
    },

    async bridge(p: BridgeParams): Promise<void> {
      await tFetch(
        `${base}/v2/calls/${encodeURIComponent(p.aCallControlId)}/actions/bridge`,
        {
          method: "POST",
          body: JSON.stringify({ call_control_id: p.bCallControlId }),
        },
        cfg.apiKey
      );
    },

    async createWebRTCToken(credentialId: string): Promise<{ token: string }> {
      const r = await tFetch(
        `${base}/v2/telephony_credentials/${encodeURIComponent(credentialId)}/token`,
        { method: "POST" },
        cfg.apiKey
      );
      const raw = await r.text();
      return { token: extractTokenFromText(raw) };
    },
  };
}
