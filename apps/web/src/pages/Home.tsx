import { useState } from "react";
import { startBridge } from "../lib/api";
import { PhonePad } from "../components/PhonePad";
import { ProviderToggle } from "../components/ProviderToggle";
import { ModeTabs } from "../components/ModeTabs";

export default function Home() {
  const [mode, setMode] = useState<"pstn"|"webrtc">("pstn");
  const [provider, setProvider] = useState<"telnyx"|"sinch"|"infobip">("telnyx");

  const looksE164 = (v: string) => /^\+\d{7,15}$/.test(v);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [sessionId, setSessionId] = useState<string|null>(null);

  // Local UI states (T3 this will come from SSE)
  const [stateFrom, setStateFrom] = useState("idle");
  const [stateTo, setStateTo] = useState("idle");

  async function dial() {
    if (!from || !to || loading || mode !== "pstn" || provider !== "telnyx") return;
    setError(null);
    setLoading(true);
    setStateFrom("calling");
    setStateTo("holding");
    try {
      const { sessionId } = await startBridge({ fromPhone: from, toPhone: to });
      setSessionId(sessionId);
      // In T3: open SSE here and update real states.
    } catch (e: unknown) {
      if (typeof e === "object" && e !== null && "message" in e) {
        setError((e as { message?: string }).message ?? "Error");
      } else {
        setError("Error");
      }
      setStateFrom("idle");
      setStateTo("idle");
    } finally {
      setLoading(false);
    }
  }

  const canDial =
  looksE164(from) &&
  looksE164(to) &&
  !loading &&
  mode === "pstn" &&
  provider === "telnyx";

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <ModeTabs value={mode} onChange={setMode} />
      </div>

      <div style={styles.phonesRow}>
        <PhonePad title="From" status={stateFrom} value={from} onChange={setFrom} disabled={loading} sx={{justifySelf: 'end'}} />
        <div style={styles.centerCol}>
          <div style={styles.connector}>
            <div style={{ ...styles.half, opacity: stateFrom !== "idle" ? 1 : 0.3 }} />
            <div style={{ ...styles.half, opacity: stateTo !== "idle" ? 1 : 0.3 }} />
          </div>
          <button
            onClick={dial}
            disabled={!canDial}
            style={canDial ? styles.callBtn : styles.callBtnDisabled}
            title={provider !== "telnyx" ? "Only Telnyx enabled for now" : ""}
          >
            {loading ? "Dialing..." : "Call"}
          </button>
          <ProviderToggle value={provider} onChange={setProvider} />
          {sessionId && (
            <div style={styles.sessionBox}>
              <div><strong>sessionId:</strong> <code>{sessionId}</code></div>
              <small>In T3 we will show live events (ringing / answered / bridged).</small>
            </div>
          )}
          {error && <div style={styles.error}>{error}</div>}
        </div>
        <PhonePad title="To" status={stateTo} value={to} onChange={setTo} disabled={loading} sx={{justifySelf: 'start'}} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100dvh", background:"#0b1220", color:"#e5e7eb", padding: 24, display:"grid", gap: 24 },
  topbar: { display:"flex", justifyContent:"center", alignItems:"center" },
  phonesRow: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 20, alignItems:"center", justifyItems:"center" },
  centerCol: { display:"grid", gap: 16, placeItems:"center", justifyContent: 'center' },
  callBtn: { padding:"12px 18px", background:"#0ea5e9", border:"none", borderRadius:12, color:"#fff", fontWeight:700, cursor:"pointer" },
  callBtnDisabled: { padding:"12px 18px", background:"#1f2937", border:"none", borderRadius:12, color:"#9ca3af", fontWeight:700, cursor:"not-allowed" },
  connector: { width: 160, height: 10, display:"grid", gridTemplateColumns:"1fr 1fr", gap: 4, marginBottom: 8 },
  half: { height: "100%", background:"#22d3ee", borderRadius: 999, transition:"opacity 200ms ease" },
  sessionBox: { border:"1px solid #1f2937", background:"#0f172a", borderRadius:12, padding:12, width: 360, textAlign:"center" },
  error: { background:"#3b0d0d", border:"1px solid #7f1d1d", color:"#fecaca", borderRadius:10, padding:"10px 12px", width: 360, textAlign:"center" },
};
