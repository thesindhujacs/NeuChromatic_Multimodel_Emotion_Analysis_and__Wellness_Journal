'use client';
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      router.push("/dashboard");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use. Try logging in.");
      } else if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Left Panel */}
      <div style={{
        flex: 1,
        background: "linear-gradient(135deg, #7C3AED 0%, #0D9488 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        color: "white"
      }}>
        <div style={{ maxWidth: "400px", textAlign: "center" }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>🌈</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "42px",
            fontWeight: "700",
            marginBottom: "16px",
            lineHeight: 1.2
          }}>
            Begin your journey
          </h1>
          <p style={{
            fontSize: "18px",
            opacity: 0.9,
            lineHeight: 1.7
          }}>
            Your emotions have color, texture, and depth. Let's explore them together.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        background: "#FDFBF7"
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "32px",
            fontWeight: "700",
            marginBottom: "8px",
            color: "#1C1C2E"
          }}>
            Create account
          </h2>
          <p style={{ color: "#6B7280", marginBottom: "36px", fontSize: "15px" }}>
            Free forever. No credit card needed.
          </p>

          {error && (
            <div style={{
              background: "#FEE2E2",
              color: "#DC2626",
              padding: "14px 18px",
              borderRadius: "12px",
              marginBottom: "20px",
              fontSize: "14px"
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "8px" }}>
                Your name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                required
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "8px" }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-field"
              />
            </div>

            <div>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "8px" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="input-field"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", marginTop: "8px", fontSize: "16px", padding: "15px" }}
            >
              {loading ? "Creating account..." : "Create account →"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "28px", color: "#6B7280", fontSize: "15px" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#7C3AED", fontWeight: "500", textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}