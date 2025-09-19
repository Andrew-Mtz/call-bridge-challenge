export type LegState = {
  callControlId?: string;
  callLegId?: string;
  status: "dialing" | "answered" | "bridged" | "ended";
};

export type Session = {
  sessionId: string;
  provider: "telnyx" | "infobip";
  fromPhone: string;
  toPhone: string;
  a: LegState;
  b: LegState;
  status:
    | "created"
    | "a_dialing"
    | "a_answered"
    | "b_dialing"
    | "bridged"
    | "ended";
};

export const sessions = new Map<string, Session>();
