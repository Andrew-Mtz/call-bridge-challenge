import { useEffect, useRef, useCallback, useMemo, useState } from "react";

type Props = {
  title: string;
  status?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  sx?: React.CSSProperties;
  historyKey?: string;
};

const KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "+",
  "0",
  "←",
] as const;
type KeyLabel = (typeof KEYS)[number];

const MAX_E164_DIGITS = 15;

// helpers de historial (localStorage)
const LS_PREFIX = "callpad:";
function readHistory(key?: string): string[] {
  if (!key) return [];
  const raw = localStorage.getItem(LS_PREFIX + key);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}
function clearHistory(key?: string) {
  if (!key) return;
  localStorage.removeItem(LS_PREFIX + key);
}

/**
 * Compute the next value enforcing E.164 constraints:
 * - Only one '+' and only at the start
 * - Up to 15 digits (ITU E.164)
 * - Only numeric digits allowed in addition to '+'
 */
function nextValueE164(curr: string, key: string) {
  if (key === "←") return curr.slice(0, -1);

  if (key === "+") {
    return curr.length === 0 ? "+" : curr;
  }

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
  historyKey,
}: Props) {
  const screenRef = useRef<HTMLDivElement>(null);

  // Tabs: keypad vs history
  const [tab, setTab] = useState<"dial" | "history">("dial");
  const [history, setHistory] = useState<string[]>(readHistory(historyKey));

  // Navigation + highlight
  const [focusIdx, setFocusIdx] = useState<number>(0);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const badge = useMemo(() => {
    const s = String(status || "idle").toLowerCase();
    if (["calling", "dialing", "a_dialing", "b_dialing"].includes(s))
      return { label: "Calling", bg: "var(--accent, #0ea5e9)" };
    if (["answered", "a_answered"].includes(s))
      return { label: "Answered", bg: "#10b981" };
    if (["in-call", "bridged"].includes(s))
      return { label: "In-call", bg: "#22d3ee" };
    if (["ended"].includes(s)) return { label: "Ended", bg: "#9ca3af" };
    return { label: "Idle", bg: "#475569" };
  }, [status]);

  const press = useCallback(
    (k: string) => {
      if (disabled) return;
      const v = nextValueE164(value, k);
      if (v !== value) onChange(v);
    },
    [disabled, value, onChange]
  );

  // Keyboard + arrows + Enter/Backspace
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;

      // Only navigate/activate when in dial tab
      if (tab === "dial") {
        if (e.key === "Enter") {
          e.preventDefault();
          const label = KEYS[focusIdx];
          press(label);
          setActiveIdx(focusIdx);
          setTimeout(() => setActiveIdx(null), 120);
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          press("←");
          setActiveIdx(KEYS.length - 1);
          setTimeout(() => setActiveIdx(null), 120);
          return;
        }
        if (/^\d$/.test(e.key)) {
          press(e.key);
          const idx = KEYS.indexOf(e.key as KeyLabel);
          if (idx >= 0) {
            setActiveIdx(idx);
            setFocusIdx(idx);
            setTimeout(() => setActiveIdx(null), 120);
          }
          return;
        }
        if (e.key === "+" || (e.shiftKey && e.key === "=")) {
          press("+");
          const idx = KEYS.indexOf("+");
          setActiveIdx(idx);
          setFocusIdx(idx);
          setTimeout(() => setActiveIdx(null), 120);
          return;
        }

        // Arrow navigation
        const col = focusIdx % 3;
        const row = Math.floor(focusIdx / 3);
        if (e.key === "ArrowLeft") {
          setFocusIdx(Math.max(row * 3 + (col - 1), row * 3));
          return;
        }
        if (e.key === "ArrowRight") {
          setFocusIdx(Math.min(row * 3 + (col + 1), row * 3 + 2));
          return;
        }
        if (e.key === "ArrowUp") {
          setFocusIdx(Math.max(focusIdx - 3, 0));
          return;
        }
        if (e.key === "ArrowDown") {
          setFocusIdx(Math.min(focusIdx + 3, KEYS.length - 1));
          return;
        }
      } else {
        if (e.key === "Backspace") {
          e.preventDefault();
          press("←");
        }
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [disabled, press, focusIdx, tab]);

  // Record refresh in tab change
  useEffect(() => {
    if (tab === "history") setHistory(readHistory(historyKey));
  }, [tab, historyKey]);

  return (
    <div style={{ ...styles.device, ...sx }}>
      <div style={styles.sideLeft} aria-hidden />
      <div style={styles.sideRight} aria-hidden />

      <div
        ref={screenRef}
        style={styles.screen}
        tabIndex={0}
        role="group"
        aria-label={`${title} phone`}
      >
        <div style={styles.notchWrap}>
          <div style={styles.notch} />
        </div>

        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              onClick={() => setTab("dial")}
              title="Keypad"
              style={tab === "dial" ? styles.tabActive : styles.tab}
            >
              {/* phone icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72c.12.9.31 1.78.57 2.63a2 2 0 0 1-.45 2.11L8 9a16 16 0 0 0 6 6l.54-1.12a2 2 0 0 1 2.11-.45c.85.26 1.73.45 2.63.57A2 2 0 0 1 22 16.92Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </button>
            <button
              onClick={() => setTab("history")}
              title="History"
              style={tab === "history" ? styles.tabActive : styles.tab}
            >
              {/* record icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 3v5h5M3.05 13A9 9 0 1 0 8 3.48"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>

          <div style={styles.title}>{title}</div>

          <div style={{ ...styles.statusBadge, background: badge.bg }}>
            {badge.label}
          </div>
        </div>

        {/* Display */}
        <div
          style={{ ...styles.numberBox, opacity: value ? 1 : 0.7 }}
          onClick={() => screenRef.current?.focus()}
          title="Type with keyboard or use the dialpad below"
        >
          {value || "—"}
        </div>

        {/* Content: dialpad or record */}
        {tab === "dial" ?
          <div style={styles.pad}>
            {KEYS.map((k, idx) => {
              const isActive = activeIdx === idx;
              const isFocused = focusIdx === idx;
              const btnStyle = disabled ? styles.keyDisabled : styles.key;
              return (
                <button
                  key={k}
                  onMouseDown={() => setActiveIdx(idx)}
                  onMouseUp={() => setActiveIdx(null)}
                  onMouseLeave={() => setActiveIdx(null)}
                  onClick={() => {
                    press(k);
                    setFocusIdx(idx);
                    screenRef.current?.focus();
                  }}
                  disabled={disabled}
                  aria-label={`key ${k}`}
                  style={{
                    ...btnStyle,
                    outline: isFocused ? "1px solid var(--accent)" : "none",
                    transform: isActive ? "translateY(1px)" : "none",
                  }}
                >
                  {k}
                </button>
              );
            })}
          </div>
        : <div style={styles.historyBox}>
            {historyKey ?
              history.length ?
                <>
                  <div style={styles.historyList}>
                    {history.map(num => (
                      <button
                        key={num}
                        style={styles.historyItem}
                        onClick={() => onChange(num)}
                        title="Use this number"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <button
                    style={styles.clearBtn}
                    onClick={() => {
                      clearHistory(historyKey);
                      setHistory([]);
                    }}
                  >
                    Clear history
                  </button>
                </>
              : <div style={styles.historyEmpty}>No recent calls</div>
            : <div style={styles.historyEmpty}>History disabled</div>}
          </div>
        }

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
  header: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: 8,
  },
  headerLeft: { display: "flex", gap: 6, alignItems: "center" },
  tab: {
    padding: "4px 6px",
    background: "#0b1220",
    border: "1px solid #1f2937",
    borderRadius: 8,
    color: "#9ca3af",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  tabActive: {
    padding: "4px 6px",
    background: "rgba(34,211,238,0.08)",
    border: "1px solid var(--accent)",
    borderRadius: 8,
    color: "#e5e7eb",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  title: { fontWeight: 700, color: "var(--text)", textAlign: "center" },
  statusBadge: {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    color: "#0b1220",
    fontWeight: 700,
    justifySelf: "end",
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
    transition: "transform 80ms ease",
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
  historyBox: {
    display: "grid",
    gap: 10,
    alignContent: "start",
  },
  historyList: {
    display: "grid",
    gap: 8,
    maxHeight: 160,
    overflow: "auto",
  },
  historyItem: {
    textAlign: "left" as const,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #1f2937",
    background: "#0b1220",
    color: "#e5e7eb",
    cursor: "pointer",
  },
  historyEmpty: { opacity: 0.6, padding: "8px 2px" },
  clearBtn: {
    justifySelf: "end",
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #1f2937",
    background: "#0b1220",
    color: "#9ca3af",
    cursor: "pointer",
  },
  homeBar: {
    height: 5,
    width: 80,
    borderRadius: 999,
    background: "#1f2937",
    margin: "4px auto 0",
  },
};
