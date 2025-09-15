import { useState, useEffect, useRef } from "react";
import { BASE, startBridge } from "../lib/api";
import { PhonePad } from "../components/PhonePad";
import { ProviderToggle } from "../components/ProviderToggle";
import { useProviderTheme } from "../styles/useProviderTheme";
import { addHistory } from "../lib/callHistory";
import { Timer } from "./Timer";

type Provider = "telnyx" | "sinch" | "infobip";

function mapLegStatus(s?: string) {
  switch (s) {
    case "dialing":
      return "calling";
    case "answered":
      return "answered";
    case "bridged":
      return "in-call";
    case "ended":
      return "ended";
    default:
      return "idle";
  }
}

export default function PstnPanel() {
  const esRef = useRef<EventSource | null>(null);
  const [provider, setProvider] = useState<Provider>("telnyx");
  useProviderTheme(provider);

  const looksE164 = (v: string) => /^\+\d{7,15}$/.test(v);
  const sanitizeE164 = (v: string) => {
    // allow leading +, digits only after, max 16 chars total
    let out = v.replace(/[^\d+]/g, "");
    if (out.startsWith("+")) out = "+" + out.slice(1).replace(/[^\d]/g, "");
    else out = out.replace(/[^\d]/g, "");
    return out.slice(0, 16);
  };

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [stateFrom, setStateFrom] = useState("idle");
  const [stateTo, setStateTo] = useState("idle");

  // Call timer: start on bridged, stop on ended
  const [inCall, setInCall] = useState(false);

  function openSSE(id: string) {
    esRef.current?.close();
    const es = new EventSource(`${BASE}/api/calls/${id}/events`);
    esRef.current = es;

    const handler = (e: MessageEvent) => {
      try {
        const { session } = JSON.parse(e.data);
        setStateFrom(mapLegStatus(session?.a?.status));
        setStateTo(prev => {
          const b = session?.b?.status as string | undefined;
          return b ? mapLegStatus(b) : prev;
        });

        // Timer control
        if (session?.status === "bridged") setInCall(true);
        if (session?.status === "ended") {
          setInCall(false);
          es.close();
        }
      } catch {
        /* ignore */
      }
    };

    es.addEventListener("update", handler);
    es.onmessage = handler;
    es.onerror = () => {};
  }

  useEffect(() => () => esRef.current?.close(), []);

  async function dial() {
    if (!from || !to || loading || provider !== "telnyx") return;
    setError(null);
    setLoading(true);
    setInCall(false);
    setStateFrom("calling");
    setStateTo("holding");
    try {
      const { sessionId } = await startBridge({ fromPhone: from, toPhone: to });
      addHistory("from", from);
      addHistory("to", to);
      setSessionId(sessionId);
      openSSE(sessionId);
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
    looksE164(from) && looksE164(to) && !loading && provider === "telnyx";

  return (
    <div style={styles.phonesRow}>
      <PhonePad
        title="From"
        status={stateFrom}
        value={from}
        onChange={v => setFrom(sanitizeE164(v))}
        disabled={loading}
        historyKey="from"
        sx={{ justifySelf: "end" }}
      />
      <div style={styles.centerCol}>
        <div style={styles.connector}>
          <div
            style={{
              ...styles.half,
              opacity: stateFrom !== "idle" ? 1 : 0.3,
            }}
          />
          <div
            style={{ ...styles.half, opacity: stateTo !== "idle" ? 1 : 0.3 }}
          />
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

        {inCall && (
          <div style={styles.timerBox}>
            <strong>Call time:</strong> <Timer running={inCall} />
          </div>
        )}

        {sessionId && (
          <div style={styles.sessionBox}>
            <div>
              <strong>sessionId:</strong> <code>{sessionId}</code>
            </div>
          </div>
        )}
        {error && <div style={styles.error}>{error}</div>}
      </div>
      <PhonePad
        title="To"
        status={stateTo}
        value={to}
        onChange={v => setTo(sanitizeE164(v))}
        disabled={loading}
        historyKey="to"
        sx={{ justifySelf: "start" }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  phonesRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 20,
    alignItems: "center",
    justifyItems: "center",
  },
  centerCol: {
    display: "grid",
    gap: 16,
    placeItems: "center",
    justifyContent: "center",
  },
  callBtn: {
    padding: "12px 18px",
    background: "var(--accent)",
    border: "none",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  callBtnDisabled: {
    padding: "12px 18px",
    background: "#1f2937",
    border: "none",
    borderRadius: 12,
    color: "#9ca3af",
    fontWeight: 700,
    cursor: "not-allowed",
  },
  connector: {
    width: 160,
    height: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 4,
    marginBottom: 8,
  },
  half: {
    height: "100%",
    background: "var(--accent)",
    borderRadius: 999,
    transition: "opacity 200ms ease",
  },
  sessionBox: {
    border: "1px solid #1f2937",
    background: "#0f172a",
    borderRadius: 12,
    padding: 12,
    width: 360,
    textAlign: "center",
  },
  timerBox: {
    border: "1px solid #1f2937",
    background: "#0f172a",
    borderRadius: 12,
    padding: 10,
    width: 200,
    textAlign: "center",
  },
  error: {
    background: "#3b0d0d",
    border: "1px solid #7f1d1d",
    color: "#fecaca",
    borderRadius: 10,
    padding: "10px 12px",
    width: 360,
    textAlign: "center",
  },
};
