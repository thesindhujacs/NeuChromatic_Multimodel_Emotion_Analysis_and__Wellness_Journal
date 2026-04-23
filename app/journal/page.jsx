'use client';
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function JournalPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
      else setUser(u);
    });
    return () => unsub();
  }, []);

  const steps = [
    { icon: "✍️", title: "Journal Entry", desc: "Write your thoughts freely and get AI emotion analysis", path: "/journal/entry", color: "#7C3AED", bg: "#EDE9FE" },
    { icon: "🖼️", title: "Image Reaction", desc: "React to an emotional image — what do you feel?", path: "/journal/psych/image", color: "#EC4899", bg: "#FCE7F3" },
    { icon: "🎨", title: "Drawing Prompt", desc: "Answer a deep question through your drawing", path: "/journal/psych/drawing", color: "#F59E0B", bg: "#FEF3C7" },
    { icon: "🌈", title: "Color Fill", desc: "Fill an abstract image with colors that match your mood", path: "/journal/psych/color", color: "#0D9488", bg: "#CCFBF1" },
    { icon: "🤖", title: "AI Chatbot", desc: "Reflect deeper with your AI emotional companion", path: "/journal/chatbot", color: "#3B82F6", bg: "#DBEAFE" },
    { icon: "💫", title: "For You", desc: "Your personalized mood upliftment recommendations", path: "/journal/foryou", color: "#8B5CF6", bg: "#EDE9FE" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FDFBF7", fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 48px", background: "white",
        borderBottom: "1px solid #F3F4F6", boxShadow: "0 1px 12px rgba(0,0,0,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
          onClick={() => router.push("/dashboard")}>
          <span style={{ fontSize: "24px" }}>🧠</span>
          <span style={{
            fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: "700",
            background: "linear-gradient(135deg, #7C3AED, #0D9488)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>NeuChromatic</span>
        </div>
        <button onClick={() => router.push("/dashboard")} style={{
          background: "none", border: "1.5px solid #E5E7EB", borderRadius: "10px",
          padding: "8px 18px", cursor: "pointer", fontSize: "14px", color: "#6B7280",
          fontFamily: "Inter, sans-serif"
        }}>← Back to Dashboard</button>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <p style={{
            fontSize: "13px", fontWeight: "600", letterSpacing: "2px",
            color: "#7C3AED", textTransform: "uppercase", marginBottom: "12px"
          }}>Your Journey Today</p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: "42px",
            fontWeight: "700", color: "#1C1C2E", marginBottom: "16px"
          }}>Journal Session</h1>
          <p style={{ color: "#6B7280", fontSize: "17px", maxWidth: "500px", margin: "0 auto" }}>
            Go through each step at your own pace. Each one reveals a different layer of your emotions.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {steps.map((step, i) => (
            <div
              key={i}
              onClick={() => router.push(step.path)}
              style={{
                background: "white", borderRadius: "16px", padding: "24px 28px",
                display: "flex", alignItems: "center", gap: "24px",
                cursor: "pointer", border: "2px solid transparent",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                transition: "all 0.25s ease"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateX(8px)";
                e.currentTarget.style.border = `2px solid ${step.color}`;
                e.currentTarget.style.boxShadow = `0 8px 24px ${step.color}22`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateX(0)";
                e.currentTarget.style.border = "2px solid transparent";
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)";
              }}
            >
              <div style={{
                width: "56px", height: "56px", borderRadius: "14px",
                background: step.bg, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "28px", flexShrink: 0
              }}>{step.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <span style={{
                    fontSize: "12px", fontWeight: "600", color: step.color,
                    background: step.bg, padding: "2px 10px", borderRadius: "20px"
                  }}>Step {i + 1}</span>
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1C1C2E", marginBottom: "4px" }}>
                  {step.title}
                </h3>
                <p style={{ color: "#6B7280", fontSize: "14px" }}>{step.desc}</p>
              </div>
              <span style={{ fontSize: "20px", color: "#D1D5DB" }}>→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}