'use client';
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FDFBF7"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "48px",
          height: "48px",
          border: "3px solid #EDE9FE",
          borderTop: "3px solid #7C3AED",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px"
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#6B7280", fontFamily: "Inter, sans-serif" }}>Loading your space...</p>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FDFBF7",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Top Nav */}
      <nav style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 48px",
        background: "white",
        borderBottom: "1px solid #F3F4F6",
        boxShadow: "0 1px 12px rgba(0,0,0,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "28px" }}>🧠</span>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "22px",
            fontWeight: "700",
            background: "linear-gradient(135deg, #7C3AED, #0D9488)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>NeuChromatic</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#6B7280", fontSize: "14px" }}>
            Hello, <strong style={{ color: "#1C1C2E" }}>{user?.displayName || "there"}</strong> 👋
          </span>
          <button onClick={handleLogout} style={{
            background: "none",
            border: "1.5px solid #E5E7EB",
            borderRadius: "10px",
            padding: "8px 18px",
            cursor: "pointer",
            fontSize: "14px",
            color: "#6B7280",
            fontFamily: "Inter, sans-serif",
            transition: "all 0.2s"
          }}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        textAlign: "center",
        padding: "64px 24px 48px"
      }}>
        <p style={{
          fontSize: "13px",
          fontWeight: "600",
          letterSpacing: "2px",
          color: "#7C3AED",
          textTransform: "uppercase",
          marginBottom: "16px"
        }}>Your personal space</p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "48px",
          fontWeight: "700",
          color: "#1C1C2E",
          marginBottom: "16px",
          lineHeight: 1.2
        }}>
          What would you like to do today?
        </h1>
        <p style={{
          color: "#6B7280",
          fontSize: "18px",
          maxWidth: "500px",
          margin: "0 auto"
        }}>
          Choose your path — explore your emotions or review your progress.
        </p>
      </div>

      {/* Two Big Cards */}
      <div style={{
        display: "flex",
        gap: "32px",
        maxWidth: "900px",
        margin: "0 auto",
        padding: "0 24px 80px"
      }}>
        {/* Journal Card */}
        <div
          onClick={() => router.push("/journal")}
          style={{
            flex: 1,
            background: "white",
            borderRadius: "24px",
            padding: "48px 36px",
            cursor: "pointer",
            border: "2px solid transparent",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            transition: "all 0.3s ease",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-8px)";
            e.currentTarget.style.boxShadow = "0 20px 48px rgba(124,58,237,0.15)";
            e.currentTarget.style.border = "2px solid #7C3AED";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)";
            e.currentTarget.style.border = "2px solid transparent";
          }}
        >
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "120px",
            height: "120px",
            background: "linear-gradient(135deg, #EDE9FE, #C4B5FD)",
            borderRadius: "50%",
            opacity: 0.5
          }} />
          <div style={{ fontSize: "56px", marginBottom: "24px" }}>📔</div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "28px",
            fontWeight: "700",
            color: "#1C1C2E",
            marginBottom: "12px"
          }}>Journal</h2>
          <p style={{
            color: "#6B7280",
            fontSize: "16px",
            lineHeight: 1.7,
            marginBottom: "32px"
          }}>
            Write freely, express through art and color, then let AI reveal the emotions beneath your words.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "36px" }}>
            {[
              "✍️ Write your journal entry",
              "🖼️ Emotional image reaction",
              "🎨 Drawing & color expression",
              "🤖 AI emotion chatbot",
              "💫 Personalized recommendations"
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                color: "#4B5563"
              }}>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(135deg, #7C3AED, #0D9488)",
            color: "white",
            padding: "14px 28px",
            borderRadius: "12px",
            fontSize: "15px",
            fontWeight: "500"
          }}>
            Start journaling →
          </div>
        </div>

        {/* Reports Card */}
        <div
          onClick={() => router.push("/reports")}
          style={{
            flex: 1,
            background: "white",
            borderRadius: "24px",
            padding: "48px 36px",
            cursor: "pointer",
            border: "2px solid transparent",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            transition: "all 0.3s ease",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-8px)";
            e.currentTarget.style.boxShadow = "0 20px 48px rgba(13,148,136,0.15)";
            e.currentTarget.style.border = "2px solid #0D9488";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)";
            e.currentTarget.style.border = "2px solid transparent";
          }}
        >
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "120px",
            height: "120px",
            background: "linear-gradient(135deg, #CCFBF1, #99F6E4)",
            borderRadius: "50%",
            opacity: 0.5
          }} />
          <div style={{ fontSize: "56px", marginBottom: "24px" }}>📊</div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "28px",
            fontWeight: "700",
            color: "#1C1C2E",
            marginBottom: "12px"
          }}>Reports</h2>
          <p style={{
            color: "#6B7280",
            fontSize: "16px",
            lineHeight: 1.7,
            marginBottom: "32px"
          }}>
            View your emotional journey over time. Mood graphs, insights, and a full wellness report — auto-generated.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "36px" }}>
            {[
              "📈 Mood timeline graphs",
              "🧩 Emotion distribution charts",
              "🖼️ Gallery of your drawings",
              "📝 Auto-generated wellness report",
              "🔍 Deep pattern analysis"
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "14px",
                color: "#4B5563"
              }}>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(135deg, #0D9488, #0891B2)",
            color: "white",
            padding: "14px 28px",
            borderRadius: "12px",
            fontSize: "15px",
            fontWeight: "500"
          }}>
            View reports →
          </div>
        </div>
      </div>
    </div>
  );
}