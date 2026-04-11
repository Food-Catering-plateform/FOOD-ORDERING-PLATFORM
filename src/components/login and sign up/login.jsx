import React from "react";
import "./style-login.css";

function Login() {
  return (
    <>
      <header>
        <h1>Eats</h1>
      </header>

      <main>
        <section className="auth">
          <h2 id="login-heading">Login</h2>

          <form id="loginForm" method="post">
            <label htmlFor="email-address">Email</label>
            <input
              type="text"
              id="email-address"
              name="email-address"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
            />

            <button type="submit">Login</button>
          </form>

          <nav>
            <p>
              Don't have an account? <a href="/signup-role">Sign up</a>
            </p>
          </nav>
        </section>

        <aside className="sider"></aside>
      </main>

      <footer>
        <p>&copy; 2026 Eats</p>
      </footer>
    </>
  );
}

export default Login;