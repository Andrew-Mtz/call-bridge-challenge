import { useState } from "react";
import { getWebRTCToken } from "../../../lib/api";
import { useMicPermission } from "../../../hooks/useMicPermission";
import { useIdentity } from "../../../hooks/useIdentity";
import { useInfobip } from "../../../providers/infobip/context";
import { IdentityForm } from "./IdentityForm";
import { MyIdentityBadge } from "./MyIdentityBadge";

type DialerStatus = "idle" | "calling" | "in-call" | "ended";

type Props = {
  onConnectedChange?: (connected: boolean) => void;
  onStatusRight: (s: DialerStatus) => void;
};

const INFOBIP_IDENTITY_KEY = "webrtc:infobip:identity";

export function WebRTCConnectorInfobip({
  onConnectedChange,
  onStatusRight,
}: Props) {
  const { ensureMicPermission } = useMicPermission();
  const ib = useInfobip();
  const id = useIdentity(INFOBIP_IDENTITY_KEY);

  const [connecting, setConnecting] = useState(false);
  const connected = ib.state.connected;

  async function connect() {
    const ok = await ensureMicPermission();
    if (!ok) return;

    setConnecting(true);
    try {
      const chosenId =
        ib.state.connected ?
          id.myIdentity
        : id.myIdentity || crypto.randomUUID();
      id.persistIdentity(chosenId);

      const displayName = id.customIdentity?.trim() || undefined;

      const { token } = await getWebRTCToken("infobip", {
        identity: chosenId,
        displayName: displayName || chosenId,
      });

      ib.connect(token, () => {
        setConnecting(false);
        onConnectedChange?.(true);
        onStatusRight("idle");
      });
    } catch (e) {
      console.error("infobip connect error", e);
      setConnecting(false);
    }
  }

  function disconnect() {
    ib.disconnect();
    onConnectedChange?.(false);
    onStatusRight("idle");
  }

  return (
    <div
      style={{
        display: connected ? "flex" : "grid",
        gap: 10,
        placeItems: "center",
      }}
    >
      {/* sólo audio remoto; el video remoto lo pinta InfobipSection */}
      <audio id="remoteMedia" autoPlay playsInline />

      {!connected && (
        <IdentityForm
          value={id.customIdentity}
          onChange={id.setCustomIdentity}
          onRandom={id.randomize}
        />
      )}
      {connected && id.myIdentity && (
        <MyIdentityBadge
          identity={id.myIdentity}
          onCopy={id.copy}
          copied={id.copied}
        />
      )}

      {!connected ?
        <button onClick={connect} disabled={connecting} style={btnPrimary}>
          {connecting ? "Connecting..." : "Connect headset"}
        </button>
      : <button onClick={disconnect} style={btnDisconnect}>
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
/* const btnDisconnectGhost: React.CSSProperties = {
  padding: "10px 14px",
  background: "#0f172a",
  border: "1px solid #7f1d1d", // red-800
  borderRadius: 10,
  color: "#fecaca", // red-100 (texto)
  fontWeight: 600,
  cursor: "pointer",
}; */
const btnDisconnect: React.CSSProperties = {
  padding: "10px 14px",
  background: "#dc2626", // red-600
  border: "1px solid #b91c1c", // red-700
  borderRadius: 10,
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(220,38,38,0.18)", // sutil glow
};
