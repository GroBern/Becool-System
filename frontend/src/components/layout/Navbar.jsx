import { C } from "../../styles";
import { NAV } from "../../constants/navigation";
import { useAppContext } from "../../context";

export default function Navbar({ page, setPage }) {
  const { auth, logout } = useAppContext();
  const visibleNav = NAV.filter((n) => n.r.includes(auth?.role));

  return (
    <nav className="nav-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, position: "relative", zIndex: 1 }}>
      <div
        className="nav-brand"
        style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.5px", cursor: "pointer", whiteSpace: "nowrap" }}
        onClick={() => setPage("dashboard")}
      >
        🏄 Ama Surf
      </div>
      <div className="nav-pills" style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,.55)", backdropFilter: "blur(12px)", borderRadius: 26, padding: 3, overflowX: "auto" }}>
        {visibleNav.map((n) => (
          <div
            key={n.k}
            className="nav-pill"
            onClick={() => setPage(n.k)}
            style={{
              padding: "6px 12px",
              fontSize: 11.5,
              fontWeight: page === n.k ? 600 : 500,
              color: page === n.k ? "#fff" : C.sec,
              background: page === n.k ? C.pri : "transparent",
              borderRadius: 20,
              cursor: "pointer",
              transition: "all .2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { if (page !== n.k) e.currentTarget.style.color = C.pri; }}
            onMouseLeave={(e) => { if (page !== n.k) e.currentTarget.style.color = C.sec; }}
          >
            {n.l}
          </div>
        ))}
      </div>
      <div className="nav-icons" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* user badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: auth?.role === "admin" ? C.yelL : C.bluB,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
            color: auth?.role === "admin" ? C.yelD : C.blu,
          }}>
            {(auth?.name || "?")[0].toUpperCase()}
          </div>
          <div className="nav-user-info" style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.pri }}>{auth?.name}</div>
            <div style={{
              fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px",
              color: auth?.role === "admin" ? C.yelD : C.blu,
            }}>
              {auth?.role}
            </div>
          </div>
        </div>
        {/* settings gear (admin only) */}
        {auth?.role === "admin" && (
          <div
            onClick={() => setPage("settings")}
            style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.sec }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
          </div>
        )}
        {/* logout */}
        <div
          onClick={logout}
          title="Sign out"
          style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.sec }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(232,90,90,.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        </div>
      </div>
    </nav>
  );
}
