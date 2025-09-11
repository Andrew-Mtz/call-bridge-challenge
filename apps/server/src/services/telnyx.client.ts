import { env } from "../config";

const BASE = "https://api.telnyx.com/v2";

type DialParams = {
  to: string;
  from: string;
  connection_id: string;
  client_state: string;
  command_id?: string;
};

async function tFetch(path: string, init: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.TELNYX_API_KEY}`,
    ...(init.headers || {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telnyx ${res.status}: ${text}`);
  }
  return res.json();
}

/** Make a call (Dial) */
export async function dial(params: DialParams) {
  return tFetch("/calls", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** Bridge: match A with B */
export async function bridge(aCallControlId: string, bCallControlId: string) {
  return tFetch(`/calls/${aCallControlId}/actions/bridge`, {
    method: "POST",
    body: JSON.stringify({ call_control_id: bCallControlId }),
  });
}
