// providers/infobip/useInfobipClient.ts
import { useCallback, useRef, useState } from "react";
import {
  createInfobipRtc,
  InfobipRTCEvent,
  CallsApiEvent,
  type InfobipRTC,
  type PhoneCall,
  type WebrtcCall,
  type IncomingWebrtcCallEvent,
  type IncomingWebrtcCall,
  WebrtcCallOptions,
  PhoneCallOptions,
} from "infobip-rtc";
import { useRingtone } from "../../hooks/useRingtone";

export type InfobipState = {
  connected: boolean;
  hasCall: boolean;
  isActive: boolean;
  muted: boolean;
  error: string | null;
  hasPending: boolean;
  pendingFrom: string | null;
  pendingIsVideo: boolean;
};

export function useInfobipClient() {
  const clientRef = useRef<InfobipRTC | null>(null);
  const activeCallRef = useRef<PhoneCall | WebrtcCall | null>(null);
  const pendingRef = useRef<IncomingWebrtcCall | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<InfobipState>({
    connected: false,
    hasCall: false,
    isActive: false,
    muted: false,
    error: null,
    hasPending: false,
    pendingFrom: null,
    pendingIsVideo: false,
  });

  const { startRingtone, stopRingtone } = useRingtone();

  const cleanup = useCallback(() => {
    try {
      activeCallRef.current?.hangup?.();
    } catch {
      /* empty */
    }
    try {
      clientRef.current?.disconnect?.();
    } catch {
      /* empty */
    }
    activeCallRef.current = null;
    pendingRef.current = null;
    clientRef.current = null;
    stopRingtone();
    setState({
      connected: false,
      hasCall: false,
      isActive: false,
      muted: false,
      error: null,
      hasPending: false,
      pendingFrom: null,
      pendingIsVideo: false,
    });
  }, [stopRingtone]);

  const connect = useCallback(
    (token: string, onIdle?: () => void) => {
      if (clientRef.current) return;
      const client = createInfobipRtc(token, {});
      clientRef.current = client;

      client.on(InfobipRTCEvent.CONNECTED, () => {
        setState(s => ({ ...s, connected: true }));
        onIdle?.();
      });

      client.on(InfobipRTCEvent.DISCONNECTED, () => {
        cleanup(); // seguro: cleanup es estable
      });

      client.on(InfobipRTCEvent.RECONNECTING, (e: unknown) => {
        const msg =
          typeof e === "object" && e && "message" in e ?
            String((e as { message?: string }).message)
          : "webrtc error";
        setState(s => ({ ...s, error: msg }));
      });

      client.on(
        InfobipRTCEvent.INCOMING_WEBRTC_CALL,
        (ev: IncomingWebrtcCallEvent) => {
          const inc = ev.incomingCall;
          pendingRef.current = inc;

          const isVideo = ev.customData?.kind === "video" ? true : false;

          const src = inc?.source?.();
          const from =
            (src && src.displayIdentifier) ||
            (src && src.identifier) ||
            "Unknown";

          setState(s => ({
            ...s,
            hasPending: true,
            pendingFrom: from,
            pendingIsVideo: !!isVideo,
          }));

          inc.on(CallsApiEvent.ESTABLISHED, (est: { stream: MediaStream }) => {
            const v = document.getElementById(
              "remoteVideo"
            ) as HTMLVideoElement | null;
            const a = document.getElementById(
              "remoteMedia"
            ) as HTMLAudioElement | null;
            if (v) {
              v.srcObject = est.stream;
              v.muted = true;
              v.onloadedmetadata = () =>
                v.play().catch(() => {
                  /* ignore */
                });
            }
            if (a) {
              a.srcObject = est.stream;
              a.muted = false; // querés oír al otro
              a.onloadedmetadata = () =>
                a.play().catch(() => {
                  /* require user gesture */
                });
            }

            remoteStreamRef.current = est.stream;

            activeCallRef.current = inc;
            stopRingtone();
            setState(s => ({
              ...s,
              hasCall: true,
              isActive: true,
              hasPending: false,
              pendingFrom: null,
            }));
          });

          inc.on(CallsApiEvent.HANGUP, () => {
            stopRingtone();
            activeCallRef.current = null;
            pendingRef.current = null;
            setState(s => ({
              ...s,
              hasCall: false,
              isActive: false,
              hasPending: false,
              pendingFrom: null,
              muted: false,
            }));
          });

          inc.on(CallsApiEvent.ERROR, () => {
            stopRingtone();
            activeCallRef.current = null;
            pendingRef.current = null;
            setState(s => ({
              ...s,
              hasCall: false,
              isActive: false,
              muted: false,
              hasPending: false,
              pendingFrom: null,
            }));
          });

          startRingtone();
        }
      );

      client.connect();
    },
    [startRingtone, stopRingtone, cleanup]
  );

  const answer = useCallback(
    (withVideo = false) => {
      const inc = pendingRef.current;
      if (!inc) return;
      stopRingtone();
      inc.accept(
        WebrtcCallOptions.builder().setAudio(true).setVideo(withVideo).build()
      );
      pendingRef.current = null;
    },
    [stopRingtone]
  );

  const reject = useCallback(() => {
    try {
      pendingRef.current?.decline();
    } catch {
      /* empty */
    }
    stopRingtone();
    pendingRef.current = null;
    setState(s => ({ ...s, hasPending: false, pendingFrom: null }));
  }, [stopRingtone]);

  const callIdentity = useCallback((to: string, withVideo = false) => {
    if (!clientRef.current) return;
    const call = clientRef.current.callWebrtc(
      to,
      WebrtcCallOptions.builder()
        .setAudio(true)
        .setVideo(withVideo)
        .setCustomData({ kind: withVideo ? "video" : "audio" })
        .build()
    );
    activeCallRef.current = call;
    setState(s => ({ ...s, hasCall: true }));

    call.on(CallsApiEvent.ESTABLISHED, (ev: { stream: MediaStream }) => {
      const v = document.getElementById(
        "remoteVideo"
      ) as HTMLVideoElement | null;
      const a = document.getElementById(
        "remoteMedia"
      ) as HTMLAudioElement | null;
      if (v) {
        v.srcObject = ev.stream;
        v.muted = true;
        v.onloadedmetadata = () =>
          v.play().catch(() => {
            /* ignore */
          });
      }
      if (a) {
        a.srcObject = ev.stream;
        a.muted = false; // querés oír al otro
        a.onloadedmetadata = () =>
          a.play().catch(() => {
            /* require user gesture */
          });
      }

      remoteStreamRef.current = ev.stream;

      setState(s => ({ ...s, hasCall: true, isActive: true }));
    });

    call.on(CallsApiEvent.HANGUP, () => {
      activeCallRef.current = null;
      setState(s => ({ ...s, hasCall: false, isActive: false, muted: false }));
    });

    call.on(CallsApiEvent.ERROR, () => {
      activeCallRef.current = null;
      setState(s => ({ ...s, hasCall: false, isActive: false }));
    });
  }, []);

  const callIdentityVideo = useCallback(
    (to: string) => {
      return callIdentity(to, true);
    },
    [callIdentity]
  );

  const callPhone = useCallback((to: string, from: string) => {
    if (!clientRef.current) return;
    const call = clientRef.current.callPhone(
      to,
      PhoneCallOptions.builder().setAudio(true).setFrom(from).build()
    );
    activeCallRef.current = call;
    setState(s => ({ ...s, hasCall: true }));

    call.on(CallsApiEvent.ESTABLISHED, (ev: { stream: MediaStream }) => {
      const el = document.getElementById(
        "remoteMedia"
      ) as HTMLAudioElement | null;
      if (el) el.srcObject = ev.stream;
      setState(s => ({ ...s, hasCall: true }));
    });

    call.on(CallsApiEvent.HANGUP, () => {
      activeCallRef.current = null;
      setState(s => ({ ...s, hasCall: false, muted: false }));
    });

    call.on(CallsApiEvent.ERROR, () => {
      activeCallRef.current = null;
      setState(s => ({ ...s, hasCall: false }));
    });
  }, []);

  const hangup = useCallback(() => {
    try {
      activeCallRef.current?.hangup?.();
    } catch {
      /* empty */
    }
    setTimeout(() => {
      if (!activeCallRef.current) {
        setState(s => ({ ...s, hasCall: false, muted: false }));
      }
    }, 2500);
  }, []);

  const toggleMute = useCallback(() => {
    const call = activeCallRef.current;
    if (!call) return;
    setState(s => {
      try {
        call.mute(!s.muted);
      } catch {
        /* empty */
      }
      return { ...s, muted: !s.muted };
    });
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const getRemoteStream = useCallback(() => remoteStreamRef.current, []);

  return {
    state,
    connect,
    answer,
    reject,
    callIdentity,
    callIdentityVideo,
    callPhone,
    hangup,
    toggleMute,
    disconnect,
    getRemoteStream,
    _refs: { clientRef, activeCallRef, pendingRef },
  };
}
