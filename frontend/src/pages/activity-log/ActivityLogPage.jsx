import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../../context";
import { C, S } from "../../styles";
import { fmtDate } from "../../utils";
import { Header, Empty, Filter } from "../../components/ui";
import { loadActivityLogs } from "../../services/api";

const CATEGORIES = [
  { v: "lesson", l: "Lessons" },
  { v: "student", l: "Students" },
  { v: "payment", l: "Payments" },
  { v: "expense", l: "Expenses" },
  { v: "rental", l: "Rentals" },
  { v: "instructor", l: "Instructors" },
  { v: "agent", l: "Agents" },
  { v: "settings", l: "Settings" },
  { v: "user", l: "Users" },
  { v: "auth", l: "Auth" },
  { v: "system", l: "System" },
];

const ACTION_COLORS = {
  created: { bg: "rgba(107,201,107,.12)", col: C.grn },
  updated: { bg: "rgba(90,155,213,.12)", col: C.blu },
  deleted: { bg: "rgba(232,90,90,.12)", col: C.red },
  started: { bg: "rgba(240,200,80,.15)", col: C.yelD },
  ended: { bg: "rgba(155,123,212,.12)", col: C.pur },
  payment: { bg: "rgba(107,201,107,.12)", col: C.grn },
  login: { bg: "rgba(90,155,213,.12)", col: C.blu },
  export: { bg: "rgba(155,123,212,.12)", col: C.pur },
  import: { bg: "rgba(232,148,90,.12)", col: C.orn },
  reset: { bg: "rgba(232,90,90,.12)", col: C.red },
};

const CATEGORY_ICONS = {
  lesson: "📚",
  student: "🎓",
  payment: "💰",
  expense: "💸",
  rental: "🏖️",
  instructor: "🏄",
  agent: "🤝",
  settings: "⚙️",
  user: "👤",
  auth: "🔐",
  system: "🔧",
};

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtDateTime(ts) {
  const d = new Date(ts);
  return `${fmtDate(d.toISOString().slice(0, 10))} ${fmtTime(ts)}`;
}

export default function ActivityLogPage() {
  const { data } = useAppContext();
  const users = data.users || [];

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [userFilter, setUserFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (userFilter) params.user = userFilter;
      if (catFilter) params.category = catFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const result = await loadActivityLogs(params);
      setLogs(result.logs);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, userFilter, catFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [userFilter, catFilter, dateFrom, dateTo]);

  // Group logs by date
  const groupedLogs = {};
  logs.forEach((log) => {
    const dateKey = new Date(log.timestamp).toISOString().slice(0, 10);
    if (!groupedLogs[dateKey]) groupedLogs[dateKey] = [];
    groupedLogs[dateKey].push(log);
  });

  return (
    <div>
      <Header title="Activity Log" sub="Track all user activities in the system" />

      {/* Filters */}
      <div style={{ ...S.card, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 14, padding: "12px 16px" }}>
        <div>
          <label style={{ ...S.label, marginBottom: 2 }}>User</label>
          <select style={{ ...S.sel, minWidth: 130 }} value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ ...S.label, marginBottom: 2 }}>Category</label>
          <Filter v={catFilter} set={setCatFilter} ph="All Categories" opts={CATEGORIES} />
        </div>
        <div>
          <label style={{ ...S.label, marginBottom: 2 }}>From</label>
          <input style={{ ...S.inp, minWidth: 130 }} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label style={{ ...S.label, marginBottom: 2 }}>To</label>
          <input style={{ ...S.inp, minWidth: 130 }} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: C.sec, alignSelf: "flex-end", paddingBottom: 4 }}>
          {total} {total === 1 ? "activity" : "activities"} found
        </div>
      </div>

      {/* Log entries */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.sec, fontSize: 13 }}>Loading activities...</div>
      ) : logs.length === 0 ? (
        <Empty msg="No activities found" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(groupedLogs).map(([dateKey, dayLogs]) => (
            <div key={dateKey}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.sec, marginBottom: 8, paddingLeft: 4 }}>
                {fmtDate(dateKey)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {dayLogs.map((log) => {
                  const actionStyle = ACTION_COLORS[log.action] || { bg: "rgba(0,0,0,.06)", col: C.sec };
                  const icon = CATEGORY_ICONS[log.category] || "📋";
                  return (
                    <div key={log._id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                      {/* Icon */}
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: actionStyle.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, flexShrink: 0,
                      }}>
                        {icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: C.pri }}>{log.description}</div>
                        <div style={{ fontSize: 10.5, color: C.sec, marginTop: 2 }}>
                          {fmtTime(log.timestamp)}
                        </div>
                      </div>

                      {/* User/Operator badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: log.operatorName ? C.grnB : log.userRole === "admin" ? C.yelL : C.bluB,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700,
                          color: log.operatorName ? C.grn : log.userRole === "admin" ? C.yelD : C.blu,
                        }}>
                          {(log.operatorName || log.userName || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ lineHeight: 1.2 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 600 }}>{log.operatorName || log.userName}</div>
                          <div style={{
                            fontSize: 8.5, fontWeight: 600, textTransform: "uppercase",
                            color: log.operatorName ? C.grn : log.userRole === "admin" ? C.yelD : C.blu,
                          }}>
                            {log.operatorName ? "operator" : log.userRole}
                          </div>
                        </div>
                      </div>

                      {/* Action tag */}
                      <span style={{
                        fontSize: 9.5, fontWeight: 600, textTransform: "uppercase",
                        padding: "2px 8px", borderRadius: 6, flexShrink: 0,
                        background: actionStyle.bg,
                        color: actionStyle.col,
                      }}>
                        {log.action}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
          <button
            style={S.btnO()}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: 12, color: C.sec }}>
            Page {page} of {pages}
          </span>
          <button
            style={S.btnO()}
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
