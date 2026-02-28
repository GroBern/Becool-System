import { useState } from "react";
import { C, S } from "../../styles";
import { loginAPI } from "../../services/api";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { token, user } = await loginAPI(username.trim(), password);
      onLogin(user, token);
    } catch {
      setError("Invalid username or password");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'DM Sans',sans-serif",
        background: "linear-gradient(135deg,#f5f0e8 0%,#faf5e8 30%,#f8efc0 60%,#f0e8a0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* decorative hatching */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 80,
          width: 220,
          height: 140,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(0,0,0,.03) 4px,rgba(0,0,0,.03) 5px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 100,
          width: 260,
          height: 160,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(0,0,0,.03) 4px,rgba(0,0,0,.03) 5px)",
        }}
      />

      <form
        onSubmit={handleSubmit}
        style={{
          background: "rgba(255,255,255,.85)",
          backdropFilter: "blur(16px)",
          borderRadius: 20,
          padding: "40px 36px 36px",
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 20px 60px rgba(0,0,0,.08)",
          position: "relative",
          zIndex: 1,
          animation: shake ? "shake .4s ease" : "none",
        }}
      >
        {/* branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>🏄</div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-.5px",
              margin: 0,
              color: C.pri,
            }}
          >
            Ama Surf School
          </h1>
          <p style={{ fontSize: 12, color: C.sec, marginTop: 4 }}>
            Management System
          </p>
        </div>

        {/* username */}
        <label style={S.label}>Username</label>
        <input
          style={S.inp}
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError("");
          }}
          placeholder="Enter username"
          autoFocus
        />

        {/* password */}
        <label style={S.label}>Password</label>
        <input
          style={S.inp}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          placeholder="Enter password"
        />

        {/* error */}
        {error && (
          <div
            style={{
              background: "rgba(232,90,90,.1)",
              color: C.red,
              fontSize: 12,
              fontWeight: 500,
              padding: "8px 12px",
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            {error}
          </div>
        )}

        {/* submit */}
        <button
          type="submit"
          style={{
            ...S.btn(C.pri, "#fff"),
            width: "100%",
            padding: "12px 0",
            fontSize: 14,
            marginTop: 4,
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {/* role hint */}
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 10.5,
            color: C.mut,
            lineHeight: 1.6,
          }}
        >
          <span style={{ display: "inline-block", background: C.yelL, padding: "2px 8px", borderRadius: 6, fontSize: 10, color: C.yelD, fontWeight: 600 }}>
            Admin
          </span>{" "}
          or{" "}
          <span style={{ display: "inline-block", background: C.bluB, padding: "2px 8px", borderRadius: 6, fontSize: 10, color: C.blu, fontWeight: 600 }}>
            Cashier
          </span>
        </div>
      </form>

      {/* shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
