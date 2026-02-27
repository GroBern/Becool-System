// ════════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════

export const genId = () => Math.random().toString(36).substr(2, 9);

export const today = () => new Date().toISOString().split("T")[0];

export const fmt$ = (n, s) =>
  `${s?.currencySymbol || "LKR "}${Number(n || 0).toFixed(2)}`;

export const fmtDate = (d) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

export const fmtElapsed = (ms) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${s % 60}s`;
};
