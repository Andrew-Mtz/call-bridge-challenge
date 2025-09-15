type Props = {
  value: "telnyx" | "sinch" | "infobip";
  onChange: (v: Props["value"]) => void;
};

export function ProviderToggle({ value, onChange }: Props) {
  const Item = ({
    id,
    label,
    disabled = false,
  }: {
    id: Props["value"];
    label: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={() => !disabled && onChange(id)}
      disabled={disabled}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: value === id ? "2px solid var(--accent)" : "1px solid #334155",
        background:
          disabled ? "#111827"
          : value === id ? "#0b1220"
          : "#0f172a",
        color: disabled ? "#6b7280" : "#e5e7eb",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Item id="telnyx" label="Telnyx" />
      <Item id="sinch" label="Sinch" />
      <Item id="infobip" label="Infobip" />
    </div>
  );
}
