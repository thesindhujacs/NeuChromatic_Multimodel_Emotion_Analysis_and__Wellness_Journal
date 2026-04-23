'use client';
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getUserSessions, getUserReport, saveReport, formatSession } from "@/lib/db";

export default function ReportsPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      setLoadingData(true);

      const dbSessions = await getUserSessions(u.uid);
      let mergedSessions = [];

      const localRaw = localStorage.getItem("neuchromatic_sessions_" + u.uid);
      const localSessions = localRaw ? JSON.parse(localRaw) : [];

      if (dbSessions.length > 0) {
        const formatted = dbSessions.map(formatSession);

        mergedSessions = formatted.map((dbS) => {
          const localMatch = localSessions.find(
            (ls) => ls.dbId === dbS.id || ls.id === dbS.id
          );
          return {
            ...dbS,
            drawing: (localMatch?.drawing && localMatch.drawing.length > 5000)
              ? localMatch.drawing
              : (dbS.drawing && dbS.drawing.length > 5000 ? dbS.drawing : ""),
            drawingAnalysis: dbS.drawingAnalysis?.emotion
              ? dbS.drawingAnalysis
              : localMatch?.drawingAnalysis || dbS.drawingAnalysis,
            drawingDescription: dbS.drawingDescription || localMatch?.drawingDescription || "",
          };
        });

        setSessions(mergedSessions);
        localStorage.setItem("neuchromatic_sessions_" + u.uid, JSON.stringify(mergedSessions));
      } else {
        mergedSessions = localSessions;
        setSessions(localSessions);
      }

      const savedReport = await getUserReport(u.uid);
      if (savedReport) {
        setReport(savedReport.report_text);
      } else {
        const localReport = localStorage.getItem("neuchromatic_report_" + u.uid);
        if (localReport) {
          try { setReport(JSON.parse(localReport).report); } catch (e) { /* ignore */ }
        }
      }

      setLoadingData(false);
    });
    return () => unsub();
  }, []);

  const moodData = sessions.map((s, i) => ({
    name: "S" + (i + 1),
    intensity: s.emotion?.intensity || 5,
    emotion: s.emotion?.primaryEmotion || "Unknown"
  }));

  const emotionCounts = sessions.reduce((acc, s) => {
    const e = s.emotion?.primaryEmotion || "Unknown";
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(emotionCounts).map(([name, value]) => ({ name, value }));
  const COLORS = ["#7C3AED", "#0D9488", "#EC4899", "#F59E0B", "#3B82F6", "#10B981"];

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [],
          context: { sessions },
          questionNumber: 98
        })
      });
      const data = await res.json();
      setReport(data.message);
      await saveReport(user.uid, data.message, sessions.length);
      localStorage.setItem("neuchromatic_report_" + user.uid, JSON.stringify({
        report: data.message,
        generatedAt: new Date().toISOString(),
        sessionCount: sessions.length
      }));
    } catch (e) {
      console.error(e);
      setReport("Unable to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const formatReport = (text) => {
    if (!text) return null;
    const clean = text.replace(/\*\*/g, "").replace(/\*/g, "");
    return clean.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: "12px" }} />;
      const isMainHeader = line.match(/^\d+\.\s+[A-Z]/) || line.match(/^[A-Z][A-Z\s]{6,}$/);
      const isBullet = line.trim().startsWith("-") || line.trim().startsWith("•");
      return (
        <div key={i} style={{
          padding: isMainHeader ? "14px 0 6px" : isBullet ? "4px 0 4px 16px" : "3px 0",
          fontFamily: isMainHeader ? "'Playfair Display', serif" : "Inter, sans-serif",
          fontSize: isMainHeader ? "17px" : "15px",
          fontWeight: isMainHeader ? "700" : "400",
          color: isMainHeader ? "#7C3AED" : "#374151",
          lineHeight: 1.8,
          borderBottom: isMainHeader ? "1px solid #EDE9FE" : "none",
          marginBottom: isMainHeader ? "8px" : "0"
        }}>
          {isBullet ? "• " + line.trim().slice(1).trim() : line}
        </div>
      );
    });
  };

  const getDrawingEmotion = (s) => {
    return s.drawingAnalysis?.emotion || s.drawing_analysis?.emotion || null;
  };

  if (loadingData) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#FDFBF7", flexDirection: "column", gap: "16px"
    }}>
      <div style={{
        width: "48px", height: "48px", border: "3px solid #EDE9FE",
        borderTop: "3px solid #7C3AED", borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      <p style={{ color: "#6B7280", fontFamily: "Inter, sans-serif" }}>Loading your data...</p>
    </div>
  );

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
        <button onClick={() => router.push("/dashboard")} style={{
          background: "none", border: "1.5px solid #E5E7EB", borderRadius: "10px",
          padding: "8px 18px", cursor: "pointer", fontSize: "14px",
          color: "#6B7280", fontFamily: "Inter, sans-serif"
        }}>← Back</button>
      </nav>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{
            fontSize: "13px", fontWeight: "600", letterSpacing: "2px",
            color: "#7C3AED", textTransform: "uppercase", marginBottom: "12px"
          }}>Mental Wellness</p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: "42px",
            fontWeight: "700", color: "#1C1C2E", marginBottom: "12px"
          }}>Your Clinical Report</h1>
          <p style={{ color: "#6B7280", fontSize: "17px" }}>
            {sessions.length === 0
              ? "Complete your first journal session to see your report here."
              : "Based on " + sessions.length + " session" + (sessions.length > 1 ? "s" : "") + " tracked."}
          </p>
        </div>

        {sessions.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 40px", background: "white",
            borderRadius: "24px", boxShadow: "0 4px 24px rgba(0,0,0,0.06)"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "24px" }}>📊</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "24px", color: "#1C1C2E", marginBottom: "12px" }}>
              No sessions yet
            </h2>
            <p style={{ color: "#6B7280", marginBottom: "32px" }}>
              Start your first journal session and your emotional data will appear here as beautiful charts.
            </p>
            <button onClick={() => router.push("/journal")} className="btn-primary">
              Start journaling →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {[
                { label: "Total Sessions", icon: "📔", color: "#7C3AED", value: sessions.length },
                {
                  label: "Avg Intensity", icon: "📈", color: "#0D9488",
                  value: (sessions.reduce((a, s) => a + (s.emotion?.intensity || 5), 0) / sessions.length).toFixed(1) + "/10"
                },
                {
                  label: "Dominant Emotion", icon: "💫", color: "#EC4899",
                  value: Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"
                }
              ].map((stat, i) => (
                <div key={i} style={{
                  background: "white", borderRadius: "16px", padding: "24px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)", textAlign: "center"
                }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>{stat.icon}</div>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: stat.color, marginBottom: "4px" }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: "13px", color: "#6B7280" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Session History */}
            <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "20px", color: "#1C1C2E" }}>
                Session History
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {sessions.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "16px",
                    padding: "14px 18px", borderRadius: "12px",
                    background: "#FAFAFA", border: "1px solid #F3F4F6"
                  }}>
                    <div style={{
                      width: "36px", height: "36px", borderRadius: "50%",
                      background: "linear-gradient(135deg, #7C3AED, #0D9488)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: "13px", fontWeight: "700", flexShrink: 0
                    }}>S{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: "600", fontSize: "15px", color: "#1C1C2E", textTransform: "capitalize" }}>
                          {s.emotion?.primaryEmotion || "Unknown"}
                        </span>
                        <span style={{ fontSize: "12px", background: "#EDE9FE", color: "#7C3AED", padding: "2px 10px", borderRadius: "20px" }}>
                          Intensity {s.emotion?.intensity || "?"}/10
                        </span>
                        {s.imageReaction?.emotion?.primaryEmotion && (
                          <span style={{ fontSize: "12px", background: "#FCE7F3", color: "#EC4899", padding: "2px 10px", borderRadius: "20px" }}>
                            Image: {s.imageReaction.emotion.primaryEmotion}
                          </span>
                        )}
                        {getDrawingEmotion(s) && (
                          <span style={{ fontSize: "12px", background: "#FEF3C7", color: "#D97706", padding: "2px 10px", borderRadius: "20px" }}>
                            Drawing: {getDrawingEmotion(s)}
                          </span>
                        )}
                        {s.colorFill?.analysis?.emotion && (
                          <span style={{ fontSize: "12px", background: "#CCFBF1", color: "#0D9488", padding: "2px 10px", borderRadius: "20px" }}>
                            Color: {s.colorFill.analysis.emotion}
                          </span>
                        )}
                      </div>
                      {s.emotion?.keywords && (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {s.emotion.keywords.map((kw, j) => (
                            <span key={j} style={{
                              fontSize: "11px", color: "#9CA3AF",
                              background: "#F3F4F6", padding: "2px 8px", borderRadius: "10px"
                            }}>{kw}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9CA3AF", flexShrink: 0 }}>
                      {s.date ? new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mood Timeline */}
            <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "24px", color: "#1C1C2E" }}>
                Mood Intensity Timeline
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={moodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} />
                  <YAxis domain={[1, 10]} tick={{ fontSize: 12, fill: "#6B7280" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                    formatter={(value) => [value + "/10", "Intensity"]}
                    labelFormatter={(label, payload) => {
                      const s = payload?.[0]?.payload;
                      return (label || "") + (s?.emotion ? " · " + s.emotion : "");
                    }}
                  />
                  <Line type="monotone" dataKey="intensity" stroke="#7C3AED" strokeWidth={3}
                    dot={{ fill: "#7C3AED", r: 6, strokeWidth: 2, stroke: "white" }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "24px", color: "#1C1C2E" }}>
                Emotion Distribution
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => name + " " + (percent * 100).toFixed(0) + "%"}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => [value + " session" + (value > 1 ? "s" : ""), "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Multimodal Comparison */}
            <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "8px", color: "#1C1C2E" }}>
                Multimodal Emotion Comparison
              </h3>
              <p style={{ color: "#9CA3AF", fontSize: "13px", marginBottom: "20px" }}>
                How your emotions differed across journal, image, drawing and color modalities
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {sessions.map((s, i) => (
                  <div key={i} style={{ padding: "16px", borderRadius: "12px", background: "#FAFAFA", border: "1px solid #F3F4F6" }}>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "#6B7280", marginBottom: "12px" }}>Session {i + 1}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                      {[
                        { label: "✍️ Journal", value: s.emotion?.primaryEmotion, color: "#EDE9FE", text: "#7C3AED" },
                        { label: "🖼️ Image", value: s.imageReaction?.emotion?.primaryEmotion, color: "#FCE7F3", text: "#EC4899" },
                        { label: "🎨 Drawing", value: getDrawingEmotion(s), color: "#FEF3C7", text: "#D97706" },
                        { label: "🌈 Color", value: s.colorFill?.analysis?.emotion, color: "#CCFBF1", text: "#0D9488" },
                      ].map((m, j) => (
                        <div key={j} style={{ background: m.color, borderRadius: "10px", padding: "10px 14px", textAlign: "center" }}>
                          <p style={{ fontSize: "11px", color: m.text, fontWeight: "600", marginBottom: "4px" }}>{m.label}</p>
                          <p style={{ fontSize: "13px", color: m.text, fontWeight: "700", textTransform: "capitalize" }}>
                            {m.value || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drawing Gallery */}
            <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "8px", color: "#1C1C2E" }}>
                🎨 Your Drawing Gallery
              </h3>
              <p style={{ color: "#9CA3AF", fontSize: "13px", marginBottom: "20px" }}>
                Drawings captured during your journal sessions
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {sessions.map((s, i) => {
                  const hasDrawing = s.drawing && s.drawing.length > 5000;
                  const drawingEmotion = getDrawingEmotion(s);
                  return (
                    <div key={i} style={{
                      borderRadius: "12px", overflow: "hidden",
                      border: "1px solid #F3F4F6", boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      {hasDrawing ? (
                        <img
                          src={s.drawing}
                          alt={"Drawing " + (i + 1)}
                          style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div style={{
                        width: "100%", height: "160px",
                        background: "linear-gradient(135deg, #F3F4F6, #EDE9FE)",
                        display: hasDrawing ? "none" : "flex",
                        flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: "8px"
                      }}>
                        <span style={{ fontSize: "32px" }}>🎨</span>
                        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>No drawing this session</span>
                      </div>
                      <div style={{ padding: "10px 14px", background: "#FAFAFA" }}>
                        <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 2px" }}>
                          {"Session " + (i + 1)}
                          {s.date ? " · " + new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                        </p>
                        <p style={{ fontSize: "13px", fontWeight: "600", color: "#D97706", margin: "0 0 2px", textTransform: "capitalize" }}>
                          {drawingEmotion || s.emotion?.primaryEmotion || "—"}
                        </p>
                        <p style={{ fontSize: "11px", color: "#9CA3AF", margin: 0, lineHeight: 1.4 }}>
                          {s.drawingAnalysis?.insight
                            ? (s.drawingAnalysis.insight.length > 70
                              ? s.drawingAnalysis.insight.slice(0, 70) + "..."
                              : s.drawingAnalysis.insight)
                            : drawingEmotion
                            ? "Emotion detected from drawing"
                            : s.drawingDescription
                            ? (s.drawingDescription.length > 60
                              ? s.drawingDescription.slice(0, 60) + "..."
                              : s.drawingDescription)
                            : "Complete drawing step to see analysis"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clinical Report */}
            <div style={{ background: "white", borderRadius: "20px", padding: "28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", color: "#1C1C2E", margin: "0 0 4px" }}>
                    🧠 Clinical Wellness Report
                  </h3>
                  <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
                    Professional psychiatric-style analysis of your emotional data
                  </p>
                </div>
                {report && (
                  <button onClick={generateReport} disabled={generating} style={{
                    background: "none", border: "1.5px solid #7C3AED", borderRadius: "10px",
                    padding: "8px 16px", cursor: "pointer", fontSize: "13px",
                    color: "#7C3AED", fontFamily: "Inter, sans-serif"
                  }}>
                    {generating ? "Regenerating..." : "↺ Regenerate"}
                  </button>
                )}
              </div>

              {report ? (
                <div style={{ background: "#FAFAFA", borderRadius: "14px", padding: "24px 28px", border: "1px solid #F3F4F6" }}>
                  {formatReport(report)}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 20px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔬</div>
                  <p style={{ color: "#6B7280", marginBottom: "8px", fontSize: "16px" }}>
                    Generate a comprehensive clinical report
                  </p>
                  <p style={{ color: "#9CA3AF", fontSize: "14px", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>
                    AI analyzes all your sessions — journal, image, drawing and color — to produce a psychiatric-style wellness assessment.
                  </p>
                  <button onClick={generateReport} disabled={generating} className="btn-primary" style={{ fontSize: "15px", padding: "14px 32px" }}>
                    {generating ? "⏳ Generating clinical report..." : "✨ Generate Clinical Report"}
                  </button>
                </div>
              )}
            </div>

            {/* Print */}
            <div style={{ textAlign: "center", paddingBottom: "20px" }}>
              <button onClick={() => window.print()} className="btn-secondary">
                🖨️ Print / Save as PDF
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}