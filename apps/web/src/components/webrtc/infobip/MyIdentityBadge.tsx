type Props = { identity: string; onCopy: () => void; copied: boolean };

export function MyIdentityBadge({ identity, onCopy, copied }: Props) {
  if (!identity) return null;

  return (
    <div style={wrap}>
      <div style={labelCell}>ID:</div>
      <div style={valueCell} title={identity}>
        {identity}
      </div>
      <button onClick={onCopy} style={copyBtn}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

const wrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  alignItems: "center",
  border: "1px solid #1f2937",
  background: "#0f172a",
  color: "#e5e7eb",
  borderRadius: 10,
  overflow: "hidden",
  minWidth: 280,
};

const labelCell: React.CSSProperties = {
  padding: "8px 10px",
  fontWeight: 700,
  borderRight: "1px solid #1f2937",
  whiteSpace: "nowrap",
};

const valueCell: React.CSSProperties = {
  padding: "8px 10px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const copyBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "transparent",
  border: "none",
  borderLeft: "1px solid #1f2937",
  color: "#e5e7eb",
  cursor: "pointer",
  fontWeight: 600,
  alignSelf: "stretch",
};
