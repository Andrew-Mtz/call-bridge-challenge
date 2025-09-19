type Props = {
  from: string;
  open: boolean;
  mode: "audio" | "video";
  onAnswer: () => void;
  onReject: () => void;
  preview?: React.ReactNode;
};

export function IncomingCallModal({
  from,
  open,
  mode,
  onAnswer,
  onReject,
  preview,
}: Props) {
  if (!open) return null;

  const isVideo = mode === "video";

  console.log(mode);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Incoming call"
    >
      <div
        style={{
          width: 360,
          borderRadius: 14,
          padding: 16,
          background: "#0f172a",
          border: "1px solid #1f2937",
          color: "#e5e7eb",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          display: "grid",
          gap: 12,
          justifyItems: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16 }}>Incoming call</div>
        <div style={{ opacity: 0.9 }}>
          From: <strong>{from}</strong>
        </div>

        {isVideo && preview && (
          <div style={{ display: "grid", gap: 6, placeItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Camera preview</div>
            <div
              style={{
                border: "1px solid #1f2937",
                borderRadius: 10,
                padding: 6,
                background: "#0b1220",
              }}
            >
              {preview}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            marginTop: 4,
          }}
        >
          <button
            onClick={onAnswer}
            style={{
              padding: "10px 14px",
              background: "#16a34a",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              minWidth: 120,
            }}
            aria-label={`Answer (${isVideo ? "video" : "audio"})`}
          >
            Answer {isVideo ? "(Video)" : ""}
          </button>

          <button
            onClick={onReject}
            style={{
              padding: "10px 14px",
              background: "#dc2626",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              minWidth: 100,
            }}
            aria-label="Reject call"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
