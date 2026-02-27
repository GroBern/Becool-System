import { useState } from "react";
import { useAppContext } from "../../context";
import { C, S } from "../../styles";
import { fmtDate } from "../../utils";
import { Modal, Empty, Header, Filter } from "../../components/ui";

export default function DeleteRequestsPage() {
  const { data, update } = useAppContext();
  const [filt, setFilt] = useState("pending");
  const [detail, setDetail] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const requests = (data.deleteRequests || [])
    .filter((r) => !filt || r.status === filt)
    .sort((a, b) => (b.requestedAt || b.date || "").localeCompare(a.requestedAt || a.date || ""));

  const pending = (data.deleteRequests || []).filter((r) => r.status === "pending").length;

  const approve = (req) => {
    // Perform the actual deletion from the data key
    if (req.dataKey && req.itemId) {
      const list = data[req.dataKey] || [];
      update(req.dataKey, list.filter((i) => i.id !== req.itemId));
    }
    // Update request status
    update(
      "deleteRequests",
      (data.deleteRequests || []).map((r) =>
        r.id === req.id ? { ...r, status: "approved", resolvedAt: new Date().toISOString() } : r
      )
    );
    setDetail(null);
  };

  const reject = (req) => {
    update(
      "deleteRequests",
      (data.deleteRequests || []).map((r) =>
        r.id === req.id ? { ...r, status: "rejected", rejectReason: rejectReason.trim() || undefined, resolvedAt: new Date().toISOString() } : r
      )
    );
    setDetail(null);
    setRejectReason("");
  };

  const statusColor = (s) => {
    if (s === "pending") return { bg: C.ornB, col: C.orn };
    if (s === "approved") return { bg: C.grnB, col: C.grn };
    if (s === "rejected") return { bg: "rgba(232,90,90,.12)", col: C.red };
    return { bg: C.bluB, col: C.blu };
  };

  return (
    <div>
      <Header title="Delete Requests" sub="Review and approve delete requests from cashiers">
        <Filter
          v={filt}
          set={setFilt}
          ph="All Status"
          opts={[
            { v: "pending", l: `Pending (${pending})` },
            { v: "approved", l: "Approved" },
            { v: "rejected", l: "Rejected" },
          ]}
        />
      </Header>

      {/* pending count banner */}
      {pending > 0 && (
        <div style={{
          ...S.card,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderLeft: `3px solid ${C.orn}`,
          padding: "12px 16px",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: C.ornB,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: C.orn,
          }}>
            {pending}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.pri }}>Pending Requests</div>
            <div style={{ fontSize: 11, color: C.sec }}>These requests need your review</div>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <Empty msg="No delete requests" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {requests.map((req) => {
            const sc = statusColor(req.status);
            return (
              <div
                key={req.id}
                className="lesson-card"
                style={{
                  ...S.card,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderLeft: req.status === "pending" ? `3px solid ${C.orn}` : "none",
                  cursor: "pointer",
                }}
                onClick={() => setDetail(req)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{req.itemDesc || "Unknown item"}</span>
                    <span style={{ ...S.tag(sc.bg, sc.col), fontSize: 10 }}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: C.sec }}>
                    Reason: {req.reason || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: C.mut, marginTop: 2 }}>
                    By {req.requestedBy} · {fmtDate(req.date)} · {req.dataKey}
                  </div>
                </div>
                {req.status === "pending" && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      style={S.btn(C.grn, "#fff")}
                      onClick={(e) => { e.stopPropagation(); approve(req); }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      style={S.btn(C.red, "#fff")}
                      onClick={(e) => { e.stopPropagation(); setDetail(req); }}
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / Reject Modal */}
      <Modal open={!!detail} onClose={() => { setDetail(null); setRejectReason(""); }} title="Delete Request Details">
        {detail && (
          <div>
            {/* item info */}
            <div style={{
              background: "rgba(232,90,90,.06)", borderRadius: 10, padding: "12px 14px",
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.red, marginBottom: 4 }}>
                {detail.itemDesc || "Unknown item"}
              </div>
              <div style={{ fontSize: 11, color: C.sec }}>
                Data: {detail.dataKey} · ID: {detail.itemId}
              </div>
            </div>

            {/* request info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: C.mut, textTransform: "uppercase", letterSpacing: ".3px" }}>Requested By</div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{detail.requestedBy}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.mut, textTransform: "uppercase", letterSpacing: ".3px" }}>Date</div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtDate(detail.date)}</div>
              </div>
            </div>

            {/* reason */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.mut, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 4 }}>Reason</div>
              <div style={{
                background: C.yelL, borderRadius: 8, padding: "10px 12px",
                fontSize: 12.5, color: C.pri, lineHeight: 1.5,
              }}>
                {detail.reason || "No reason provided"}
              </div>
            </div>

            {/* resolved info */}
            {detail.status !== "pending" && (
              <div style={{
                ...S.tag(detail.status === "approved" ? C.grnB : "rgba(232,90,90,.12)", detail.status === "approved" ? C.grn : C.red),
                fontSize: 12, padding: "8px 12px", marginBottom: 14, display: "inline-block",
              }}>
                {detail.status === "approved" ? "✓ Approved" : "✕ Rejected"}
                {detail.rejectReason ? ` — ${detail.rejectReason}` : ""}
              </div>
            )}

            {/* actions for pending */}
            {detail.status === "pending" && (
              <>
                <label style={S.label}>Reject Reason (optional)</label>
                <textarea
                  style={{ ...S.inp, minHeight: 50, resize: "vertical" }}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this request being rejected?"
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                  <button style={S.btn("transparent", C.sec)} onClick={() => { setDetail(null); setRejectReason(""); }}>Cancel</button>
                  <button style={S.btn(C.red, "#fff")} onClick={() => reject(detail)}>✕ Reject</button>
                  <button style={S.btn(C.grn, "#fff")} onClick={() => approve(detail)}>✓ Approve & Delete</button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
