'use client';
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { updateSession } from "@/lib/db";

const COLOR_PALETTE = [
  { hex: "#EF4444", name: "Red", meaning: "passion, anger, energy" },
  { hex: "#F97316", name: "Orange", meaning: "enthusiasm, warmth, creativity" },
  { hex: "#F59E0B", name: "Yellow", meaning: "joy, optimism, anxiety" },
  { hex: "#10B981", name: "Green", meaning: "calm, growth, balance" },
  { hex: "#3B82F6", name: "Blue", meaning: "sadness, peace, depth" },
  { hex: "#7C3AED", name: "Purple", meaning: "mystery, spirituality, wisdom" },
  { hex: "#EC4899", name: "Pink", meaning: "love, tenderness, vulnerability" },
  { hex: "#6B7280", name: "Gray", meaning: "numbness, neutrality, confusion" },
  { hex: "#1C1C2E", name: "Black", meaning: "grief, strength, unknown" },
  { hex: "#FDFBF7", name: "White", meaning: "emptiness, clarity, peace" },
];

const REGIONS = [
  { id: "mind", label: "Mind", x: "35%", y: "5%", w: "30%", h: "22%", shape: "ellipse" },
  { id: "heart", label: "Heart", x: "30%", y: "32%", w: "40%", h: "20%", shape: "rect" },
  { id: "gut", label: "Gut feeling", x: "32%", y: "56%", w: "36%", h: "16%", shape: "rect" },
  { id: "hands", label: "Hands / Actions", x: "5%", y: "40%", w: "22%", h: "28%", shape: "rect" },
  { id: "feet", label: "Ground / Stability", x: "25%", y: "76%", w: "50%", h: "18%", shape: "rect" },
  { id: "outer", label: "Outer world", x: "72%", y: "20%", w: "23%", h: "60%", shape: "rect" },
];

export default function ColorFillPage() {
  const [user, setUser] = useState(null);
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [filledRegions, setFilledRegions] = useState({});
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

  const fillRegion = (regionId) => {
    setFilledRegions(prev => ({
      ...prev,
      [regionId]: selectedColor
    }));
  };

  const handleAnalyze = async () => {
    if (Object.keys(filledRegions).length < 3) return;
    setLoading(true);
    setError("");

    try {
      const colorSummary = Object.entries(filledRegions).map(([region, color]) =>
        region + ": " + color.name + " (" + color.meaning + ")"
      ).join(", ");

      const res = await fetch("/api/color-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colors: Object.entries(filledRegions).map(([k, v]) => v.name + " for " + k),
          question: null,
          drawingDescription: colorSummary
        })
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.data);

        const colorData = { regions: filledRegions, analysis: data.data };

        // Update localStorage
        const key = "neuchromatic_current_" + user.uid;
        const session = JSON.parse(localStorage.getItem(key) || "{}");
        session.colorFill = colorData;
        localStorage.setItem(key, JSON.stringify(session));

        const sessionsKey = "neuchromatic_sessions_" + user.uid;
        const sessions = JSON.parse(localStorage.getItem(sessionsKey) || "[]");
        if (sessions.length > 0) {
          sessions[sessions.length - 1].colorFill = colorData;
          localStorage.setItem(sessionsKey, JSON.stringify(sessions));
        }

        // Update Supabase
        try {
          if (session.dbId) {
            await updateSession(session.dbId, { color_fill: colorData });
          }
        } catch (dbErr) {
          console.log("Supabase update skipped:", dbErr);
        }

      } else {
        setError("Analysis failed. Please try again.");
      }
    } catch (e) {
      console.error("Color analysis error:", e);
      setError("Something went wrong. Please try again.");
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
        <button onClick={() => router.push("/journal/psych/drawing")} style={{
          background: "none", border: "1.5px solid #E5E7EB", borderRadius: "10px",
          padding: "8px 18px", cursor: "pointer", fontSize: "14px",
          color: "#6B7280", fontFamily: "Inter, sans-serif"
        }}>← Back</button>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 24px" }}>
        {!result ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <p style={{
                fontSize: "13px", fontWeight: "600", letterSpacing: "2px",
                color: "#0D9488", textTransform: "uppercase", marginBottom: "12px"
              }}>Step 4 of 6</p>
              <h1 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "38px",
                fontWeight: "700", color: "#1C1C2E", marginBottom: "12px"
              }}>Color your emotional body</h1>
              <p style={{ color: "#6B7280", fontSize: "16px", maxWidth: "500px", margin: "0 auto" }}>
                Select a color, then click each body region to fill it with the color that matches how that part of you feels right now.
              </p>
            </div>

            <div style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>
              {/* Color Palette */}
              <div style={{
                background: "white", borderRadius: "20px", padding: "24px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)", minWidth: "180px"
              }}>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif", fontSize: "16px",
                  color: "#1C1C2E", marginBottom: "16px"
                }}>Choose color</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {COLOR_PALETTE.map((c) => (
                    <div key={c.hex} onClick={() => setSelectedColor(c)} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      cursor: "pointer", padding: "8px 10px", borderRadius: "10px",
                      background: selectedColor.hex === c.hex ? "#F3F4F6" : "transparent",
                      border: selectedColor.hex === c.hex ? "1.5px solid #7C3AED" : "1.5px solid transparent",
                      transition: "all 0.15s"
                    }}>
                      <div style={{
                        width: "24px", height: "24px", borderRadius: "50%",
                        background: c.hex, border: "1.5px solid #E5E7EB", flexShrink: 0
                      }} />
                      <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>{c.name}</span>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: "20px", padding: "12px", borderRadius: "10px",
                  background: selectedColor.hex, textAlign: "center"
                }}>
                  <p style={{
                    fontSize: "11px", fontWeight: "500",
                    color: selectedColor.hex === "#FDFBF7" || selectedColor.hex === "#F59E0B" ? "#374151" : "white"
                  }}>
                    {selectedColor.meaning}
                  </p>
                </div>
              </div>

              {/* Body Map */}
              <div style={{ flex: 1 }}>
                <div style={{
                  background: "white", borderRadius: "20px", padding: "24px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                  position: "relative", minHeight: "480px"
                }}>
                  <div style={{ position: "relative", height: "440px" }}>
                    {REGIONS.map((region) => (
                      <div
                        key={region.id}
                        onClick={() => fillRegion(region.id)}
                        title={"Click to fill " + region.label + " with " + selectedColor.name}
                        style={{
                          position: "absolute",
                          left: region.x, top: region.y,
                          width: region.w, height: region.h,
                          background: filledRegions[region.id]?.hex || "#F3F4F6",
                          borderRadius: region.shape === "ellipse" ? "50%" : "12px",
                          cursor: "pointer",
                          border: filledRegions[region.id] ? "2px solid rgba(0,0,0,0.1)" : "2px dashed #D1D5DB",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.2s",
                          boxShadow: filledRegions[region.id] ? "0 4px 16px " + filledRegions[region.id].hex + "44" : "none"
                        }}
                      >
                        <span style={{
                          fontSize: "11px", fontWeight: "600",
                          color: filledRegions[region.id]?.hex === "#1C1C2E" ? "white" :
                            filledRegions[region.id]?.hex === "#FDFBF7" ? "#374151" :
                              filledRegions[region.id] ? "white" : "#9CA3AF",
                          textAlign: "center", padding: "4px",
                          textShadow: filledRegions[region.id] && filledRegions[region.id].hex !== "#F59E0B" ? "0 1px 3px rgba(0,0,0,0.3)" : "none"
                        }}>
                          {region.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  marginTop: "16px", display: "flex", gap: "12px",
                  justifyContent: "space-between", alignItems: "center"
                }}>
                  <p style={{ fontSize: "13px", color: "#6B7280" }}>
                    {Object.keys(filledRegions).length} of {REGIONS.length} regions filled
                    {Object.keys(filledRegions).length < 3 && " · fill at least 3 to continue"}
                  </p>
                  <button onClick={() => setFilledRegions({})} style={{
                    background: "none", border: "1px solid #FCA5A5",
                    borderRadius: "8px", padding: "6px 14px",
                    cursor: "pointer", fontSize: "13px",
                    color: "#EF4444", fontFamily: "Inter, sans-serif"
                  }}>🗑️ Reset</button>
                </div>

                {error && (
                  <div style={{
                    background: "#FEE2E2", color: "#DC2626", padding: "12px 16px",
                    borderRadius: "10px", marginTop: "12px", fontSize: "14px"
                  }}>{error}</div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={loading || Object.keys(filledRegions).length < 3}
                  className="btn-primary"
                  style={{
                    width: "100%", fontSize: "16px", padding: "16px", marginTop: "20px",
                    opacity: Object.keys(filledRegions).length < 3 ? 0.6 : 1
                  }}
                >
                  {loading ? "Analyzing your colors..." : "Analyze my color choices →"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "36px",
                fontWeight: "700", color: "#1C1C2E", marginBottom: "8px"
              }}>Your Color Analysis</h1>
              <p style={{ color: "#6B7280" }}>The psychology of your color choices</p>
            </div>

            <div style={{
              background: "linear-gradient(135deg, #0D9488, #7C3AED)",
              borderRadius: "24px", padding: "40px", textAlign: "center",
              marginBottom: "24px", boxShadow: "0 12px 40px rgba(13,148,136,0.3)"
            }}>
              <div style={{ fontSize: "56px", marginBottom: "12px" }}>🌈</div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "32px",
                fontWeight: "700", color: "white", marginBottom: "20px", textTransform: "capitalize"
              }}>{result.emotion}</h2>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "16px", lineHeight: 1.7 }}>
                {result.meaning}
              </p>
            </div>

            {/* Color choices breakdown */}
            <div style={{
              background: "white", borderRadius: "20px", padding: "28px",
              marginBottom: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
            }}>
              <h3 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "18px",
                color: "#1C1C2E", marginBottom: "20px"
              }}>Your Color Choices</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {Object.entries(filledRegions).map(([region, color]) => (
                  <div key={region} style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "12px 16px", borderRadius: "12px", background: "#FAFAFA"
                  }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: color.hex, border: "2px solid #E5E7EB", flexShrink: 0
                    }} />
                    <div>
                      <span style={{ fontWeight: "600", fontSize: "14px", color: "#1C1C2E" }}>
                        {region.charAt(0).toUpperCase() + region.slice(1)}
                      </span>
                      <span style={{ fontSize: "14px", color: "#6B7280" }}> → {color.name}</span>
                      <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "2px 0 0" }}>{color.meaning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => router.push("/journal/chatbot")}
              className="btn-primary"
              style={{ width: "100%", fontSize: "16px", padding: "16px" }}
            >
              Continue to AI Chatbot →
            </button>
          </>
        )}
      </div>
    </div>
  );
}