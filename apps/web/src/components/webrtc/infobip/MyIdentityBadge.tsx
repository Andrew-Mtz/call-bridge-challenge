type Props = { identity: string; onCopy: () => void; copied: boolean };

export function MyIdentityBadge({ identity, onCopy, copied }: Props) {
  if (!identity) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.labelCell}>ID:</div>
      <div style={styles.valueCell} title={identity}>
        {identity}
      </div>
      <button onClick={onCopy} style={styles.copyBtn}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    border: "1px solid #1f2937",
    background: "#0f172a",
    color: "#e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
    minWidth: 280,
  },
  labelCell: {
    padding: "8px 10px",
    fontWeight: 700,
    borderRight: "1px solid #1f2937",
    whiteSpace: "nowrap",
  },
  valueCell: {
    padding: "8px 10px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  copyBtn: {
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    borderLeft: "1px solid #1f2937",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 600,
    alignSelf: "stretch",
  },
};
