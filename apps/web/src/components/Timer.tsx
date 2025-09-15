import { useEffect, useState } from "react";

export function Timer({ running }: { running: boolean }) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!running) {
      setSecs(0);
      return;
    }
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {mm}:{ss}
    </span>
  );
}
