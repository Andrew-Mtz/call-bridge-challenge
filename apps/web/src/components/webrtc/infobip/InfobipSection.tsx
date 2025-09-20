import { useEffect, useState } from "react";
import { InfobipClientProvider } from "../../../providers/infobip/InfobipClientProvider";
import { WebRTCConnectorInfobip } from "./WebRTCConnectorInfobip";
import { useInfobip } from "../../../providers/infobip/context";
import { IncomingCallModal } from "./IncomingCallModal";
import { Timer } from "../../Timer";

const isE164 = (v: string) => /^\+\d{7,15}$/.test(v);
const isNonEmpty = (v: string) => typeof v === "string" && v.trim().length > 0;

export function InfobipSection({
  onConnectedChange,
}: {
  onConnectedChange?: (c: boolean) => void;
}) {
  return (
    <InfobipClientProvider>
      <InfobipInner onConnectedChange={onConnectedChange} />
    </InfobipClientProvider>
  );
}

function InfobipInner({
  onConnectedChange,
}: {
  onConnectedChange?: (c: boolean) => void;
}) {
  const ibCtx = useInfobip();

  const [to, setTo] = useState("");
  const [connected, setConnected] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [peerName, setPeerName] = useState<string>("");

  const [camAllowed, setCamAllowed] = useState(false);

  function handleConnectedChange(v: boolean) {
    setConnected(v);
    onConnectedChange?.(v);
  }

  useEffect(() => {
    if (ibCtx.state.hasPending && ibCtx.state.pendingFrom) {
      setPeerName(ibCtx.state.pendingFrom);
    }
  }, [ibCtx.state.hasPending, ibCtx.state.pendingFrom]);

  useEffect(() => {
    const shouldPreview =
      ibCtx.state.connected && !ibCtx.state.hasCall && camAllowed;
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
          /* noop */
        }
      }
    })();

    return () => {
      const s = (pv?.srcObject as MediaStream | null) || null;
      s?.getTracks().forEach(t => t.stop());
      if (pv) pv.srcObject = null;
    };
  }, [ibCtx.state.connected, ibCtx.state.hasCall, camAllowed]);

  useEffect(() => {
    if (!ibCtx.state.hasCall) return;
    const v = document.getElementById("remoteVideo") as HTMLVideoElement | null;
    const a = document.getElementById("remoteMedia") as HTMLAudioElement | null;
    const stream = ibCtx.getRemoteStream?.();
    if (stream) {
      if (v && v.srcObject !== stream) {
        v.srcObject = stream;
        v.muted = true;
        v.onloadedmetadata = () => v.play().catch(() => {});
      }
      if (a && a.srcObject !== stream) {
        a.srcObject = stream;
        a.onloadedmetadata = () => a.play().catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ibCtx.state.hasCall, ibCtx.state.isActive, ibCtx.getRemoteStream]);

  async function checkCameraGranted() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const anyCamWithLabel = devices.some(
        d => d.kind === "videoinput" && !!d.label
      );
      if (anyCamWithLabel) {
        setCamAllowed(true);
        return true;
      }
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: "camera" });
        if (status.state === "granted") {
          setCamAllowed(true);
          return true;
        }
        status.onchange = () => {
          if (status.state === "granted") setCamAllowed(true);
        };
      }

      setCamAllowed(false);
      return false;
    } catch {
      setCamAllowed(false);
      return false;
    }
  }

  async function requestCam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setCamAllowed(true);
      const pv = document.getElementById(
        "localPreviewPanel"
      ) as HTMLVideoElement | null;
      if (pv) pv.srcObject = s;
    } catch {
      setCamAllowed(false);
    }
  }

  function callAudio() {
    if (!ibCtx.state.connected || !isNonEmpty(to)) return;
    setPeerName(to);
    setIsVideoCall(false);
    if (to.startsWith("+")) {
      const from = import.meta.env.VITE_INFOBIP_NUMBER;
      if (!from) return;
      ibCtx.callPhone(to, from);
    } else {
      ibCtx.callIdentity(to);
    }
  }

  function callVideo() {
    if (!camAllowed) return;
    if (!ibCtx.state.connected || !isNonEmpty(to) || isE164(to)) return;
    setPeerName(to);
    setIsVideoCall(true);
    ibCtx.callIdentityVideo(to);
  }

  function toggleCamPreview() {
    const pv = document.getElementById(
      "localPreviewPanel"
    ) as HTMLVideoElement | null;
    const s = (pv?.srcObject as MediaStream | null) || null;
    const track = s?.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
  }

  function toggleMute() {
    ibCtx.toggleMute();
  }
  function hangup() {
    ibCtx.hangup();
  }

  const callStatusLabel =
    ibCtx.state.isActive ?
      isVideoCall ? "In video call"
      : "In audio call"
    : ibCtx.state.hasCall ? "Calling…"
    : "Idle";

  useEffect(() => {
    const pv = document.getElementById(
      "localPreview"
    ) as HTMLVideoElement | null;
    const should = ibCtx.state.hasPending && ibCtx.state.pendingIsVideo && !!pv;

    let stream: MediaStream | null = null;

    (async () => {
      try {
        if (should) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          if (pv) pv.srcObject = stream;
          setCamAllowed(true);
        } else if (pv) {
          const prev = (pv.srcObject as MediaStream | null) || null;
          prev?.getTracks().forEach(t => t.stop());
          pv.srcObject = null;
        }
      } catch {
        /* noop */
      }
    })();

    return () => {
      if (pv) {
        const prev = (pv.srcObject as MediaStream | null) || stream;
        prev?.getTracks().forEach(t => t.stop());
        pv.srcObject = null;
      }
    };
  }, [ibCtx.state.hasPending, ibCtx.state.pendingIsVideo]);

  useEffect(() => {
    checkCameraGranted();
  }, [connected]);

  useEffect(() => {
    const onDevChange = () => checkCameraGranted();
    navigator.mediaDevices?.addEventListener?.("devicechange", onDevChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        onDevChange
      );
    };
  }, []);

  const showCallInputs = connected && !ibCtx.state.hasCall;

  return (
    <div
      style={{
        ...styles.wrap,
        justifyContent: connected ? "space-between" : "center",
        height: connected ? "100%" : "auto",
      }}
    >
      <WebRTCConnectorInfobip
        onConnectedChange={handleConnectedChange}
        onStatusRight={() => {}}
      />

      {connected && (
        <>
          {showCallInputs && (
            <>
              {camAllowed ?
                <div style={{ display: "grid", gap: 6, placeItems: "center" }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Camera preview
                  </div>
                  <video
                    id="localPreviewPanel"
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: 420,
                      borderRadius: 8,
                      background: "#0b1220",
                    }}
                  />
                  <div style={styles.circleRow}>
                    <button
                      onClick={toggleCamPreview}
                      style={styles.btnCircle}
                      aria-label="Toggle camera"
                    >
                      <IconCamera />
                    </button>
                  </div>
                </div>
              : <div style={styles.placeholderCam}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    Permisos necesarios
                  </div>
                  <div
                    style={{
                      opacity: 0.8,
                      marginBottom: 10,
                      textAlign: "center",
                    }}
                  >
                    Para iniciar una videollamada necesitamos acceso a tu
                    cámara.
                  </div>
                  <button onClick={requestCam} style={styles.btnPrimary}>
                    Conceder cámara
                  </button>
                </div>
              }
              <div style={styles.row}>
                <div style={{ display: "grid", gap: 6, flex: 1 }}>
                  <label style={{ fontWeight: 600 }}>
                    Peer identity (Infobip)
                  </label>
                  <input
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    placeholder="p.ej. andy-B-1234"
                    style={styles.input}
                  />
                </div>
                <div
                  style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
                >
                  <button
                    onClick={callAudio}
                    style={
                      !isNonEmpty(to) ?
                        styles.btnPrimaryDisabled
                      : styles.btnPrimary
                    }
                    disabled={!isNonEmpty(to)}
                  >
                    Call
                  </button>
                  <button
                    onClick={callVideo}
                    style={
                      !isNonEmpty(to) || isE164(to) || !camAllowed ?
                        styles.btnPrimaryDisabled
                      : styles.btnPrimary
                    }
                    disabled={!isNonEmpty(to) || isE164(to) || !camAllowed}
                  >
                    Video Call
                  </button>
                </div>
              </div>
            </>
          )}
          {ibCtx.state.hasCall && (
            <>
              {isVideoCall ?
                <>
                  <video
                    id="remoteVideo"
                    autoPlay
                    playsInline
                    style={{ maxWidth: 420, borderRadius: 12, width: "100%" }}
                  />
                  <div style={styles.circleRow}>
                    <button
                      onClick={toggleMute}
                      style={styles.btnCircle}
                      aria-label="Toggle mute"
                    >
                      {ibCtx.state.muted ?
                        <IconMicOff />
                      : <IconMic />}
                    </button>
                    <button
                      onClick={hangup}
                      style={styles.btnCircleDanger}
                      aria-label="Hang up"
                    >
                      <IconPhoneDown />
                    </button>
                  </div>
                </>
              : <div style={styles.callCardContainer}>
                  <div style={styles.callCard}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {callStatusLabel}
                    </div>
                    <div style={{ opacity: 0.9, marginTop: 6 }}>
                      With: <strong>{peerName || "Unknown"}</strong>
                    </div>
                    <div style={styles.timerPill}>
                      <strong>Call time:</strong>{" "}
                      <Timer running={ibCtx.state.isActive} />
                    </div>
                    <div style={styles.circleRow}>
                      {
                        ibCtx.state.isActive ?
                          <>
                            <button
                              onClick={toggleMute}
                              style={styles.btnCircle}
                              aria-label="Toggle mute"
                            >
                              {ibCtx.state.muted ?
                                <IconMicOff />
                              : <IconMic />}
                            </button>
                            <button
                              onClick={hangup}
                              style={styles.btnCircleDanger}
                              aria-label="Hang up"
                            >
                              <IconPhoneDown />
                            </button>
                          </>
                          // todavía está "Calling…" (ringing/connecting): sólo permitir cancelar
                        : <button
                            onClick={hangup}
                            style={styles.btnCircleDanger}
                            aria-label="Cancel call"
                          >
                            <IconPhoneDown />
                          </button>

                      }
                    </div>
                  </div>
                </div>
              }
            </>
          )}
          <IncomingCallModal
            from={ibCtx.state.pendingFrom || "Unknown"}
            open={ibCtx.state.hasPending}
            mode={ibCtx.state.pendingIsVideo ? "video" : "audio"}
            onAnswer={() => {
              if (ibCtx.state.pendingFrom) setPeerName(ibCtx.state.pendingFrom);
              ibCtx.answer(!!ibCtx.state.pendingIsVideo);
              setIsVideoCall(!!ibCtx.state.pendingIsVideo);
            }}
            onReject={ibCtx.reject}
            preview={
              ibCtx.state.pendingIsVideo ?
                <video
                  id="localPreview"
                  autoPlay
                  playsInline
                  muted
                  style={{ width: 200, borderRadius: 8, background: "#0b1220" }}
                />
              : undefined
            }
          />
        </>
      )}
    </div>
  );
}
const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    alignItems: "center",
    height: "100%",
  },
  row: {
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
    width: "min(680px, 92vw)",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #1f2937",
    background: "#0f172a",
    color: "#e5e7eb",
    width: "100%",
  },
  btnPrimary: {
    padding: "10px 14px",
    background: "#0ea5e9",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnPrimaryDisabled: {
    padding: "10px 14px",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 700,
    background: "#075985",
    opacity: 0.6,
    cursor: "not-allowed",
    filter: "saturate(70%)",
    boxShadow: "none",
    pointerEvents: "none",
  },
  btnCircle: {
    width: 52,
    height: 52,
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #1f2937",
    background: "#0f172a",
    color: "#e5e7eb",
    cursor: "pointer",
  },
  btnCircleDanger: {
    width: 52,
    height: 52,
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #7f1d1d",
    color: "#e5e7eb",
    cursor: "pointer",
    background: "#7f1d1d",
  },
  circleRow: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    marginTop: 12,
  },
  placeholderCam: {
    width: 420,
    borderRadius: 12,
    border: "1px solid #1f2937",
    background: "#0b1220",
    color: "#e5e7eb",
    padding: 16,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
  },
  callCardContainer: {
    flex: 1,
    display: "flex",
    alignItems: "center",
  },
  callCard: {
    width: 340,
    borderRadius: 14,
    padding: 16,
    background: "#0f172a",
    border: "1px solid #1f2937",
    color: "#e5e7eb",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    textAlign: "center",
    height: "fit-content",
  },
  timerPill: {
    border: "1px solid #1f2937",
    background: "#0f172a",
    width: "fit-content",
    margin: "12px auto",
    borderRadius: 999,
    padding: "6px 12px",
  },
};

/* Ícons */
function IconMic() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M19 11a7 7 0 0 1-14 0" stroke="currentColor" strokeWidth="2" />
      <path d="M12 18v4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function IconMicOff() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 9v2a3 3 0 0 0 5.12 2.12M15 9V6a3 3 0 0 0-6 0v1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19 11a7 7 0 0 1-9.9 6.32M12 18v4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="6"
        width="13"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M16 10l5-3v10l-5-3v-4Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function IconPhoneDown() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 15c-4-4-14-4-18 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 14l-3 3M19 17l-3-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
