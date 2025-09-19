// WebRTCPanel.tsx
import { useState } from "react";
import { ProviderToggle } from "../components/ProviderToggle";
import { useProviderTheme } from "../styles/useProviderTheme";
import { TelnyxSection } from "./webrtc/telnyx/TelnyxSection";
import { InfobipSection } from "./webrtc/infobip/InfobipSection";

type Provider = "telnyx" | "sinch" | "infobip";

export default function WebRTCPanel() {
  const [provider, setProvider] = useState<Provider>("telnyx");
  useProviderTheme(provider);

  // el panel sólo necesita saber si hay conexión para ocultar el toggle
  const [connected, setConnected] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        height: "80vh",
      }}
    >
      {provider === "telnyx" ?
        <TelnyxSection onConnectedChange={setConnected} />
      : <InfobipSection onConnectedChange={setConnected} />}

      {!connected && (
        <div style={{ placeSelf: "center" }}>
          <ProviderToggle value={provider} onChange={setProvider} />
        </div>
      )}
    </div>
  );
}
