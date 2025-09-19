import { useEffect, useState } from "react";
import { useInfobip } from "../../../providers/infobip/context";
import { IncomingCallModal } from "./IncomingCallModal";
import { Timer } from "../../Timer";

const isE164 = (v: string) => /^\+\d{7,15}$/.test(v);
const isNonEmpty = (v: string) => typeof v === "string" && v.trim().length > 0;

type Props = {
  to: string;
  onStatusRight: (s: "idle" | "calling" | "in-call" | "ended") => void;
};

export function InfobipConsole({ to, onStatusRight }: Props) {
  const {
    state: ib,
    callIdentity,
    callIdentityVideo,
    callPhone,
    answer,
    reject,
    hangup,
    toggleMute,
  } = useInfobip();

  const [isVideoCall, setIsVideoCall] = useState(false);

  // Derivar estados a Panel (timer)
  useEffect(() => {
    if (ib.isActive) onStatusRight("in-call");
    else if (ib.hasCall) onStatusRight("calling");
    else onStatusRight("idle");
  }, [ib.isActive, ib.hasCall, onStatusRight]);

  // preview local cuando conectado y sin llamada (para video)
  useEffect(() => {
    const shouldPreview = ib.connected && !ib.hasCall;
    const pv = document.getElementById(
      "localPreviewPanel"
    ) as HTMLVideoElement | null;

    (async () => {
      const prev = (pv?.srcObject as MediaStream | null) || null;
      prev?.getTracks().forEach(t => t.stop());
      if (pv) pv.srcObject = null;

      if (shouldPreview) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          if (pv) pv.srcObject = s;
        } catch {
          /* empty */
        }
      }
    })();

    return () => {
      const s = (pv?.srcObject as MediaStream | null) || null;
      s?.getTracks().forEach(t => t.stop());
      if (pv) pv.srcObject = null;
    };
  }, [ib.connected, ib.hasCall]);

  function callAudio() {
    if (!ib.connected || !isNonEmpty(to)) return;
    if (to.startsWith("+")) {
      const from = import.meta.env.VITE_INFOBIP_NUMBER;
      if (!from) return;
      callPhone(to, from);
    } else {
      setIsVideoCall(false);
      callIdentity(to);
    }
  }
  function callVideo() {
    if (!ib.connected || !isNonEmpty(to) || isE164(to)) return;
    setIsVideoCall(true);
    callIdentityVideo(to);
  }

  function toggleCamPreview() {
    const pv = document.getElementById(
      "localPreviewPanel"
    ) as HTMLVideoElement | null;
    const s = (pv?.srcObject as MediaStream | null) || null;
    const track = s?.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
  }

  return (
    <div style={{ display: "grid", gap: 14, placeItems: "center" }}>
      {/* Input + botones (estos los renderiza el Panel, pero si querés aquí también sirve) */}

      {/* Vista media / card */}
      {ib.isActive && !isVideoCall ?
        <div style={styles.callCard}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>In call (audio)</div>
          <div style={{ opacity: 0.9, marginTop: 6 }}>
            With: <strong>{to || "Unknown"}</strong>
          </div>
          <div style={{ marginTop: 10 }}>
            <strong>Call time:</strong> <Timer running={true} />
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginTop: 12,
            }}
          >
            <button onClick={toggleMute} style={btnGhost}>
              {ib.muted ? "Unmute" : "Mute"}
            </button>
            <button onClick={hangup} style={btnGhost}>
              Hang up
            </button>
          </div>
        </div>
      : <>
          <video
            id="remoteVideo"
            autoPlay
            playsInline
            style={{ maxWidth: 420, borderRadius: 12 }}
          />
          {!ib.hasCall && (
            <div style={{ display: "grid", gap: 6, placeItems: "center" }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Camera preview</div>
              <video
                id="localPreviewPanel"
                autoPlay
                playsInline
                muted
                style={{ width: 220, borderRadius: 8, background: "#0b1220" }}
              />
            </div>
          )}
        </>
      }

      {/* Fila de 4 botones (cuando no es audio-only) */}
      {(!ib.isActive || isVideoCall) && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={toggleMute} style={btnGhost}>
            {ib.muted ? "Unmute" : "Mute"}
          </button>
          <button onClick={toggleCamPreview} style={btnGhost}>
            OnCam / OffCam
          </button>
          <button
            onClick={() => {
              const rv = document.getElementById(
                "remoteVideo"
              ) as HTMLVideoElement | null;
              if (rv)
                rv.style.maxWidth =
                  rv.style.maxWidth === "720px" ? "420px" : "720px";
            }}
            style={btnGhost}
          >
            View
          </button>
          <button onClick={hangup} style={btnGhost}>
            Hang up
          </button>
        </div>
      )}

      {/* Modal entrante */}
      <IncomingCallModal
        from={ib.pendingFrom || "Unknown"}
        open={ib.hasPending}
        onAnswerAudio={() => {
          answer(false);
          onStatusRight("calling");
        }}
        onAnswerVideo={() => {
          answer(true);
          onStatusRight("calling");
        }}
        onReject={reject}
        preview={
          <video
            id="localPreview"
            autoPlay
            playsInline
            muted
            style={{ width: 200, borderRadius: 8, background: "#0b1220" }}
          />
        }
      />

      {/* Botones de llamada arriba/afuera (si preferís): */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={callAudio}
          style={btnPrimary}
          disabled={!ib.connected || !isNonEmpty(to)}
        >
          Call
        </button>
        <button
          onClick={callVideo}
          style={btnPrimary}
          disabled={!ib.connected || !isNonEmpty(to) || isE164(to)}
        >
          Video Call
        </button>
      </div>
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
const styles = {
  callCard: {
    width: 320,
    borderRadius: 14,
    padding: 16,
    background: "#0f172a",
    border: "1px solid #1f2937",
    color: "#e5e7eb",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    textAlign: "center" as const,
  },
};
