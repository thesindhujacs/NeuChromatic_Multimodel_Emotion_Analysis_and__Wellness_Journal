'use client';
import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { updateSession } from "@/lib/db";

const DRAWING_QUESTIONS = [
  "Draw how your mind feels right now — its shape, its weather, its texture.",
  "If your current emotion was a landscape, what would it look like? Draw it.",
  "Draw the weight you are carrying today.",
  "Illustrate the distance between where you are and where you want to be.",
  "Draw what home feels like to you emotionally right now.",
  "If your anxiety or joy had a physical form, draw it.",
];

export default function DrawingPage() {
  const canvasRef = useRef(null);
  const [user, setUser] = useState(null);
  const [question] = useState(DRAWING_QUESTIONS[Math.floor(Math.random() * DRAWING_QUESTIONS.length)]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#7C3AED");
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState("pen");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState("draw");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [capturedDrawing, setCapturedDrawing] = useState(null);
  const lastPos = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
      else setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (step !== "draw") return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, 200);
    return () => clearTimeout(timer);
  }, [step]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "#FFFFFF" : color;
    ctx.lineWidth = tool === "eraser" ? brushSize * 4 : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setCapturedDrawing(null);
  };

  // Capture drawing BEFORE switching to describe step
  const goToDescribe = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        const dataUrl = canvas.toDataURL("image/png");
        setCapturedDrawing(dataUrl);
        console.log("Drawing captured! Size:", dataUrl.length);
      } catch (e) {
        console.error("Failed to capture drawing:", e);
      }
    }
    setStep("describe");
  };

  const handleAnalyze = async () => {
    if (description.trim().length < 10) return;
    setLoading(true);

    try {
      const res = await fetch("/api/color-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          drawingDescription: description,
          colors: null
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);

        const key = "neuchromatic_current_" + user.uid;
        const session = JSON.parse(localStorage.getItem(key) || "{}");
        session.drawing = capturedDrawing || "";
        session.drawingDescription = description;
        session.drawingAnalysis = data.data;
        localStorage.setItem(key, JSON.stringify(session));

        const sessionsKey = "neuchromatic_sessions_" + user.uid;
        const sessions = JSON.parse(localStorage.getItem(sessionsKey) || "[]");
        if (sessions.length > 0) {
          sessions[sessions.length - 1].drawing = capturedDrawing || "";
          sessions[sessions.length - 1].drawingDescription = description;
          sessions[sessions.length - 1].drawingAnalysis = data.data;
          localStorage.setItem(sessionsKey, JSON.stringify(sessions));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const colors = ["#1C1C2E", "#7C3AED", "#0D9488", "#EC4899", "#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#F97316", "#FFFFFF"];

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
        <button onClick={() => router.push("/journal/psych/image")} style={{
          background: "none", border: "1.5px solid #E5E7EB", borderRadius: "10px",
          padding: "8px 18px", cursor: "pointer", fontSize: "14px",
          color: "#6B7280", fontFamily: "Inter, sans-serif"
        }}>← Back</button>
      </nav>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "60px 24px" }}>
        {!result ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "36px" }}>
              <p style={{
                fontSize: "13px", fontWeight: "600", letterSpacing: "2px",
                color: "#F59E0B", textTransform: "uppercase", marginBottom: "12px"
              }}>Step 3 of 6</p>
              <h1 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "36px",
                fontWeight: "700", color: "#1C1C2E", marginBottom: "16px"
              }}>Express through drawing</h1>
              <div style={{
                background: "linear-gradient(135deg, #FEF3C7, #FFFBEB)",
                border: "2px solid #F59E0B", borderRadius: "16px",
                padding: "20px 28px", fontSize: "17px", color: "#92400E",
                fontStyle: "italic", lineHeight: 1.7, maxWidth: "600px", margin: "0 auto"
              }}>
                "{question}"
              </div>
            </div>

            {/* Step tabs */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", justifyContent: "center" }}>
              {[
                { id: "draw", label: "1. Draw it" },
                { id: "describe", label: "2. Describe it" }
              ].map((s) => (
                <div key={s.id} style={{
                  padding: "8px 24px", borderRadius: "20px", fontSize: "14px",
                  fontWeight: "500", cursor: "pointer",
                  background: step === s.id ? "#7C3AED" : "#E5E7EB",
                  color: step === s.id ? "white" : "#6B7280"
                }} onClick={() => {
                  if (s.id === "describe") goToDescribe();
                  else setStep("draw");
                }}>{s.label}</div>
              ))}
            </div>

            {step === "draw" && (
              <>
                {/* Preview of captured drawing */}
                {capturedDrawing && (
                  <div style={{
                    background: "#EDE9FE", borderRadius: "12px", padding: "12px 16px",
                    marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px"
                  }}>
                    <span style={{ fontSize: "16px" }}>✅</span>
                    <span style={{ fontSize: "14px", color: "#7C3AED", fontWeight: "500" }}>
                      Drawing captured! You can keep drawing or proceed to describe it.
                    </span>
                  </div>
                )}

                {/* Toolbar */}
                <div style={{
                  background: "white", borderRadius: "16px", padding: "16px 20px",
                  marginBottom: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap"
                }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {colors.map((c) => (
                      <div key={c} onClick={() => { setColor(c); setTool("pen"); }} style={{
                        width: "28px", height: "28px", borderRadius: "50%", background: c,
                        cursor: "pointer",
                        border: color === c && tool === "pen" ? "3px solid #7C3AED" : "2px solid #E5E7EB",
                        transform: color === c && tool === "pen" ? "scale(1.2)" : "scale(1)",
                        transition: "transform 0.15s"
                      }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#6B7280" }}>Size</span>
                    <input type="range" min="1" max="20" value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      style={{ width: "80px" }} />
                    <span style={{ fontSize: "13px", color: "#6B7280" }}>{brushSize}px</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setTool("pen")} style={{
                      padding: "6px 14px", borderRadius: "8px", cursor: "pointer",
                      border: "1.5px solid", fontFamily: "Inter, sans-serif",
                      borderColor: tool === "pen" ? "#7C3AED" : "#E5E7EB",
                      background: tool === "pen" ? "#EDE9FE" : "white",
                      color: tool === "pen" ? "#7C3AED" : "#6B7280", fontSize: "13px"
                    }}>✏️ Pen</button>
                    <button onClick={() => setTool("eraser")} style={{
                      padding: "6px 14px", borderRadius: "8px", cursor: "pointer",
                      border: "1.5px solid", fontFamily: "Inter, sans-serif",
                      borderColor: tool === "eraser" ? "#7C3AED" : "#E5E7EB",
                      background: tool === "eraser" ? "#EDE9FE" : "white",
                      color: tool === "eraser" ? "#7C3AED" : "#6B7280", fontSize: "13px"
                    }}>⬜ Eraser</button>
                    <button onClick={clearCanvas} style={{
                      padding: "6px 14px", borderRadius: "8px", cursor: "pointer",
                      border: "1.5px solid #FCA5A5", background: "#FEF2F2",
                      color: "#EF4444", fontSize: "13px", fontFamily: "Inter, sans-serif"
                    }}>🗑️ Clear</button>
                  </div>
                </div>

                {/* Canvas */}
                <div style={{
                  borderRadius: "20px", overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                  marginBottom: "16px", border: "2px solid #E5E7EB",
                  cursor: tool === "eraser" ? "cell" : "crosshair",
                  background: "white"
                }}>
                  <canvas
                    ref={canvasRef}
                    width={760}
                    height={380}
                    style={{ display: "block", width: "100%", height: "auto", touchAction: "none" }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                </div>

                <button onClick={goToDescribe} className="btn-primary"
                  style={{ width: "100%", fontSize: "16px", padding: "16px" }}>
                  Done drawing — describe it →
                </button>
              </>
            )}

            {step === "describe" && (
              <>
                {/* Show captured drawing preview */}
                {capturedDrawing && capturedDrawing.length > 5000 && (
                  <div style={{
                    background: "white", borderRadius: "16px", padding: "16px",
                    marginBottom: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
                  }}>
                    <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "10px", fontWeight: "500" }}>
                      Your drawing:
                    </p>
                    <img
                      src={capturedDrawing}
                      alt="Your drawing"
                      style={{
                        width: "100%", height: "180px", objectFit: "cover",
                        borderRadius: "10px", border: "1px solid #E5E7EB"
                      }}
                    />
                  </div>
                )}

                <div style={{
                  background: "white", borderRadius: "20px", padding: "28px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: "20px"
                }}>
                  <label style={{
                    display: "block", fontSize: "16px", fontWeight: "500",
                    color: "#374151", marginBottom: "8px"
                  }}>
                    Describe what you drew and what it means to you
                  </label>
                  <p style={{ fontSize: "14px", color: "#9CA3AF", marginBottom: "16px" }}>
                    What shapes, colors, or symbols did you use? What were you trying to express?
                  </p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="I drew... The shapes represent... The colors mean... I was trying to show..."
                    rows={6}
                    className="input-field"
                    style={{ fontSize: "15px", lineHeight: "1.8" }}
                  />
                  <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: "8px" }}>
                    {description.length} characters
                    {description.trim().length < 10 && description.length > 0 && " · write a bit more"}
                  </p>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading || description.trim().length < 10}
                  className="btn-primary"
                  style={{
                    width: "100%", fontSize: "16px", padding: "16px",
                    opacity: description.trim().length < 10 ? 0.6 : 1
                  }}
                >
                  {loading ? "Analyzing your drawing..." : "Analyze my drawing →"}
                </button>

                <button onClick={() => setStep("draw")} className="btn-secondary"
                  style={{ width: "100%", fontSize: "15px", padding: "14px", marginTop: "12px" }}>
                  ← Go back to drawing
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h1 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "36px",
                fontWeight: "700", color: "#1C1C2E", marginBottom: "8px"
              }}>Your Drawing Analysis</h1>
              <p style={{ color: "#6B7280" }}>What your art reveals about your emotions</p>
            </div>

            {/* Show the drawing in results too */}
            {capturedDrawing && capturedDrawing.length > 5000 && (
              <div style={{
                background: "white", borderRadius: "20px", padding: "20px",
                marginBottom: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
              }}>
                <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "12px", fontWeight: "500" }}>
                  Your drawing:
                </p>
                <img
                  src={capturedDrawing}
                  alt="Your drawing"
                  style={{
                    width: "100%", height: "220px", objectFit: "cover",
                    borderRadius: "12px", border: "1px solid #E5E7EB"
                  }}
                />
              </div>
            )}

            <div style={{
              background: "#1C1C2E", borderRadius: "24px", padding: "40px",
              textAlign: "center", marginBottom: "24px"
            }}>
              <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎨</div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif", fontSize: "32px",
                fontWeight: "700", color: "white", marginBottom: "8px", textTransform: "capitalize"
              }}>{result.emotion}</h2>
              {result.intensity && (
                <div style={{
                  background: "rgba(255,255,255,0.15)", borderRadius: "20px",
                  padding: "6px 20px", display: "inline-block",
                  color: "white", fontSize: "14px", marginBottom: "20px"
                }}>Intensity: {result.intensity}/10</div>
              )}
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "16px", lineHeight: 1.7 }}>
                {result.analysis}
              </p>
            </div>

            {result.insight && (
              <div style={{
                background: "linear-gradient(135deg, #FEF3C7, #EDE9FE)",
                borderRadius: "20px", padding: "24px", marginBottom: "24px"
              }}>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif", fontSize: "17px",
                  color: "#1C1C2E", marginBottom: "8px"
                }}>💡 Deep Insight</h3>
                <p style={{ color: "#374151", fontSize: "15px", lineHeight: 1.7 }}>{result.insight}</p>
              </div>
            )}

            <button onClick={() => router.push("/journal/psych/color")}
              className="btn-primary" style={{ width: "100%", fontSize: "16px", padding: "16px" }}>
              Continue to Color Fill →
            </button>
          </>
        )}
      </div>
    </div>
  );
}