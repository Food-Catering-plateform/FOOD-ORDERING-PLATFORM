import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./style-login.css";
import { useLogin } from "../../Services/Login-backend";

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { handleLogin, handleGoogleLogin, error, loading } = useLogin({
    onLoginSuccess,
  });

  const onSubmit = (e) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  return (
    <article className="login-page">

      {/* HEADER */}
      <header className="login-header">
        <h1>Eats</h1>
      </header>

      {/* MAIN CONTENT */}
      <section className="login-container" aria-labelledby="login-heading">

        {/* LOGIN SECTION */}
        <section className="auth">
          <h2 id="login-heading">Welcome Back</h2>
          <p className="auth-subtitle">Login to your account</p>

          <form onSubmit={onSubmit}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* FORGOT PASSWORD LINK */}
            <div className="forgot-password">
              <a href="#">Forgot password?</a>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          {error && <p className="login-error">{error}</p>}

          {/* DIVIDER */}
          <div className="divider">
            <span>or</span>
          </div>

          {/* GOOGLE BUTTON - fixed with icon and proper text */}
          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {/* Google SVG Icon */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.86l6.08-6.08C34.46 3.39 29.5 1.5 24 1.5 14.82 1.5 7.01 7.1 3.58 15.04l7.1 5.52C12.43 14.48 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.42-4.75H24v9h12.7c-.55 2.98-2.2 5.5-4.68 7.2l7.18 5.58C43.46 37.06 46.5 30.98 46.5 24z"/>
              <path fill="#FBBC05" d="M10.68 28.44A14.6 14.6 0 0 1 9.5 24c0-1.55.27-3.06.74-4.44l-7.1-5.52A22.4 22.4 0 0 0 1.5 24c0 3.61.86 7.02 2.38 10.04l6.8-5.6z"/>
              <path fill="#34A853" d="M24 46.5c5.5 0 10.12-1.82 13.5-4.94l-7.18-5.58c-1.82 1.22-4.14 1.94-6.32 1.94-6.26 0-11.57-4.98-12.32-11.48l-6.8 5.6C7.01 40.9 14.82 46.5 24 46.5z"/>
            </svg>
            Sign in with Google
          </button>

          <nav>
            <p>
              Don't have an account?{" "}
              <Link to="/signup-role">Sign up</Link>
            </p>
          </nav>
        </section>

        {/* RIGHT SIDE PANEL */}
        <aside className="sider" aria-hidden="true"></aside>

      </section>

      {/* FOOTER */}
      <footer className="login-footer">
        <p>&copy; 2026 Eats</p>
      </footer>

    </article>
  );
}

export default Login;