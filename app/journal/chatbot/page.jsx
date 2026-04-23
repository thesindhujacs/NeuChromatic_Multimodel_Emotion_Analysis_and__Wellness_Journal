'use client';
import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function ChatbotPage() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const session = JSON.parse(localStorage.getItem("neuchromatic_current_" + u.uid) || "{}");
      
      // Guard — redirect if no session
      if (!session.emotion?.primaryEmotion) {
        router.push("/journal");
        return;
      }
      
      setContext(session);
      const firstMessage = await getAIResponse([], session, 0);
      setMessages([{ role: "assistant", content: firstMessage }]);
      setQuestionCount(1);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getAIResponse = async (msgs, ctx, qCount) => {
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, context: ctx, questionNumber: qCount })
      });
      const data = await res.json();
      return data.message || "I'm here with you. Tell me more about how you're feeling.";
    } catch (e) {
      return "I'm here with you. Tell me more about how you're feeling.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    if (questionCount >= 3) {
      // Final closing message
      const closing = await getAIResponse(newMessages, context, 4);
      setMessages([...newMessages, { role: "assistant", content: closing }]);
      setDone(true);

      // Save chatbot conversation to session
      const key = `neuchromatic_current_${user.uid}`;
      const session = JSON.parse(localStorage.getItem(key) || "{}");
      session.chatbot = [...newMessages, { role: "assistant", content: closing }];
      localStorage.setItem(key, JSON.stringify(session));

      const sessionsKey = `neuchromatic_sessions_${user.uid}`;
      const sessions = JSON.parse(localStorage.getItem(sessionsKey) || "[]");
      if (sessions.length > 0) {
        sessions[sessions.length - 1].chatbot = session.chatbot;
        localStorage.setItem(sessionsKey, JSON.stringify(sessions));
        // Update Supabase
if (session.dbId) {
  const { updateSession } = await import("@/lib/db");
  await updateSession(session.dbId, {
    chatbot_messages: [...newMessages, { role: "assistant", content: closing }]
  });
}
      }
    } else {
      const reply = await getAIResponse(newMessages, context, questionCount);
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      setQuestionCount(prev => prev + 1);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FDFBF7", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            background: "#EDE9FE", borderRadius: "20px", padding: "6px 16px",
            fontSize: "13px", color: "#7C3AED", fontWeight: "500"
          }}>
            Step 5 of 6 · Question {Math.min(questionCount, 3)} of 3
          </div>
          <button onClick={() => router.push("/journal/psych/color")} style={{
            background: "none", border: "1.5px solid #E5E7EB", borderRadius: "10px",
            padding: "8px 18px", cursor: "pointer", fontSize: "14px", color: "#6B7280", fontFamily: "Inter, sans-serif"
          }}>← Back</button>
        </div>
      </nav>

      {/* Chat Header */}
      <div style={{
        background: "linear-gradient(135deg, #7C3AED, #0D9488)",
        padding: "24px 48px", color: "white"
      }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px"
          }}>🤖</div>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: "700", margin: 0 }}>
              Neu — Your AI Companion
            </h2>
            <p style={{ fontSize: "13px", opacity: 0.85, margin: "4px 0 0" }}>
              Here to help you reflect deeper on your emotions today
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "32px 24px",
        maxWidth: "760px", width: "100%", margin: "0 auto"
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            marginBottom: "20px"
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "linear-gradient(135deg, #7C3AED, #0D9488)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", marginRight: "12px", flexShrink: 0, marginTop: "4px"
              }}>🤖</div>
            )}
            <div style={{
              maxWidth: "75%",
              background: msg.role === "user"
                ? "linear-gradient(135deg, #7C3AED, #0D9488)"
                : "white",
              color: msg.role === "user" ? "white" : "#1C1C2E",
              borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
              padding: "16px 20px",
              fontSize: "15px",
              lineHeight: 1.7,
              boxShadow: msg.role === "user"
                ? "0 4px 16px rgba(124,58,237,0.3)"
                : "0 2px 12px rgba(0,0,0,0.06)"
            }}>
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: "#EDE9FE",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", marginLeft: "12px", flexShrink: 0, marginTop: "4px"
              }}>👤</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "linear-gradient(135deg, #7C3AED, #0D9488)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px"
            }}>🤖</div>
            <div style={{
              background: "white", borderRadius: "20px 20px 20px 4px",
              padding: "16px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
            }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: "#7C3AED",
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
                  }} />
                ))}
                <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.7);opacity:0.5} 40%{transform:scale(1);opacity:1} }`}</style>
              </div>
            </div>
          </div>
        )}

        {done && (
          <div style={{
            textAlign: "center", padding: "32px",
            background: "linear-gradient(135deg, #EDE9FE, #CCFBF1)",
            borderRadius: "20px", marginTop: "20px"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>✨</div>
            <h3 style={{
              fontFamily: "'Playfair Display', serif", fontSize: "22px",
              color: "#1C1C2E", marginBottom: "8px"
            }}>Session complete!</h3>
            <p style={{ color: "#6B7280", marginBottom: "24px" }}>
              You've done something brave today — looking inward.
            </p>
            <button
              onClick={() => router.push("/journal/foryou")}
              className="btn-primary"
              style={{ fontSize: "16px", padding: "14px 32px" }}
            >
              See your personalized recommendations →
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!done && (
        <div style={{
          background: "white", borderTop: "1px solid #F3F4F6",
          padding: "20px 24px", boxShadow: "0 -4px 20px rgba(0,0,0,0.04)"
        }}>
          <div style={{
            maxWidth: "760px", margin: "0 auto",
            display: "flex", gap: "12px", alignItems: "flex-end"
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response... (Enter to send)"
              rows={2}
              className="input-field"
              style={{ flex: 1, resize: "none", fontSize: "15px", lineHeight: 1.6 }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: "48px", height: "48px", borderRadius: "14px", flexShrink: 0,
                background: input.trim() ? "linear-gradient(135deg, #7C3AED, #0D9488)" : "#E5E7EB",
                border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "20px", transition: "all 0.2s"
              }}
            >→</button>
          </div>
        </div>
      )}
    </div>
  );
}