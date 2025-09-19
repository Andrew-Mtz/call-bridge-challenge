import { useCallback, useRef, useState } from "react";
import { TelnyxRTC } from "@telnyx/webrtc";

type TelnyxCallState =
  | "new"
  | "requesting"
  | "trying"
  | "ringing"
  | "early"
  | "active"
  | "held"
  | "done"
  | "hangup"
  | "destroy"
  | "busy"
  | "failed"
  | "timeout"
  | string;

interface TelnyxCall {
  state?: TelnyxCallState;
  hangup?: () => void;
  muteAudio?: () => void;
  unmuteAudio?: () => void;
}

interface TelnyxNotificationCallUpdate {
  type: "callUpdate";
  call: TelnyxCall;
}

export function useTelnyxClient() {
  const clientRef = useRef<TelnyxRTC | null>(null);
  const callRef = useRef<TelnyxCall | null>(null);

  const [state, setState] = useState({
    connected: false,
    hasCall: false, // ringing o activa
    isActive: false, // SOLO activa
    muted: false,
    error: null as string | null,
  });

  const connect = useCallback((token: string, onIdle?: () => void) => {
    if (clientRef.current) return;

    const client = new TelnyxRTC({ login_token: token });
    client.remoteElement = "remoteMedia";

    client
      .on("telnyx.ready", () => {
        setState(s => ({ ...s, connected: true, error: null }));
        onIdle?.();
      })
      .on("telnyx.error", (e: unknown) => {
        const msg =
          typeof e === "object" && e && "message" in e ?
            String((e as { message?: string }).message)
          : "webrtc error";
        setState(s => ({ ...s, error: msg }));
      })
      .on("telnyx.socket.close", () => {
        cleanup();
      })
      .on("telnyx.notification", (n: unknown) => {
        const isUpdate =
          !!n &&
          typeof n === "object" &&
          (n as TelnyxNotificationCallUpdate).type === "callUpdate" &&
          !!(n as TelnyxNotificationCallUpdate).call;

        if (!isUpdate) return;

        const call = (n as TelnyxNotificationCallUpdate).call;
        callRef.current = call;

        const st = String(call.state ?? "").toLowerCase() as TelnyxCallState;

        // Estados “en curso” (incluye ringing / early / etc.) → hasCall = true
        if (
          st === "new" ||
          st === "requesting" ||
          st === "trying" ||
          st === "ringing" ||
          st === "early" ||
          st === "active" ||
          st === "held"
        ) {
          setState(s => ({
            ...s,
            hasCall: true,
            isActive: st === "active", // ← SOLO aquí marcamos activa
          }));
        }

        // Estados terminales → reseteo
        if (
          st === "done" ||
          st === "hangup" ||
          st === "destroy" ||
          st === "busy" ||
          st === "failed" ||
          st === "timeout" ||
          st === "error" ||
          st === "disconnected"
        ) {
          setState(s => ({
            ...s,
            hasCall: false,
            isActive: false,
            muted: false,
          }));
        }
      });

    clientRef.current = client;
    client.checkPermissions(true, false);
    client.connect();
  }, []);

  const callNumber = useCallback((to: string, from: string) => {
    // Comenzamos en ringing → isActive sigue false
    clientRef.current?.newCall({
      destinationNumber: to,
      callerNumber: from,
      remoteElement: "remoteMedia",
      audio: true,
      video: false,
    });
    setState(s => ({ ...s, hasCall: true, isActive: false }));
  }, []);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call || !state.isActive) return; // sólo tiene sentido si está activa
    setState(s => {
      try {
        if (s.muted) call.unmuteAudio?.();
        else call.muteAudio?.();
      } catch {
        /* noop */
      }
      return { ...s, muted: !s.muted };
    });
  }, [state.isActive]);

  const hangup = useCallback(() => {
    // sirve para colgar tanto en ringing como en activa
    try {
      callRef.current?.hangup?.();
    } catch {
      /* noop */
    }
    setState(s => ({ ...s, hasCall: false, isActive: false, muted: false }));
  }, []);

  // Si querés un botón “Cancel” específico para cuando sólo está sonando:
  const cancel = useCallback(() => {
    if (!state.hasCall || state.isActive) return; // sólo si está sonando
    try {
      callRef.current?.hangup?.();
    } catch {
      /* noop */
    }
    setState(s => ({ ...s, hasCall: false, isActive: false, muted: false }));
  }, [state.hasCall, state.isActive]);

  const disconnect = useCallback(() => {
    cleanup();
  }, []);

  function cleanup() {
    try {
      callRef.current?.hangup?.();
    } catch {
      /* noop */
    }
    try {
      clientRef.current?.disconnect?.();
      clientRef.current?.off("telnyx.ready");
      clientRef.current?.off("telnyx.notification");
      clientRef.current?.off("telnyx.socket.close");
    } catch {
      /* noop */
    }
    callRef.current = null;
    clientRef.current = null;
    setState({
      connected: false,
      hasCall: false,
      isActive: false,
      muted: false,
      error: null,
    });
  }

  return {
    state,
    connect,
    callNumber,
    toggleMute,
    hangup,
    cancel,
    disconnect,
    _refs: { clientRef, callRef },
  };
}
