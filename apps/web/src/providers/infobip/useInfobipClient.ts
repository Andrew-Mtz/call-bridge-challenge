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
  myDisplayName: string | null;
  myIdentity: string | null;
  remoteDisplayName: string | null;
  videoOn?: boolean;
  remoteVideoOn?: boolean;
  screenShareOn?: boolean;
  remoteShareOn?: boolean;
};

function stopStream(s: MediaStream | null) {
  try {
    s?.getTracks()?.forEach(t => t.stop());
  } catch {
    /* empty */
  }
}
function clearMediaEl(id: string) {
  const el = document.getElementById(id) as
    | HTMLVideoElement
    | HTMLAudioElement
    | null;
  if (el) {
    const prev = (el.srcObject as MediaStream | null) || null;
    stopStream(prev);
    el.srcObject = null;
  }
}

function mountSelfView(stream: MediaStream) {
  const selfView = document.getElementById(
    "selfView"
  ) as HTMLVideoElement | null;
  const panel = document.getElementById(
    "localPreviewPanel"
  ) as HTMLVideoElement | null;
  [selfView, panel].forEach(v => {
    if (v && v.srcObject !== stream) {
      v.srcObject = stream;
      v.muted = true;
      v.playsInline = true;
      v.onloadedmetadata = () => v.play().catch(() => {});
    }
  });
}

export function useInfobipClient() {
  const clientRef = useRef<InfobipRTC | null>(null);
  const activeCallRef = useRef<PhoneCall | WebrtcCall | null>(null);
  const pendingRef = useRef<IncomingWebrtcCall | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localCamStreamRef = useRef<MediaStream | null>(null);
  const localShareStreamRef = useRef<MediaStream | null>(null);
  const remoteShareStreamRef = useRef<MediaStream | null>(null);
  const myLabelRef = useRef<string>("Unknown");

  const [state, setState] = useState<InfobipState>({
    connected: false,
    hasCall: false,
    isActive: false,
    muted: false,
    error: null,
    hasPending: false,
    pendingFrom: null,
    pendingIsVideo: false,
    myDisplayName: null,
    myIdentity: null,
    remoteDisplayName: null,
    videoOn: false,
    remoteVideoOn: false,
    screenShareOn: false,
    remoteShareOn: false,
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
      myDisplayName: null,
      myIdentity: null,
      remoteDisplayName: null,
      videoOn: false,
      remoteVideoOn: false,
      screenShareOn: false,
      remoteShareOn: false,
    });
  }, [stopRingtone]);

  const endCallCleanup = useCallback(() => {
    stopStream(remoteStreamRef.current);
    stopStream(localCamStreamRef.current);
    stopStream(localShareStreamRef.current);
    stopStream(remoteShareStreamRef.current);
    remoteStreamRef.current = null;
    localCamStreamRef.current = null;
    localShareStreamRef.current = null;
    remoteShareStreamRef.current = null;

    clearMediaEl("remoteMedia");
    clearMediaEl("remoteVideo");
    clearMediaEl("selfView");
    clearMediaEl("shareLocal");
    clearMediaEl("shareRemote");

    activeCallRef.current = null;
    pendingRef.current = null;

    setState(s => ({
      ...s,
      hasCall: false,
      isActive: false,
      muted: false,
      hasPending: false,
      pendingFrom: null,
      pendingIsVideo: false,
      remoteDisplayName: null,
      videoOn: false,
      remoteVideoOn: false,
      screenShareOn: false,
      remoteShareOn: false,
    }));

    stopRingtone();
  }, [stopRingtone]);

  const connect = useCallback(
    (token: string, onIdle?: () => void) => {
      if (clientRef.current) return;
      const client = createInfobipRtc(token, {});
      clientRef.current = client;

      client.on(InfobipRTCEvent.CONNECTED, () => {
        try {
          const u = client.connectedUser?.();
          myLabelRef.current = u?.displayName ?? u?.identity ?? "Unknown";
          setState(s => ({
            ...s,
            connected: true,
            myDisplayName: (u && u.displayName) || s.myDisplayName,
            myIdentity: (u && u.identity) || s.myIdentity,
          }));
        } catch {
          setState(s => ({ ...s, connected: true }));
        }
        onIdle?.();
      });

      client.on(InfobipRTCEvent.DISCONNECTED, () => {
        cleanup();
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
            ev.customData?.fromName ||
            src?.displayIdentifier ||
            src?.identifier ||
            "Unknown";

          setState(s => ({
            ...s,
            hasPending: true,
            pendingFrom: from,
            pendingIsVideo: !!isVideo,
            remoteDisplayName: null,
          }));

          inc.on(CallsApiEvent.ESTABLISHED, (est: { stream: MediaStream }) => {
            const a = document.getElementById(
              "remoteMedia"
            ) as HTMLAudioElement | null;
            if (a && a.srcObject !== est.stream) {
              a.srcObject = est.stream;
              a.onloadedmetadata = () =>
                a.play().catch(() => {
                  /* requires gesture */
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
              remoteDisplayName: from || s.remoteDisplayName,
            }));
          });

          inc.on(
            CallsApiEvent.SCREEN_SHARE_ADDED,
            ({ stream }: { stream: MediaStream }) => {
              localShareStreamRef.current = stream;
              const el = document.getElementById(
                "shareLocal"
              ) as HTMLVideoElement | null;
              if (el) {
                el.srcObject = stream;
                el.muted = true;
                el.playsInline = true;
                el.onloadedmetadata = () => el.play().catch(() => {});
              }
              setState(s => ({ ...s, screenShareOn: true }));
            }
          );
          inc.on(CallsApiEvent.SCREEN_SHARE_REMOVED, () => {
            const el = document.getElementById(
              "shareLocal"
            ) as HTMLVideoElement | null;
            if (el) el.srcObject = null;
            localShareStreamRef.current = null;
            setState(s => ({ ...s, screenShareOn: false }));
          });

          inc.on(
            CallsApiEvent.REMOTE_SCREEN_SHARE_ADDED,
            ({ stream }: { stream: MediaStream }) => {
              remoteShareStreamRef.current = stream;
              const el = document.getElementById(
                "shareRemote"
              ) as HTMLVideoElement | null;
              if (el) {
                el.srcObject = stream;
                el.playsInline = true;
                el.onloadedmetadata = () => el.play().catch(() => {});
              }
              setState(s => ({ ...s, remoteShareOn: true }));
            }
          );
          inc.on(CallsApiEvent.REMOTE_SCREEN_SHARE_REMOVED, () => {
            const el = document.getElementById(
              "shareRemote"
            ) as HTMLVideoElement | null;
            if (el) el.srcObject = null;
            remoteShareStreamRef.current = null;
            setState(s => ({ ...s, remoteShareOn: false }));
          });

          // self video
          inc.on(
            CallsApiEvent.CAMERA_VIDEO_ADDED,
            (ev: { stream: MediaStream }) => {
              localCamStreamRef.current = ev.stream;
              mountSelfView(ev.stream);
              setState(s => ({ ...s, videoOn: true }));
            }
          );
          inc.on(CallsApiEvent.CAMERA_VIDEO_REMOVED, () => {
            localCamStreamRef.current = null;
            const selfView = document.getElementById(
              "selfView"
            ) as HTMLVideoElement | null;
            if (selfView) selfView.srcObject = null;
            setState(s => ({ ...s, videoOn: false }));
          });

          // remote video
          inc.on(
            CallsApiEvent.REMOTE_CAMERA_VIDEO_ADDED,
            (ev: { stream: MediaStream }) => {
              const v = document.getElementById(
                "remoteVideo"
              ) as HTMLVideoElement | null;
              if (v && v.srcObject !== ev.stream) {
                v.srcObject = ev.stream;
                v.muted = true;
                v.playsInline = true;
                v.onloadedmetadata = () => v.play().catch(() => {});
              }
              setState(s => ({ ...s, remoteVideoOn: true }));
            }
          );

          // remote video removed
          inc.on(CallsApiEvent.REMOTE_CAMERA_VIDEO_REMOVED, () => {
            const v = document.getElementById(
              "remoteVideo"
            ) as HTMLVideoElement | null;
            if (v) v.srcObject = null;
            setState(s => ({ ...s, remoteVideoOn: false }));
          });

          inc.on(CallsApiEvent.HANGUP, () => {
            endCallCleanup();
          });

          inc.on(CallsApiEvent.ERROR, () => {
            endCallCleanup();
          });

          startRingtone();
        }
      );

      client.connect();
    },
    [cleanup, startRingtone, stopRingtone, endCallCleanup]
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
    setState(s => ({
      ...s,
      hasPending: false,
      pendingFrom: null,
      pendingIsVideo: false,
    }));
  }, [stopRingtone]);

  const callIdentity = useCallback(
    (to: string, withVideo = false) => {
      if (!clientRef.current) return;
      const meName = myLabelRef.current || "Unknown";
      const call = clientRef.current.callWebrtc(
        to,
        WebrtcCallOptions.builder()
          .setAudio(true)
          .setVideo(withVideo)
          .setCustomData({
            kind: withVideo ? "video" : "audio",
            fromName: meName,
          })
          .build()
      );
      activeCallRef.current = call;
      setState(s => ({ ...s, hasCall: true }));

      call.on(CallsApiEvent.ESTABLISHED, (ev: { stream: MediaStream }) => {
        const a = document.getElementById(
          "remoteMedia"
        ) as HTMLAudioElement | null;
        if (a && a.srcObject !== ev.stream) {
          a.srcObject = ev.stream;
          a.onloadedmetadata = () => a.play().catch(() => {});
        }
        remoteStreamRef.current = ev.stream;

        setState(s => ({
          ...s,
          hasCall: true,
          isActive: true,
          remoteDisplayName: s.remoteDisplayName,
        }));
      });

      call.on(
        CallsApiEvent.SCREEN_SHARE_ADDED,
        ({ stream }: { stream: MediaStream }) => {
          localShareStreamRef.current = stream;
          const el = document.getElementById(
            "shareLocal"
          ) as HTMLVideoElement | null;
          if (el) {
            el.srcObject = stream;
            el.muted = true;
            el.playsInline = true;
            el.onloadedmetadata = () => el.play().catch(() => {});
          }
          setState(s => ({ ...s, screenShareOn: true }));
        }
      );
      call.on(CallsApiEvent.SCREEN_SHARE_REMOVED, () => {
        const el = document.getElementById(
          "shareLocal"
        ) as HTMLVideoElement | null;
        if (el) el.srcObject = null;
        localShareStreamRef.current = null;
        setState(s => ({ ...s, screenShareOn: false }));
      });

      call.on(
        CallsApiEvent.REMOTE_SCREEN_SHARE_ADDED,
        ({ stream }: { stream: MediaStream }) => {
          remoteShareStreamRef.current = stream;
          const el = document.getElementById(
            "shareRemote"
          ) as HTMLVideoElement | null;
          if (el) {
            el.srcObject = stream;
            el.playsInline = true;
            el.onloadedmetadata = () => el.play().catch(() => {});
          }
          setState(s => ({ ...s, remoteShareOn: true }));
        }
      );
      call.on(CallsApiEvent.REMOTE_SCREEN_SHARE_REMOVED, () => {
        const el = document.getElementById(
          "shareRemote"
        ) as HTMLVideoElement | null;
        if (el) el.srcObject = null;
        remoteShareStreamRef.current = null;
        setState(s => ({ ...s, remoteShareOn: false }));
      });

      // self video
      call.on(CallsApiEvent.CAMERA_VIDEO_ADDED, ({ stream }) => {
        localCamStreamRef.current = stream;
        mountSelfView(stream);
        setState(s => ({ ...s, videoOn: true }));
      });
      call.on(CallsApiEvent.CAMERA_VIDEO_REMOVED, () => {
        localCamStreamRef.current = null;
        const selfView = document.getElementById(
          "selfView"
        ) as HTMLVideoElement | null;
        if (selfView) selfView.srcObject = null;
        setState(s => ({ ...s, videoOn: false }));
      });

      // remote video
      call.on(
        CallsApiEvent.REMOTE_CAMERA_VIDEO_ADDED,
        (ev: { stream: MediaStream }) => {
          const v = document.getElementById(
            "remoteVideo"
          ) as HTMLVideoElement | null;
          if (v && v.srcObject !== ev.stream) {
            v.srcObject = ev.stream;
            v.muted = true;
            v.playsInline = true;
            v.onloadedmetadata = () => v.play().catch(() => {});
          }
          setState(s => ({ ...s, remoteVideoOn: true }));
        }
      );
      call.on(CallsApiEvent.REMOTE_CAMERA_VIDEO_REMOVED, () => {
        const v = document.getElementById(
          "remoteVideo"
        ) as HTMLVideoElement | null;
        if (v) v.srcObject = null;
        setState(s => ({ ...s, remoteVideoOn: false }));
      });

      call.on(CallsApiEvent.HANGUP, () => {
        endCallCleanup();
      });

      call.on(CallsApiEvent.ERROR, () => {
        endCallCleanup();
      });
    },
    [endCallCleanup]
  );

  const callIdentityVideo = useCallback(
    (to: string) => {
      return callIdentity(to, true);
    },
    [callIdentity]
  );

  const callPhone = useCallback(
    (to: string, from: string) => {
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
        setState(s => ({ ...s, hasCall: true, isActive: true }));
      });

      call.on(CallsApiEvent.HANGUP, () => {
        endCallCleanup();
      });

      call.on(CallsApiEvent.ERROR, () => {
        endCallCleanup();
      });
    },
    [endCallCleanup]
  );

  const hangup = useCallback(() => {
    try {
      activeCallRef.current?.hangup?.();
    } catch {
      /* empty */
    }
    setTimeout(() => {
      endCallCleanup();
    }, 2000);
  }, [endCallCleanup]);

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

  const setCamera = useCallback((on: boolean) => {
    const call = activeCallRef.current as WebrtcCall | null;
    try {
      call?.cameraVideo?.(on);
      setState(s => ({ ...s, videoOn: on }));
      if (on && localCamStreamRef.current) {
        mountSelfView(localCamStreamRef.current);
      }
    } catch {
      /* empty */
    }
  }, []);
  const toggleCamera = useCallback(
    () => setCamera(!state.videoOn),
    [setCamera, state.videoOn]
  );

  const setScreenShare = useCallback((on: boolean) => {
    const call = activeCallRef.current as WebrtcCall | null;
    try {
      call?.screenShare?.(on);
      setState(s => ({ ...s, screenShareOn: on }));
    } catch {
      /* empty */
    }
  }, []);
  const toggleScreenShare = useCallback(
    () => setScreenShare(!state.screenShareOn),
    [setScreenShare, state.screenShareOn]
  );

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const getRemoteStream = useCallback(() => remoteStreamRef.current, []);
  const getLocalCameraStream = useCallback(() => localCamStreamRef.current, []);
  const getRemoteShareStream = useCallback(
    () => remoteShareStreamRef.current,
    []
  );
  const getLocalShareStream = useCallback(
    () => localShareStreamRef.current,
    []
  );

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
    getLocalCameraStream,
    getRemoteShareStream,
    getLocalShareStream,
    setCamera,
    toggleCamera,
    setScreenShare,
    toggleScreenShare,
    _refs: { clientRef, activeCallRef, pendingRef },
  };
}
