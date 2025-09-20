import { useCallback } from "react";

export function useMicPermission() {
  const ensureMicPermission = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }, []);
  return { ensureMicPermission };
}
