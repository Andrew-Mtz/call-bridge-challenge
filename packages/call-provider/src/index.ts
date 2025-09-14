export type Leg = "A" | "B";
export type ProviderEventType = "initiated" | "answered" | "bridged" | "hangup";

export interface ProviderEvent {
  id: string;
  type: ProviderEventType;
  leg: Leg | null;
  to?: string;
  from?: string;
  callControlId?: string;
  sessionId?: string;
  raw: unknown;
}

export interface DialParams {
  to: string;
  from: string;
  sessionId: string;
  leg: Leg;
  commandId?: string;
}

export interface DialResult {
  accepted: boolean;
}

export interface BridgeParams {
  aCallControlId: string;
  bCallControlId: string;
}

export interface WebRTCTokenParams {
  credentialId: string; // Telnyx telephony credential ID
}

export interface WebRTCTokenResult {
  token: string; // JWT to use in @telnyx/webrtc
}

export interface CallProvider {
  name: string;
  dial(p: DialParams): Promise<DialResult>;
  bridge(p: BridgeParams): Promise<void>;
  createWebRTCToken(p: WebRTCTokenParams): Promise<WebRTCTokenResult>;
  verifySignature(
    raw: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): boolean;
  parseEvent(envelope: unknown): ProviderEvent | null;
}
