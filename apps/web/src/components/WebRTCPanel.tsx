import { useState, useMemo } from "react";
import { PhonePad } from "../components/PhonePad";
import { ProviderToggle } from "../components/ProviderToggle";
import { WebRTCDialer } from "../components/WebRTCDialer";
import { useProviderTheme } from "../styles/useProviderTheme";
import { Timer } from "./Timer";

type DialerStatus = "idle" | "calling" | "in-call" | "ended";
type Provider = "telnyx" | "sinch" | "infobip";

export default function WebRTCPanel() {
  const [provider, setProvider] = useState<Provider>("telnyx");
  useProviderTheme(provider);

  const [to, setTo] = useState("");
  const [stateTo, setStateTo] = useState<DialerStatus>("idle");
  const [connected, setConnected] = useState(false);

  const inCall = useMemo(() => stateTo === "in-call", [stateTo]);

  return (
    <div style={styles.row}>
      <PhonePad
        title="To"
        status={stateTo}
        value={to}
        onChange={setTo}
        disabled={false}
        historyKey="webrtc-to"
        sx={{ justifySelf: "end" }}
      />

      <div style={styles.controlsCol}>
        <WebRTCDialer
          to={to}
          onStatusRight={setStateTo}
          onConnectedChange={setConnected}
        />

        {inCall && (
          <div style={styles.timerBox}>
            <strong>Call time:</strong> <Timer running={inCall} />
          </div>
        )}

        <div
          style={{
            opacity: connected ? 0.5 : 1,
            pointerEvents: connected ? "none" : "auto",
          }}
        >
          <ProviderToggle value={provider} onChange={setProvider} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    alignItems: "center",
    justifyItems: "center",
  },
  controlsCol: {
    display: "grid",
    gap: 16,
    placeItems: "center",
    justifyContent: "center",
  },
  timerBox: {
    border: "1px solid #1f2937",
    background: "#0f172a",
    borderRadius: 12,
    padding: 10,
    width: 200,
    textAlign: "center",
  },
};
