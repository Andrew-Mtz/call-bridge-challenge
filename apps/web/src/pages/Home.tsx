import { useState } from "react";
import { ModeTabs } from "../components/ModeTabs";
import PSTNPanel from "../components/PSTNPanel";
import WebRTCPanel from "../components/WebRTCPanel";

export default function Home() {
  const [mode, setMode] = useState<"pstn" | "webrtc">("pstn");

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <ModeTabs value={mode} onChange={setMode} />
      </div>

      {mode === "pstn" ? <PSTNPanel /> : <WebRTCPanel />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "#0b1220",
    color: "#e5e7eb",
    padding: 24,
    display: "grid",
    gap: 24,
  },
  topbar: { display: "flex", justifyContent: "center", alignItems: "center" },
};
