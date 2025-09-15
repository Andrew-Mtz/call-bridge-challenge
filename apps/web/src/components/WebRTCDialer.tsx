import { useRef, useState } from "react";
import { TelnyxRTC } from "@telnyx/webrtc";
import { BASE } from "../lib/api";
import { addHistory } from "../lib/callHistory";

type TelnyxCallState =
  | "new"
  | "requesting"
  | "trying"
  | "ringing"
  | "early"
  | "active"
  | "held"
  | "done"
  | "hangup"
  | "destroy"
  | "busy"
  | "failed"
  | "timeout"
  | string;

interface TelnyxCall {
  state?: TelnyxCallState;
  hangup?: () => void;
  muteAudio?: () => void;
  unmuteAudio?: () => void;
}

interface TelnyxNotificationCallUpdate {
  type: "callUpdate";
  call: TelnyxCall;
}
type TelnyxNotification =
  | TelnyxNotificationCallUpdate
  | { type: string; [k: string]: unknown };

function isCallUpdate(n: unknown): n is TelnyxNotificationCallUpdate {
  return (
    !!n &&
    typeof n === "object" &&
    (n as TelnyxNotificationCallUpdate).type === "callUpdate" &&
    !!(n as TelnyxNotificationCallUpdate).call
  );
}

type DialerStatus = "idle" | "calling" | "in-call" | "ended";

type Props = {
  to: string;
  onStatusRight: (s: DialerStatus) => void;
  onConnectedChange?: (connected: boolean) => void;
};

// States to hide the "Call" button
const CALLING_STATES = new Set([
  "new",
  "requesting",
  "trying",
  "ringing",
  "early",
  "active",
]);
// States that enable UI
const TERMINAL_STATES = new Set([
  "done",
  "hangup",
  "destroy",
  "busy",
  "failed",
  "timeout",
  "error",
  "disconnected",
]);

export function WebRTCDialer({ to, onStatusRight, onConnectedChange }: Props) {
  const clientRef = useRef<TelnyxRTC | null>(null);
  const callRef = useRef<TelnyxCall | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [callState, setCallState] = useState<TelnyxCallState | null>(null);
  const [hasCall, setHasCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isE164 = (v: string) => /^\+\d{7,15}$/.test(v);

  async function ensureMicPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  async function connect() {
    if (clientRef.current || connecting) return;
    setError(null);
    setConnecting(true);

    const micOk = await ensureMicPermission();
    if (!micOk) {
      setError("Microphone permission was denied.");
      setConnecting(false);
      return;
    }

    try {
      const r = await fetch(`${BASE}/api/webrtc/token`, { method: "POST" });
      if (!r.ok) throw new Error(`Token HTTP ${r.status}`);
      const { token } = (await r.json()) as { token: string };
      if (!token) throw new Error("Missing token");

      const client = new TelnyxRTC({ login_token: token });
      client.remoteElement = "remoteMedia";

      client
        .on("telnyx.ready", () => {
          setConnected(true);
          setConnecting(false);
          onConnectedChange?.(true);
          onStatusRight("idle");
        })
        .on("telnyx.error", (e: unknown) => {
          const msg =
            typeof e === "object" && e && "message" in e ?
              String((e as Error).message)
            : "webrtc error";
          setError(msg);
          setConnecting(false);
        })
        .on("telnyx.socket.close", () => {
          setConnected(false);
          setConnecting(false);
          setCallState(null);
          setHasCall(false);
          setMuted(false);
          onStatusRight("idle");
        })
        .on("telnyx.notification", (n: TelnyxNotification) => {
          if (!isCallUpdate(n)) return;

          callRef.current = n.call;
          const st = String(n.call.state ?? "");
          const stLower = st.toLowerCase() as TelnyxCallState;

          setCallState(stLower);

          // Keep the “Call” hidden in all establishment/active states
          if (CALLING_STATES.has(stLower)) setHasCall(true);
          if (TERMINAL_STATES.has(stLower)) {
            setHasCall(false);
            setMuted(false);
          }

          if (
            stLower === "requesting" ||
            stLower === "trying" ||
            stLower === "ringing" ||
            stLower === "early"
          )
            onStatusRight("calling");
          else if (stLower === "active") onStatusRight("in-call");
          else if (
            stLower === "done" ||
            stLower === "hangup" ||
            stLower === "destroy" ||
            TERMINAL_STATES.has(stLower)
          )
            onStatusRight("ended");
        });

      clientRef.current = client;
      client.checkPermissions(true, false);
      client.connect();
    } catch (e) {
      const msg =
        typeof e === "object" && e && "message" in e ?
          String((e as Error).message)
        : "connect error";
      setError(msg);
      setConnecting(false);
    }
  }

  const disconnect = () => {
    try {
      callRef.current?.hangup?.();
      clientRef.current?.disconnect?.();
      clientRef.current?.off("telnyx.ready");
      clientRef.current?.off("telnyx.notification");
      clientRef.current?.off("telnyx.socket.close");
    } finally {
      callRef.current = null;
      clientRef.current = null;
      setConnected(false);
      setCallState(null);
      setHasCall(false);
      setMuted(false);
      onConnectedChange?.(false);
      onStatusRight("idle");
    }
  };

  function makeCall() {
    if (!clientRef.current || !connected) return;
    if (!isE164(to)) {
      setError("Destination must be E.164 (+XXXXXXXX).");
      return;
    }
    setError(null);
    setHasCall(true);
    setCallState("requesting");
    onStatusRight("calling");

    addHistory("webrtc-to", to);
    clientRef.current.newCall({
      destinationNumber: to,
      callerNumber: import.meta.env.VITE_TELNYX_NUMBER,
      remoteElement: "remoteMedia",
      audio: true,
      video: false,
    });
  }

  function hangup() {
    try {
      callRef.current?.hangup?.();
    } catch {
      try {
        clientRef.current?.disconnect?.();
        clientRef.current?.off("telnyx.ready");
        clientRef.current?.off("telnyx.notification");
        clientRef.current?.off("telnyx.socket.close");
        clientRef.current = null;
      } catch (e) {
        console.error("[WH] SSE error", e);
      }
    }
  }

  function toggleMute() {
    if (!callRef.current) return;
    try {
      if (!muted) callRef.current.muteAudio?.();
      else callRef.current.unmuteAudio?.();
      setMuted(!muted);
    } catch {
      /* ignore */
    }
  }

  const isActive = (callState ?? "").toLowerCase() === "active";

  return (
    <div style={sx.wrap}>
      <audio id="remoteMedia" autoPlay playsInline />
      <div style={sx.row}>
        {!connected ?
          <button onClick={connect} disabled={connecting} style={sx.btnPrimary}>
            {connecting ? "Connecting..." : "Connect headset"}
          </button>
        : <button onClick={disconnect} style={sx.btnGhost}>
            Disconnect
          </button>
        }

        {connected && !hasCall && (
          <button onClick={makeCall} style={sx.btnPrimary}>
            Call
          </button>
        )}

        {connected && hasCall && (
          <button onClick={hangup} style={sx.btnGhost}>
            Hang up
          </button>
        )}

        {connected && isActive && (
          <button onClick={toggleMute} style={sx.btnGhost}>
            {muted ? "Unmute" : "Mute"}
          </button>
        )}
      </div>
      {error && <div style={sx.error}>{error}</div>}
    </div>
  );
}

const sx: Record<string, React.CSSProperties> = {
  wrap: { display: "grid", gap: 10, placeItems: "center" },
  row: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    padding: "10px 14px",
    background: "#0ea5e9",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "10px 14px",
    background: "#0f172a",
    border: "1px solid #1f2937",
    borderRadius: 10,
    color: "#e5e7eb",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    background: "#3b0d0d",
    border: "1px solid #7f1d1d",
    color: "#fecaca",
    borderRadius: 8,
    padding: "8px 10px",
  },
};
