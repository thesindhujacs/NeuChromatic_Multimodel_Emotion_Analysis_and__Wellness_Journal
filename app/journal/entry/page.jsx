'use client';
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { saveSession } from "@/lib/db";

export default function JournalEntryPage() {
  const [user, setUser] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
      else setUser(u);
    });
    return () => unsub();
  }, []);

  const handleAnalyze = async () => {
    if (text.trim().length < 20) {
      setError("Please write at least a few sentences for a meaningful analysis.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/analyze-emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);

        // Save to Supabase
        const dbSession = await saveSession(
          user.uid,
          user.email,
          user.displayName || "",
          { journalText: text, emotion: data.data }
        );

        const session = {
          id: dbSession?.id || Date.now(),
          dbId: dbSession?.id || null,
          date: new Date().toISOString(),
          journalText: text,
          emotion: data.data
        };

        // Also cache in localStorage
        const key = "neuchromatic_sessions_" + user.uid;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.push(session);
        localStorage.setItem(key, JSON.stringify(existing));
        localStorage.setItem("neuchromatic_current_" + user.uid, JSON.stringify(session));
      } else {
        setError("Analysis failed. Please check your Groq API key in .env.local");
      }
    } catch (e) {
      setError("Something went wrong. Make sure your dev server is running.");
    } finally {
      setLoading(false);
    }
  };

  const emotionEmojis = {
    joy: "😊", happiness: "😄", sadness: "😢", anxiety: "😰",
    anger: "😠", fear: "😨", hope: "🌟", loneliness: "🥺",
    excitement: "🎉", love: "❤️", grief: "💔", calm: "😌",
    confusion: "😕", overwhelm: "😵", default: "💭"
  };

  const getEmoji = (emotion) => {
    if (!emotion) return "💭";
    return emotionEmojis[emotion.toLowerCase()] || emotionEmojis.default;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FDFBF7", fontFamily: "'Inter', sans-serif" }}>
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
        <button onClick={() => router.push("/journal")} style={{
          background: "none", border: "1.5px solid #E5E7EB", borderRadius: "10px",
          padding: "8px 18px", cursor: "pointer", fontSize: "14px",
          color: "#6B7280", fontFamily: "Inter, sans-serif"
        }}>← Back to Journal</button>
      </nav>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px" }}>
        {!result ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <p style={{
                fontSize: "13px", fontWeight: "600", letterSpacing: "2px",
                color: "#7C3AED", textTransform: "uppercase", marginBottom: "12px"
              }}>Step 1 of 6</p>
              <h1 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "40px",
                fontWeight: "700", color: "#1C1C2E", marginBottom: "16px"
              }}>How are you feeling today?</h1>
              <p style={{ color: "#6B7280", fontSize: "17px", lineHeight: 1.7 }}>
                Write freely — there are no right or wrong answers. This is your safe space.
              </p>
            </div>

            <div style={{
              background: "white", borderRadius: "24px", padding: "36px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)", marginBottom: "24px"
            }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Today I feel... Something on my mind is... I noticed that..."
                rows={10}
                className="input-field"
                style={{ fontSize: "16px", lineHeight: "1.8", minHeight: "240px" }}
              />
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginTop: "16px"
              }}>
                <span style={{ fontSize: "13px", color: "#9CA3AF" }}>
                  {text.length} characters
                  {text.length < 20 && text.length > 0 && " · write a bit more"}
                </span>
                <span style={{ fontSize: "13px", color: "#9CA3AF" }}>
                  ~{Math.ceil(text.split(" ").filter(Boolean).length / 200)} min read
                </span>
              </div>
            </div>

            {error && (
              <div style={{
                background: "#FEE2E2", color: "#DC2626", padding: "14px 18px",
                borderRadius: "12px", marginBottom: "20px", fontSize: "14px"
              }}>{error}</div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || text.trim().length < 20}
              className="btn-primary"
              style={{
                width: "100%", fontSize: "16px", padding: "16px",
                opacity: text.trim().length < 20 ? 0.6 : 1
              }}
            >
              {loading ? "✨ Analyzing your emotions..." : "Analyze my emotions →"}
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "36px",
                fontWeight: "700", color: "#1C1C2E", marginBottom: "8px"
              }}>Your Emotional Analysis</h1>
              <p style={{ color: "#6B7280" }}>Here is what your words reveal</p>
            </div>

            <div style={{
              background: result.emotionColor || "#7C3AED",
              borderRadius: "24px", padding: "48px",
              textAlign: "center", marginBottom: "24px",
              boxShadow: "0 12px 40px " + (result.emotionColor || "#7C3AED") + "44"
            }}>
              <div style={{ fontSize: "72px", marginBottom: "16px" }}>
                {getEmoji(result.primaryEmotion)}
              </div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "42px", fontWeight: "700",
                color: "white", marginBottom: "8px", textTransform: "capitalize"
              }}>
                {result.primaryEmotion || "Complex"}
              </h2>
              <div style={{
                background: "rgba(255,255,255,0.2)", borderRadius: "20px",
                padding: "6px 20px", display: "inline-block",
                color: "white", fontSize: "15px", marginBottom: "24px"
              }}>
                Intensity: {result.intensity}/10
              </div>
              <p style={{
                color: "rgba(255,255,255,0.9)", fontSize: "17px",
                lineHeight: 1.8, maxWidth: "500px", margin: "0 auto"
              }}>
                {result.explanation}
              </p>
            </div>

            <div style={{
              background: "white", borderRadius: "20px", padding: "28px",
              marginBottom: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "18px",
                color: "#1C1C2E", marginBottom: "16px"
              }}>Emotional Keywords</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {(result.keywords || []).map((kw, i) => (
                  <span key={i} style={{
                    background: "#EDE9FE", color: "#7C3AED",
                    padding: "8px 18px", borderRadius: "20px",
                    fontSize: "14px", fontWeight: "500"
                  }}>{kw}</span>
                ))}
              </div>
            </div>

            <div style={{
              background: "linear-gradient(135deg, #CCFBF1, #EDE9FE)",
              borderRadius: "20px", padding: "28px", marginBottom: "32px"
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "18px",
                color: "#1C1C2E", marginBottom: "12px"
              }}>💚 Wellness Note</h3>
              <p style={{ color: "#374151", fontSize: "16px", lineHeight: 1.7 }}>
                {result.mentalHealthNote}
              </p>
            </div>

            <button
              onClick={() => router.push("/journal/psych/image")}
              className="btn-primary"
              style={{ width: "100%", fontSize: "16px", padding: "16px" }}
            >
              Continue to Image Reaction →
            </button>

            <button
              onClick={() => { setResult(null); setText(""); }}
              className="btn-secondary"
              style={{ width: "100%", fontSize: "15px", padding: "14px", marginTop: "12px" }}
            >
              ← Write a new entry
            </button>
          </>
        )}
      </div>
    </div>
  );
}