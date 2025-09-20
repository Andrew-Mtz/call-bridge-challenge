export type StartBridgeBody = {
  provider: "telnyx" | "sinch" | "infobip";
  fromPhone: string;
  toPhone: string;
};

export type StartBridgeResp = {
  sessionId: string;
};

export const BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export async function startBridge(
  body: StartBridgeBody
): Promise<StartBridgeResp> {
  const res = await fetch(`${BASE}/api/calls/bridge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – ${text || "Unknown error"}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response: ${text}`);
  }
}

export async function getWebRTCToken(
  provider: "telnyx" | "sinch" | "infobip",
  opts?: { identity?: string; displayName?: string }
) {
  const url = `${BASE}/api/webrtc/token?provider=${provider}`;
  const body =
    provider === "infobip" ?
      {
        identity: opts?.identity ?? crypto.randomUUID(),
        displayName: opts?.displayName,
      }
    : {}; // telnyx dont need any params

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ token: string }>;
}
