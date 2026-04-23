'use client';
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

const getGamesForEmotion = (rec) => {
  const emotion = (rec?.summary || "").toLowerCase();

  const gameMap = {
    sad: [
      { name: "Bubble Shooter", emoji: "🫧", why: "Simple satisfying game to distract the mind", url: "https://www.bubbleshooter.net/" },
      { name: "Jigsaw Planet", emoji: "🧩", why: "Puzzles help shift focus and feel accomplished", url: "https://www.jigsawplanet.com/" },
      { name: "Lumosity", emoji: "🧠", why: "Brain training to gently lift your mood", url: "https://www.lumosity.com/en/" },
    ],
    anxious: [
      { name: "Calm", emoji: "🧘", why: "Breathing exercises and mindfulness games", url: "https://www.calm.com/" },
      { name: "Sudoku", emoji: "🔢", why: "Logical focus calms anxious thoughts", url: "https://sudoku.com/" },
      { name: "2048", emoji: "🎯", why: "Gentle number puzzle keeps mind anchored", url: "https://play2048.co/" },
    ],
    angry: [
      { name: "Lumosity", emoji: "🧠", why: "Brain training redirects emotional energy", url: "https://www.lumosity.com/en/" },
      { name: "Chess", emoji: "♟️", why: "Strategic thinking channels anger productively", url: "https://www.chess.com/play/computer" },
      { name: "Wordplay", emoji: "📝", why: "Word games shift focus away from anger", url: "https://wordplay.com/" },
    ],
    happy: [
      { name: "Gartic Phone", emoji: "🎨", why: "Fun drawing game to celebrate your joy", url: "https://garticphone.com/" },
      { name: "GeoGuessr", emoji: "🌍", why: "Explore the world while you feel great", url: "https://www.geoguessr.com/" },
      { name: "Sporcle", emoji: "🏆", why: "Fun trivia to channel your good energy", url: "https://www.sporcle.com/" },
    ],
    lonely: [
      { name: "Skribbl.io", emoji: "✏️", why: "Draw and guess with people online", url: "https://skribbl.io/" },
      { name: "Lichess", emoji: "♟️", why: "Play chess with people worldwide", url: "https://lichess.org/" },
      { name: "Typeracer", emoji: "⌨️", why: "Race against others to feel connected", url: "https://play.typeracer.com/" },
    ],
    confused: [
      { name: "Lumosity", emoji: "🧠", why: "Brain games to bring mental clarity", url: "https://www.lumosity.com/en/" },
      { name: "Sudoku", emoji: "🔢", why: "Structure and logic to clear foggy thoughts", url: "https://sudoku.com/" },
      { name: "Jigsaw Planet", emoji: "🧩", why: "Putting pieces together mirrors finding clarity", url: "https://www.jigsawplanet.com/" },
    ],
    default: [
      { name: "Lumosity", emoji: "🧠", why: "Keep your mind sharp and engaged", url: "https://www.lumosity.com/en/" },
      { name: "Calm", emoji: "🧘", why: "Relaxation and mindfulness exercises", url: "https://www.calm.com/" },
      { name: "Sudoku", emoji: "🔢", why: "A satisfying puzzle to ground yourself", url: "https://sudoku.com/" },
    ]
  };

  if (emotion.includes("sad") || emotion.includes("grief") || emotion.includes("depress")) return gameMap.sad;
  if (emotion.includes("anxi") || emotion.includes("stress") || emotion.includes("worry") || emotion.includes("fear")) return gameMap.anxious;
  if (emotion.includes("ang") || emotion.includes("frustrat") || emotion.includes("irritat")) return gameMap.angry;
  if (emotion.includes("happ") || emotion.includes("joy") || emotion.includes("excit")) return gameMap.happy;
  if (emotion.includes("lone") || emotion.includes("isolat") || emotion.includes("alone")) return gameMap.lonely;
  if (emotion.includes("confus") || emotion.includes("lost") || emotion.includes("uncertain")) return gameMap.confused;
  return gameMap.default;
};

export default function ForYouPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const s = JSON.parse(localStorage.getItem("neuchromatic_current_" + u.uid) || "{}");
      
      // Guard — if no session data exists, redirect to journal
      if (!s.emotion?.primaryEmotion) {
        router.push("/journal");
        return;
      }
      
      await generateRecommendations(s);
    });
    return () => unsub();
  }, []);

  const generateRecommendations = async (s) => {
    setLoading(true);
    try {
      const emotion = s.emotion?.primaryEmotion || "mixed emotions";
      const intensity = s.emotion?.intensity || 5;

      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: "Based on the user emotional session, generate personalized recommendations. Return ONLY a valid JSON object with these exact keys: summary (string, 3-4 sentences), phrase (string, one short powerful phrase), quote (string, one quote with author), affirmations (array of exactly 3 strings). No extra text outside the JSON, no markdown, just raw JSON."
          }],
          context: {
            emotion,
            intensity,
            keywords: s.emotion?.keywords || [],
            imageEmotion: s.imageReaction?.emotion?.primaryEmotion || "",
            drawingEmotion: s.drawingAnalysis?.emotion || "",
            colorEmotion: s.colorFill?.analysis?.emotion || "",
            mentalHealthNote: s.emotion?.mentalHealthNote || ""
          },
          questionNumber: 99
        })
      });
      const data = await res.json();
      const raw = data.message || "{}";
try {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const cleaned = jsonMatch[0]
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");
    setRecommendations(JSON.parse(cleaned));
  } else {
    // AI didn't return JSON — build a fallback from the raw text
    setRecommendations({
      summary: raw.slice(0, 300),
      phrase: "You are doing better than you think.",
      quote: "The present moment always will have been. — Unknown",
      affirmations: [
        "I acknowledge my emotions without judgment.",
        "I am allowed to feel complex things.",
        "I am growing through what I am going through."
      ]
    });
  }
} catch (e) {
  console.error("JSON parse failed:", e);
  setRecommendations({
    summary: "Today you took a brave step by reflecting on your emotions. That matters.",
    phrase: "You are enough, exactly as you are.",
    quote: "The wound is the place where the light enters you. — Rumi",
    affirmations: [
      "I acknowledge my emotions without judgment.",
      "I am allowed to feel complex things.",
      "I am growing through what I am going through."
    ]
  });
}
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openYoutube = (title) => {
    window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(title), "_blank");
  };

  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#FDFBF7",
      flexDirection: "column", gap: "20px"
    }}>
      <div style={{
        width: "56px", height: "56px", border: "3px solid #EDE9FE",
        borderTop: "3px solid #7C3AED", borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      <p style={{ color: "#6B7280", fontFamily: "Inter, sans-serif", fontSize: "16px" }}>
        Crafting your personalized recommendations...
      </p>
    </div>
  );

  const games = recommendations ? getGamesForEmotion(recommendations) : [];

  const videoSuggestions = [
    { title: "5 minute meditation for anxiety relief", reason: "Quick calming technique for immediate relief" },
    { title: "Nature sounds for sleep and relaxation", reason: "Soothing sounds to calm your nervous system" },
    { title: "Alan Watts on letting go of emotions", reason: "Deep philosophical perspective on your feelings" },
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
        <button onClick={() => router.push("/journal/chatbot")} style={{
          background: "none", border: "1.5px solid #E5E7EB", borderRadius: "10px",
          padding: "8px 18px", cursor: "pointer", fontSize: "14px",
          color: "#6B7280", fontFamily: "Inter, sans-serif"
        }}>← Back</button>
      </nav>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "60px 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{
            fontSize: "13px", fontWeight: "600", letterSpacing: "2px",
            color: "#7C3AED", textTransform: "uppercase", marginBottom: "12px"
          }}>Step 6 of 6</p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: "42px",
            fontWeight: "700", color: "#1C1C2E", marginBottom: "12px"
          }}>Just for you 💫</h1>
          <p style={{ color: "#6B7280", fontSize: "17px" }}>
            Personalized for your emotional state today
          </p>
        </div>

        {recommendations && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

            {/* Summary */}
            <div style={{
              background: "linear-gradient(135deg, #7C3AED, #0D9488)",
              borderRadius: "24px", padding: "36px", color: "white"
            }}>
              <h2 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "22px",
                fontWeight: "700", marginBottom: "16px"
              }}>📋 Your Journey Today</h2>
              <p style={{ fontSize: "16px", lineHeight: 1.8, opacity: 0.95 }}>
                {recommendations.summary}
              </p>
            </div>

            {/* Phrase + Quote */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{
                background: "white", borderRadius: "20px", padding: "28px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)", borderLeft: "4px solid #7C3AED"
              }}>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif", fontSize: "16px",
                  color: "#7C3AED", marginBottom: "12px"
                }}>✨ Your phrase for today</h3>
                <p style={{
                  fontFamily: "'Playfair Display', serif", fontSize: "18px",
                  color: "#1C1C2E", lineHeight: 1.6, fontStyle: "italic"
                }}>"{recommendations.phrase}"</p>
              </div>
              <div style={{
                background: "white", borderRadius: "20px", padding: "28px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)", borderLeft: "4px solid #0D9488"
              }}>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif", fontSize: "16px",
                  color: "#0D9488", marginBottom: "12px"
                }}>🌿 Calming quote</h3>
                <p style={{
                  fontFamily: "'Playfair Display', serif", fontSize: "16px",
                  color: "#1C1C2E", lineHeight: 1.6, fontStyle: "italic"
                }}>"{recommendations.quote}"</p>
              </div>
            </div>

            {/* Affirmations */}
            <div style={{
              background: "white", borderRadius: "20px", padding: "28px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "20px",
                color: "#1C1C2E", marginBottom: "20px"
              }}>💜 Affirmations for you</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {(recommendations.affirmations || []).map((a, i) => (
                  <div key={i} style={{
                    background: "linear-gradient(135deg, #EDE9FE, #F3F4F6)",
                    borderRadius: "12px", padding: "16px 20px",
                    display: "flex", alignItems: "center", gap: "12px"
                  }}>
                    <span style={{ fontSize: "20px" }}>{"💜💚💛"[i]}</span>
                    <p style={{ color: "#374151", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>{a}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Games */}
            <div style={{
              background: "white", borderRadius: "20px", padding: "28px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "20px",
                color: "#1C1C2E", marginBottom: "8px"
              }}>🎮 Games for mood upliftment</h3>
              <p style={{ color: "#9CA3AF", fontSize: "13px", marginBottom: "20px" }}>
                Picked based on your emotion today
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {games.map((game, i) => (
                  <div key={i}
                    onClick={() => window.open(game.url, "_blank")}
                    style={{
                      background: "#FAFAFA", borderRadius: "14px", padding: "20px",
                      border: "1.5px solid #E5E7EB", textAlign: "center",
                      cursor: "pointer", transition: "all 0.2s"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.border = "1.5px solid #7C3AED";
                      e.currentTarget.style.background = "#EDE9FE";
                      e.currentTarget.style.transform = "translateY(-4px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.border = "1.5px solid #E5E7EB";
                      e.currentTarget.style.background = "#FAFAFA";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ fontSize: "36px", marginBottom: "10px" }}>{game.emoji}</div>
                    <h4 style={{ fontSize: "15px", fontWeight: "600", color: "#1C1C2E", marginBottom: "6px" }}>
                      {game.name}
                    </h4>
                    <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.5, marginBottom: "10px" }}>
                      {game.why}
                    </p>
                    <span style={{
                      fontSize: "12px", color: "#7C3AED", fontWeight: "500",
                      background: "#EDE9FE", padding: "4px 12px", borderRadius: "20px"
                    }}>Play now →</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Videos */}
            <div style={{
              background: "white", borderRadius: "20px", padding: "28px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "20px",
                color: "#1C1C2E", marginBottom: "20px"
              }}>🎬 Watch something uplifting</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {videoSuggestions.map((video, i) => (
                  <div key={i}
                    onClick={() => openYoutube(video.title)}
                    style={{
                      display: "flex", alignItems: "center", gap: "16px",
                      padding: "16px 20px", borderRadius: "12px",
                      background: "#FAFAFA", border: "1.5px solid #E5E7EB",
                      cursor: "pointer", transition: "all 0.2s"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.border = "1.5px solid #7C3AED";
                      e.currentTarget.style.background = "#EDE9FE";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.border = "1.5px solid #E5E7EB";
                      e.currentTarget.style.background = "#FAFAFA";
                    }}
                  >
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "10px",
                      background: "#EF4444", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "18px", flexShrink: 0
                    }}>▶️</div>
                    <div>
                      <p style={{ fontWeight: "500", color: "#1C1C2E", fontSize: "15px", margin: "0 0 3px" }}>
                        {video.title}
                      </p>
                      <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>{video.reason}</p>
                    </div>
                    <span style={{ marginLeft: "auto", color: "#9CA3AF", fontSize: "18px" }}>→</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Final buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <button
                onClick={() => router.push("/reports")}
                className="btn-primary"
                style={{ fontSize: "15px", padding: "16px" }}
              >
                📊 View full report
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="btn-secondary"
                style={{ fontSize: "15px", padding: "16px" }}
              >
                🏠 Back to dashboard
              </button>
            </div>

          </div>
        )}

        {!recommendations && !loading && (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <p style={{ color: "#6B7280", marginBottom: "20px" }}>
              Could not load recommendations. Please complete the journal session first.
            </p>
            <button onClick={() => router.push("/journal")} className="btn-primary">
              Go to Journal
            </button>
          </div>
        )}

      </div>
    </div>
  );
}