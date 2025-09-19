import { useState } from "react";
import { getWebRTCToken } from "../../../lib/api";
import { useMicPermission } from "../../../hooks/useMicPermission";
import { useTelnyx } from "../../../providers/telnyx/context";

type DialerStatus = "idle" | "calling" | "in-call" | "ended";

type Props = {
  onConnectedChange?: (connected: boolean) => void;
  onStatusRight: (s: DialerStatus) => void;
};

export function WebRTCConnectorTelnyx({
  onConnectedChange,
  onStatusRight,
}: Props) {
  const { ensureMicPermission } = useMicPermission();
  const tx = useTelnyx();

  const [connecting, setConnecting] = useState(false);
  const connected = tx.state.connected;

  async function connect() {
    const ok = await ensureMicPermission();
    if (!ok) return;
    setConnecting(true);
    try {
      const { token } = await getWebRTCToken("telnyx");
      tx.connect(token, () => {
        setConnecting(false);
        onConnectedChange?.(true);
        onStatusRight("idle");
      });
    } catch (e) {
      console.error("telnyx connect error", e);
      setConnecting(false);
    }
  }

  function disconnect() {
    tx.disconnect();
    onConnectedChange?.(false);
    onStatusRight("idle");
  }

  return (
    <div style={{ display: "grid", gap: 10, placeItems: "center" }}>
      <audio id="remoteMedia" autoPlay playsInline />
      {!connected ?
        <button onClick={connect} disabled={connecting} style={btnPrimary}>
          {connecting ? "Connecting..." : "Connect headset"}
        </button>
      : <button onClick={disconnect} style={btnGhost}>
          Disconnect
        </button>
      }
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  background: "#0ea5e9",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  padding: "10px 14px",
  background: "#0f172a",
  border: "1px solid #1f2937",
  borderRadius: 10,
  color: "#e5e7eb",
  fontWeight: 600,
  cursor: "pointer",
};
