import { useEffect, useRef, useCallback } from "react";

type Props = {
  title: string;
  status?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  sx?: React.CSSProperties;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "0", "←"];
const MAX_E164_DIGITS = 15; // Max digits (not counting the leading '+')

/**
 * Compute the next value enforcing E.164 constraints:
 * - Only one '+' and only at the start
 * - Up to 15 digits (ITU E.164)
 * - Only numeric digits allowed in addition to '+'
 */
function nextValueE164(curr: string, key: string) {
  if (key === "←") return curr.slice(0, -1);

  if (key === "+") {
    // Allow '+' only if the current value is empty
    return curr.length === 0 ? "+" : curr;
  }

  // Allow digits 0..9 only
  if (!/^\d$/.test(key)) return curr;

  const digits = curr.replace(/^\+/, "");
  if (digits.length >= MAX_E164_DIGITS) return curr;

  return curr + key;
}

export function PhonePad({
  title,
  status = "idle",
  value,
  onChange,
  disabled,
  sx,
}: Props) {
  const screenRef = useRef<HTMLDivElement>(null);

  // Use useCallback so the effect can safely depend on `press` (no ESLint warning)
  const press = useCallback(
    (k: string) => {
      if (disabled) return;
      const v = nextValueE164(value, k);
      if (v !== value) onChange(v);
    },
    [disabled, value, onChange]
  );

  // Physical keyboard support: digits, '+', Backspace
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "+" || (e.shiftKey && e.key === "=")) press("+");
      else if (e.key === "Backspace") press("←");
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [disabled, press]);

  return (
    <div style={{ ...styles.device, ...sx }}>
      {/* Decorative side buttons (volume / power) */}
      <div style={styles.sideLeft} aria-hidden />
      <div style={styles.sideRight} aria-hidden />

      {/* Screen */}
      <div
        ref={screenRef}
        style={styles.screen}
        tabIndex={0}
        role="group"
        aria-label={`${title} phone`}
      >
        {/* Notch */}
        <div style={styles.notchWrap}>
          <div style={styles.notch} />
        </div>

        {/* Header: title + status */}
        <div style={styles.topRow}>
          <div style={styles.title}>{title}</div>
          <div
            style={{
              ...styles.status,
              background: status === "idle" ? "#0a1a2a" : "#082a2f",
              borderColor: "var(--muted)",
              color: status === "idle" ? "#9ca3af" : "#93c5fd",
            }}
          >
            {status}
          </div>
        </div>

        {/* Number display */}
        <div
          style={{ ...styles.numberBox, opacity: value ? 1 : 0.7 }}
          onClick={() => screenRef.current?.focus()}
          title="Type with keyboard or use the dialpad below"
        >
          {value || "—"}
        </div>

        {/* Dialpad */}
        <div style={styles.pad}>
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              disabled={disabled}
              aria-label={`key ${k}`}
              style={disabled ? styles.keyDisabled : styles.key}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Home bar */}
        <div style={styles.homeBar} aria-hidden />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  device: {
    position: "relative",
    width: "clamp(280px, 28vw, 360px)",
    height: "clamp(520px, 62vh, 700px)",
    borderRadius: 36,
    background: "linear-gradient(180deg, #0f172a, #0c1326)",
    border: "1px solid var(--muted)",
    padding: 10,
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  sideLeft: {
    position: "absolute",
    left: -4,
    top: 90,
    width: 3,
    height: 70,
    borderRadius: 2,
    background: "#1f2937",
  },
  sideRight: {
    position: "absolute",
    right: -4,
    top: 140,
    width: 3,
    height: 50,
    borderRadius: 2,
    background: "#1f2937",
  },
  screen: {
    height: "100%",
    width: "100%",
    borderRadius: 28,
    background: "#0b1020",
    border: "1px solid #1f2937",
    display: "grid",
    gridTemplateRows: "auto auto 1fr auto auto",
    gap: 10,
    padding: 14,
    outline: "none",
  },
  notchWrap: {
    display: "grid",
    placeItems: "center",
    height: 8,
    marginTop: -2,
  },
  notch: {
    width: 68,
    height: 6,
    borderRadius: 999,
    background: "#0f172a",
    border: "1px solid #1f2937",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontWeight: 700, color: "var(--text)" },
  status: {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid transparent",
    textTransform: "capitalize",
  },
  numberBox: {
    display: "grid",
    placeItems: "center",
    background: "#111827",
    color: "var(--text)",
    borderRadius: 16,
    minHeight: "clamp(90px, 18vh, 150px)",
    fontSize: "clamp(18px, 2.8vw, 26px)",
    letterSpacing: "0.5px",
    border: "1px solid #1f2937",
  },
  pad: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    alignContent: "end",
  },
  key: {
    padding: 0,
    borderRadius: 14,
    border: "1px solid #334155",
    background: "linear-gradient(180deg, #0f172a, #0a1222)",
    color: "#e5e7eb",
    fontSize: "clamp(16px, 2vw, 20px)",
    height: "clamp(48px, 6.5vh, 64px)",
    cursor: "pointer",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
  },
  keyDisabled: {
    padding: 0,
    borderRadius: 14,
    border: "1px solid #334155",
    background: "#111827",
    color: "#6b7280",
    fontSize: "clamp(16px, 2vw, 20px)",
    height: "clamp(48px, 6.5vh, 64px)",
    cursor: "not-allowed",
  },
  homeBar: {
    height: 5,
    width: 80,
    borderRadius: 999,
    background: "#1f2937",
    margin: "4px auto 0",
  },
};
