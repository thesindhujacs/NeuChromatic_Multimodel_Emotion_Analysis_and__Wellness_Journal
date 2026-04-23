'use client';
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { updateSession } from "@/lib/db";

const EMOTION_IMAGES = [
  { url: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800", title: "Alone in the storm", tags: "dramatic, dark, solitary" },
  { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800", title: "Golden light", tags: "warm, hopeful, peaceful" },
  { url: "https://images.unsplash.com/photo-1474540412665-1cdae210ae6b?w=800", title: "Empty road ahead", tags: "uncertain, journey, open" },
  { url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800", title: "Ocean waves", tags: "powerful, overwhelming, free" },
  { url: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800", title: "Starry night", tags: "wonder, vastness, calm" },
  { url: "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800", title: "Winter silence", tags: "cold, lonely, still" },
  { url: "https://images.unsplash.com/photo-1490750967868-88df5691cc37?w=800", title: "Spring blooming", tags: "joy, renewal, growth" },
  { url: "https://images.unsplash.com/photo-1511497584788-876760111969?w=800", title: "Deep forest", tags: "mysterious, lost, searching" },
];

export default function ImageReactionPage() {
  const [user, setUser] = useState(null);
  const [image, setImage] = useState(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
      else {
        setUser(u);
        setImage(EMOTION_IMAGES[Math.floor(Math.random() * EMOTION_IMAGES.length)]);
      }
    });
    return () => unsub();
  }, []);

  const handleAnalyze = async () => {
    if (response.trim().length < 10) return;
    setLoading(true);
    try {
      const res = await fetch("/api/analyze-emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Looking at an image described as \"" + image.title + "\" (" + image.tags + "), the person said: \"" + response + "\". Analyze the emotional response to this visual stimulus."
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);

        const imageReactionData = { image: image.title, response, emotion: data.data };

        // Update localStorage
        const key = "neuchromatic_current_" + user.uid;
        const session = JSON.parse(localStorage.getItem(key) || "{}");
        session.imageReaction = imageReactionData;
        localStorage.setItem(key, JSON.stringify(session));

        const sessionsKey = "neuchromatic_sessions_" + user.uid;
        const sessions = JSON.parse(localStorage.getItem(sessionsKey) || "[]");
        if (sessions.length > 0) {
          sessions[sessions.length - 1].imageReaction = imageReactionData;
          localStorage.setItem(sessionsKey, JSON.stringify(sessions));
        }

        // Update Supabase
        if (session.dbId) {
          await updateSession(session.dbId, { image_reaction: imageReactionData });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
        }}>← Back</button>
      </nav>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px" }}>
        {!result ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <p style={{
                fontSize: "13px", fontWeight: "600", letterSpacing: "2px",
                color: "#EC4899", textTransform: "uppercase", marginBottom: "12px"
              }}>Step 2 of 6</p>
              <h1 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "38px",
                fontWeight: "700", color: "#1C1C2E", marginBottom: "12px"
              }}>What do you feel?</h1>
              <p style={{ color: "#6B7280", fontSize: "16px" }}>
                Look at this image carefully. Take a breath. What emotions does it stir in you?
              </p>
            </div>

            {image && (
              <div style={{
                borderRadius: "24px", overflow: "hidden",
                boxShadow: "0 12px 40px rgba(0,0,0,0.12)", marginBottom: "32px",
                position: "relative"
              }}>
                <img
                  src={image.url}
                  alt="Emotional stimulus"
                  style={{ width: "100%", height: "360px", objectFit: "cover", display: "block" }}
                />
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                  padding: "24px", color: "white"
                }}>
                  <p style={{ fontSize: "13px", opacity: 0.8 }}>Take a moment to observe...</p>
                </div>
              </div>
            )}

            <div style={{
              background: "white", borderRadius: "20px", padding: "28px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: "20px"
            }}>
              <label style={{
                display: "block", fontSize: "15px", fontWeight: "500",
                color: "#374151", marginBottom: "12px"
              }}>
                Describe what you feel when you look at this image...
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="This image makes me feel... I see... It reminds me of..."
                rows={5}
                className="input-field"
                style={{ fontSize: "15px", lineHeight: "1.8" }}
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || response.trim().length < 10}
              className="btn-primary"
              style={{
                width: "100%", fontSize: "16px", padding: "16px",
                opacity: response.trim().length < 10 ? 0.6 : 1
              }}
            >
              {loading ? "Analyzing your response..." : "Analyze my reaction →"}
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "36px",
                fontWeight: "700", color: "#1C1C2E", marginBottom: "8px"
              }}>Your Visual Emotion</h1>
              <p style={{ color: "#6B7280" }}>What the image revealed about your inner state</p>
            </div>

            <div style={{
              background: result.emotionColor || "#EC4899",
              borderRadius: "24px", padding: "40px", textAlign: "center",
              marginBottom: "24px",
              boxShadow: "0 12px 40px " + (result.emotionColor || "#EC4899") + "44"
            }}>
              <div style={{ fontSize: "64px", marginBottom: "12px" }}>🖼️</div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "36px",
                fontWeight: "700", color: "white", marginBottom: "8px", textTransform: "capitalize"
              }}>{result.primaryEmotion}</h2>
              <div style={{
                background: "rgba(255,255,255,0.2)", borderRadius: "20px",
                padding: "6px 20px", display: "inline-block",
                color: "white", fontSize: "14px", marginBottom: "20px"
              }}>Intensity: {result.intensity}/10</div>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "16px", lineHeight: 1.7 }}>
                {result.explanation}
              </p>
            </div>

            <div style={{
              background: "white", borderRadius: "20px", padding: "24px",
              marginBottom: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "18px",
                color: "#1C1C2E", marginBottom: "12px"
              }}>Keywords</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {(result.keywords || []).map((kw, i) => (
                  <span key={i} style={{
                    background: "#FCE7F3", color: "#EC4899",
                    padding: "8px 18px", borderRadius: "20px",
                    fontSize: "14px", fontWeight: "500"
                  }}>{kw}</span>
                ))}
              </div>
            </div>

            <div style={{
              background: "linear-gradient(135deg, #FCE7F3, #EDE9FE)",
              borderRadius: "20px", padding: "24px", marginBottom: "32px"
            }}>
              <p style={{ color: "#374151", fontSize: "15px", lineHeight: 1.7 }}>
                💚 {result.mentalHealthNote}
              </p>
            </div>

            <button
              onClick={() => router.push("/journal/psych/drawing")}
              className="btn-primary"
              style={{ width: "100%", fontSize: "16px", padding: "16px" }}
            >
              Continue to Drawing Prompt →
            </button>
          </>
        )}
      </div>
    </div>
  );
}