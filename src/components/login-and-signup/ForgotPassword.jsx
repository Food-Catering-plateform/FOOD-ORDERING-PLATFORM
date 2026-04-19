import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../Firebase/firebaseConfig";
import "./style-login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Please check your inbox.");
    } catch (err) {
      setError("Failed to send reset email. Check your email address.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="login-page">
      <header className="login-header">
        <h1>UniEats</h1>
      </header>

      <section className="login-container" aria-labelledby="forgot-heading">
        <section className="auth">
          <h2 id="forgot-heading">Forgot Password</h2>
          <p className="auth-subtitle">Enter your email to reset your password</p>

          <form onSubmit={handleReset}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Email"}
            </button>
          </form>

          {message && <p className="login-success">{message}</p>}
          {error && <p className="login-error">{error}</p>}

          <nav>
            <p>
              Remember your password?{" "}
              <Link to="/">Back to Login</Link>
            </p>
          </nav>
        </section>

        <aside className="sider" aria-hidden="true"></aside>
      </section>

      <footer className="login-footer">
        <p>&copy; 2026 Eats</p>
      </footer>
    </article>
  );
}

export default ForgotPassword;