type Props = {
  value: "pstn" | "webrtc";
  onChange: (v: Props["value"]) => void;
};

export function ModeTabs({ value, onChange }: Props) {
  const Tab = ({ id, label, disabled=false }: { id: Props["value"]; label: string; disabled?: boolean }) => (
    <button
      disabled={disabled}
      onClick={() => !disabled && onChange(id)}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: value === id ? "2px solid #22c55e" : "1px solid #334155",
        background: disabled ? "#111827" : (value === id ? "#0b1220" : "#0f172a"),
        color: disabled ? "#6b7280" : "#e5e7eb",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600,
        minWidth: 120,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <Tab id="pstn" label="PSTN ↔ PSTN" />
      <Tab id="webrtc" label="WebRTC (soon)" disabled />
    </div>
  );
}
