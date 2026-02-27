import { useAppContext } from "../../context";
import { C, S } from "../../styles";
import { today, fmt$, fmtDate, fmtElapsed } from "../../utils";
import { Tag } from "../../components/ui";

export default function DashboardPage() {
  const { data, settings, tick } = useAppContext();
  const t = today();
  const sl = (data.singleLessons || []).filter((l) => l.date === t);
  const gl = (data.groupLessons || []).filter((l) => l.date === t);
  const all = [...sl, ...gl];
  const active = all.filter((l) => l.status === "in-progress");
  const done = all.filter((l) => l.status === "completed");
  const tp = (data.payments || []).filter((p) => p.date === t && p.status === "completed");
  const rev = tp.reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = (data.payments || []).filter((p) => p.status === "pending").length;
  const avail = (data.instructors || []).filter((i) => i.availability === "available").length;
  const now = new Date();
  const ws = new Date(now);
  ws.setDate(now.getDate() - now.getDay());
  const wr = [0, 0, 0, 0, 0, 0, 0];
  (data.payments || []).forEach((p) => {
    if (p.status !== "completed") return;
    const d = new Date(p.date);
    if (d >= ws && d <= now) wr[d.getDay()] += Number(p.amount || 0);
  });
  const mx = Math.max(...wr, 1);

  return (
    <div>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-1px", marginBottom: 12 }}>Welcome in, Weligama</h1>

      {/* Stats Row */}
      <div className="stats-row" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <div className="stats-badges" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            ["Single", sl.length, "pri"],
            ["Group", gl.length, "yel"],
            ["Active", active.length, "out"],
            ["Done", done.length, "out"],
          ].map(([l, v, t]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, color: C.sec, fontWeight: 500 }}>{l}</span>
              <div
                style={{
                  height: 24,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  minWidth: 38,
                  padding: "0 10px",
                  ...(t === "pri"
                    ? { background: C.pri, color: "#fff" }
                    : t === "yel"
                    ? { background: C.yel, color: C.pri }
                    : { border: `1.5px solid ${C.bdr}`, color: C.sec }),
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
        <div className="stats-values" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            [fmt$(rev, settings), "Revenue"],
            [avail, "Instructors"],
            [pending, "Pending"],
          ].map(([v, l]) => (
            <div key={l}>
              <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-2px", lineHeight: 1, display: "block" }}>{v}</span>
              <span style={{ fontSize: 10.5, color: C.sec }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        {/* Revenue Chart */}
        <div className="span-half" style={{ ...S.card, gridColumn: "1/3" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Weekly Revenue</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px" }}>
            {fmt$(wr.reduce((a, b) => a + b, 0), settings)}{" "}
            <span style={{ fontSize: 12, fontWeight: 400, color: C.sec }}>this week</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 70, marginTop: 10 }}>
            {wr.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", position: "relative" }}>
                {i === now.getDay() && v > 0 && (
                  <div style={{ position: "absolute", top: -16, background: C.pri, color: "#fff", fontSize: 8, padding: "1px 5px", borderRadius: 3 }}>{fmt$(v, settings)}</div>
                )}
                <div style={{ width: "100%", maxWidth: 20, borderRadius: "3px 3px 1px 1px", height: Math.max(3, (v / mx) * 60), background: i === now.getDay() ? C.yel : v > 0 ? C.pri : "#e8e4dc" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 4 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: i === now.getDay() ? C.yelD : C.mut, fontWeight: i === now.getDay() ? 600 : 400 }}>{d}</span>
            ))}
          </div>
        </div>

        {/* Active */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Active Lessons</div>
          {active.length === 0 ? (
            <div style={{ color: C.mut, fontSize: 11, padding: "14px 0", textAlign: "center" }}>None right now</div>
          ) : (
            active.slice(0, 4).map((l) => {
              const el = l.timerStart ? tick - l.timerStart : 0;
              return (
                <div key={l.id} style={{ background: C.yelL, borderRadius: 8, padding: "6px 10px", marginBottom: 4 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600 }}>{l.studentName || l.groupName || "Lesson"}</div>
                  <div style={{ fontSize: 10, color: C.sec }}>
                    {l.level} · {fmtElapsed(el)} {l.paymentStatus !== "paid" && <Tag status={l.paymentStatus || "pending"} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rentals */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Active Rentals</div>
          {[
            ["Sunbeds", (data.sunbedRentals || []).filter((r) => r.status === "active").length],
            ["Equipment", (data.equipmentRentals || []).filter((r) => r.status === "active").length],
          ].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontSize: 12, color: C.sec }}>{l}</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Queue */}
        <div className="span-full" style={{ ...S.card, gridColumn: "1/3", background: C.dk, color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Today's Queue</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{done.length}/{all.length}</span>
          </div>
          {all.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,.3)", fontSize: 11, textAlign: "center", padding: "10px 0" }}>No lessons today</div>
          ) : (
            all.map((l) => {
              const dc = { completed: [C.grnB, C.grn], "in-progress": [C.yelL, C.yelD], scheduled: [C.bluB, C.blu] };
              const [bg, col] = dc[l.status] || dc.scheduled;
              return (
                <div
                  key={l.id}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 5, marginBottom: 1 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.dkI)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {l.status === "completed" ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 500 }}>{l.studentName || l.groupName || "Lesson"}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)" }}>
                      {l.startTime} · {l.level} · {l.status} {l.paymentStatus && l.paymentStatus !== "paid" && `· 💰 ${l.paymentStatus}`}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Instructors */}
        <div className="span-full" style={{ ...S.card, gridColumn: "3/5" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Instructors</div>
          {(data.instructors || []).length === 0 ? (
            <div style={{ color: C.mut, fontSize: 11, textAlign: "center", padding: "10px 0" }}>Add instructors</div>
          ) : (
            (data.instructors || []).map((i) => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.bdr}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{i.name}</div>
                  <div style={{ fontSize: 10, color: C.sec }}>{i.specialty || "General"}</div>
                </div>
                <Tag status={i.availability || "available"} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
