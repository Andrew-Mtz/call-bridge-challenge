import { CallProvider, DialParams, DialResult, BridgeParams } from "@call-provider/core";

export type TelnyxConfig = {
  apiKey: string;
  connectionId: string;
  fromNumber: string;
  baseUrl?: string;
};

async function tFetch(url: string, init: RequestInit, apiKey: string) {
  const r = await fetch(url, {
    ...init,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Telnyx ${r.status}: ${txt}`);
  }
  return r.json().catch(() => ({}));
}

export function makeClient(cfg: TelnyxConfig) {
  const base = cfg.baseUrl ?? "https://api.telnyx.com";
  return {
    async dial(p: DialParams): Promise<DialResult> {
      const body = {
        to: p.to,
        from: cfg.fromNumber,
        connection_id: cfg.connectionId,
        client_state: Buffer.from(JSON.stringify({ sessionId: p.sessionId, leg: p.leg })).toString("base64"),
        ...(p.commandId ? { command_id: p.commandId } : {})
      };
      await tFetch(`${base}/v2/calls`, { method: "POST", body: JSON.stringify(body) }, cfg.apiKey);
      return { accepted: true };
    },
    async bridge(p: BridgeParams): Promise<void> {
      await tFetch(
        `${base}/v2/calls/${encodeURIComponent(p.aCallControlId)}/actions/bridge`,
        {
          method: "POST",
          body: JSON.stringify({
            call_control_id: p.bCallControlId
          })
        },
        cfg.apiKey
      );
    }
  };
}
