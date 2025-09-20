import { useEffect, useMemo, useRef, useState } from "react";
import { TelnyxClientProvider } from "../../../providers/telnyx/TelnyxClientProvider";
import { useTelnyx } from "../../../providers/telnyx/context";
import { WebRTCConnectorTelnyx } from "./WebRTCConnectorTelnyx";
import { PhonePad } from "../../../components/PhonePad";
import { Timer } from "../../Timer";

type DialerStatus = "idle" | "calling" | "in-call" | "ended";

type Props = {
  onConnectedChange?: (connected: boolean) => void;
};

const isE164 = (v: string) => /^\+\d{7,15}$/.test(v);

export function TelnyxSection({ onConnectedChange }: Props) {
  return (
    <TelnyxClientProvider>
      <TelnyxInner onConnectedChange={onConnectedChange} />
    </TelnyxClientProvider>
  );
}

function TelnyxInner({ onConnectedChange }: Props) {
  const tx = useTelnyx();

  const [to, setTo] = useState("");
  const [status, setStatus] = useState<DialerStatus>("idle");

  const connected = tx.state.connected;
  const hasCall = tx.state.hasCall;
  const isActive = tx.state.isActive;
  const muted = tx.state.muted;

  const canCall = useMemo(
    () => connected && isE164(to) && !hasCall,
    [connected, to, hasCall]
  );
  const showTimer = isActive;

  const prev = useRef({ hasCall: false, isActive: false });
  useEffect(() => {
    const p = prev.current;

    if (isActive && !p.isActive) {
      setStatus("in-call");
    } else if (hasCall && !isActive) {
      setStatus("calling");
    } else if (!hasCall && (p.isActive || p.hasCall)) {
      setStatus("ended");
    } else if (!hasCall && !isActive && !p.hasCall && !p.isActive) {
      setStatus("idle");
    }

    prev.current = { hasCall, isActive };
  }, [hasCall, isActive]);

  function call() {
    if (!canCall) return;
    const from = import.meta.env.VITE_TELNYX_NUMBER;
    if (!from) {
      console.warn("VITE_TELNYX_NUMBER no está configurado.");
      return;
    }
    tx.callNumber(to, from);
    setStatus("calling");
  }

  function hangUp() {
    if (!isActive) return;
    tx.hangup();
    setStatus("ended");
  }

  function toggleMute() {
    if (!isActive) return;
    tx.toggleMute();
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: connected ? "1fr 1fr" : "1fr",
        gap: 20,
        alignItems: "center",
        justifyItems: "center",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 16,
          placeItems: "center",
          minWidth: 320,
          transform: connected ? "translateX(-40px)" : "translateX(0px)",
          transition: "transform 320ms ease",
        }}
      >
        <WebRTCConnectorTelnyx
          onConnectedChange={onConnectedChange}
          onStatusRight={setStatus}
        />

        {connected && (
          <div style={{ display: "flex", gap: 8 }}>
            {!hasCall && (
              <button
                onClick={call}
                disabled={!canCall}
                style={styles.btnPrimary}
              >
                Call
              </button>
            )}

            {hasCall && !isActive && (
              <button style={{ ...styles.btnGhost, opacity: 0.8 }} disabled>
                Calling…
              </button>
            )}

            {isActive && (
              <>
                <button onClick={hangUp} style={styles.btnGhost}>
                  Hang up
                </button>
                <button onClick={toggleMute} style={styles.btnGhost}>
                  {muted ? "Unmute" : "Mute"}
                </button>
              </>
            )}
          </div>
        )}

        {showTimer && (
          <div style={styles.timerPill}>
            <strong>Call time: </strong>
            <Timer running />
          </div>
        )}
      </div>

      {connected && (
        <div
          style={{
            opacity: connected ? 1 : 0,
            transform: connected ? "translateX(0px)" : "translateX(20px)",
            transition: "opacity 260ms ease, transform 320ms ease",
          }}
        >
          <PhonePad
            title="To"
            status={status}
            value={to}
            onChange={setTo}
            disabled={false}
            historyKey="webrtc-to"
            sx={{ justifySelf: "end" }}
          />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
  timerPill: {
    border: "1px solid #1f2937",
    background: "#0f172a",
    borderRadius: 999,
    padding: "6px 12px",
  },
};
