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
          <h2 id="login-heading">Login</h2>

          <form onSubmit={onSubmit}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          {error && <p className="login-error">{error}</p>}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            Sign in with Google
          </button>

          <nav>
            <p>
              Don’t have an account?{" "}
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