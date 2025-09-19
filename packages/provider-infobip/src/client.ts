type Cfg = {
  baseUrl: string;
  apiKey: string;
};

export class InfobipClient {
  constructor(private cfg: Cfg) {}

  private async req<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        Authorization: `App ${this.cfg.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(
        `Infobip ${path} failed: ${res.status} ${res.statusText} – ${t}`
      );
    }
    return res.json() as Promise<T>;
  }

  async createWebRTCToken(params: { identity: string; displayName?: string }) {
    const body = {
      identity: params.identity,
      timeToLive: 43200,
      ...(params.displayName ? { displayName: params.displayName } : {}),
    };
    const data = await this.req<any>("/webrtc/1/token", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      token: String(data?.token ?? data?.accessToken ?? data?.jwt ?? ""),
    } as { token: string };
  }
}
