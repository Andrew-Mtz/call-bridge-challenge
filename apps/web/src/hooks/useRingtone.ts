import { useRef } from "react";

export function useRingtone() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringTimerRef = useRef<number | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  function start() {
    try {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (window.AudioContext ||
          (window as Window & typeof globalThis).AudioContext)();
      const ctx = audioCtxRef.current;
      gainRef.current = ctx.createGain();
      gainRef.current.gain.value = 0.05;
      oscRef.current = ctx.createOscillator();
      oscRef.current.type = "sine";
      oscRef.current.frequency.value = 440;
      oscRef.current.connect(gainRef.current);
      gainRef.current.connect(ctx.destination);
      oscRef.current.start();

      const tick = () => {
        if (!gainRef.current) return;
        gainRef.current.gain.value = gainRef.current.gain.value > 0 ? 0 : 0.05;
        ringTimerRef.current = window.setTimeout(
          tick,
          1000
        ) as unknown as number;
      };
      tick();
    } catch {
      /* empty */
    }
  }

  function stop() {
    try {
      if (ringTimerRef.current) {
        clearTimeout(ringTimerRef.current);
        ringTimerRef.current = null;
      }
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
    } catch {
      /* empty */
    }
  }

  return { startRingtone: start, stopRingtone: stop };
}
