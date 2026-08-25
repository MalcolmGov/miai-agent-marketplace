/**
 * A persistent ribbon shown on every page of a sandbox deployment, so the environment
 * is never mistaken for production. Server component — reads the runtime SANDBOX_MODE
 * flag (not build-time inlined), so the same image renders it only where the flag is set.
 */
export function SandboxBanner() {
  if (process.env.SANDBOX_MODE !== "1") return null;
  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.02em",
        color: "#3a2a00",
        background: "repeating-linear-gradient(45deg,#ffd54a,#ffd54a 14px,#ffcf33 14px,#ffcf33 28px)",
        borderBottom: "1px solid #e0af00",
      }}
    >
      <span aria-hidden>🧪</span>
      <span>
        SANDBOX — evaluation environment · demo data · connectors run in stub mode · not for production
      </span>
    </div>
  );
}
