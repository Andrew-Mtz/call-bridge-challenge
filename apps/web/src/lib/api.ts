export type StartBridgeBody = {
  fromPhone: string;
  toPhone: string;
};

export type StartBridgeResp = {
  sessionId: string;
};

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export async function startBridge(body: StartBridgeBody): Promise<StartBridgeResp> {
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
