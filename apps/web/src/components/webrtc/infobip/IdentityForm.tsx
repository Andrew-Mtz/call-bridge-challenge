type Props = {
  value: string;
  onChange: (v: string) => void;
  onRandom: () => void;
};
export function IdentityForm({ value, onChange, onRandom }: Props) {
  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 6 }}>
      <label style={{ fontWeight: 600 }}>My identity (Infobip)</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="p.ej. andy-A-1234 (opcional)"
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #1f2937",
            background: "#0f172a",
            color: "#e5e7eb",
            width: 260,
          }}
        />
        <button
          onClick={onRandom}
          style={{
            background: "transparent",
            border: "1px solid #1f2937",
            borderRadius: 10,
            color: "#e5e7eb",
            padding: "8px 10px",
            cursor: "pointer",
          }}
        >
          Random
        </button>
      </div>
      <div style={{ opacity: 0.7, fontSize: 12 }}>
        Si lo dejás vacío, se generará uno aleatorio al conectar.
      </div>
    </div>
  );
}
