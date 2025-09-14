import { useState } from "react";
import { PhonePad } from "../components/PhonePad";
import { ProviderToggle } from "../components/ProviderToggle";
import { WebRTCDialer } from "../components/WebRTCDialer";

type DialerStatus = "idle" | "calling" | "in-call" | "ended";

export default function WebRTCPanel() {
  const [provider, setProvider] = useState<"telnyx" | "sinch" | "infobip">(
    "telnyx"
  );
  const [to, setTo] = useState("");
  const [stateTo, setStateTo] = useState<DialerStatus>("idle");
  const [connected, setConnected] = useState(false);

  return (
    <div style={styles.row}>
      <PhonePad
        title="To"
        status={stateTo}
        value={to}
        onChange={setTo}
        disabled={false}
        sx={{ justifySelf: "end" }}
      />
      <div style={styles.controlsCol}>
        {/* Dialer renders Connect / Disconnect / Call / Hang up / Mute */}
        <WebRTCDialer
          to={to}
          onStatusRight={setStateTo}
          onConnectedChange={setConnected}
        />
        {/* Provider selection only before connecting */}
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
};
