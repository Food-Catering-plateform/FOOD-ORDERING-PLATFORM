import React, { useState } from "react";
import "./style-login.css";
import { useLogin } from "../services/Login";

function Login() {

  // useState to store user input (email & password)
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");

  //Import functions from login logic
  const { handleLogin, handleGoogleLogin, error } = useLogin();

  //This runs when form is submitted
  const onSubmit = (e) => {
    e.preventDefault(); 
    // prevents page refresh (React standard)

    handleLogin(email, password); 
    // calls backend logic (Firebase login)
  };

  return (
    <>
      <header>
        <h1>Eats</h1>
      </header>

      <main>
        <section className="auth">
          <h2 id="login-heading">Login</h2>

          {/*attach onSubmit to form */}
          <form id="loginForm" onSubmit={onSubmit}>

            <label htmlFor="email-address">Email</label>
            <input
              type="text"
              id="email-address"
              name="email"
              value={email} 
              //controlled input (React way)

              onChange={(e) => setEmail(e.target.value)} 
              //updates state when user types

              required
            />

            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password} 
              //controlled input

              onChange={(e) => setPassword(e.target.value)} 
              //updates password state

              required
            />

            <button type="submit">Login</button>
          </form>

          /* 🔹 Show error from Firebase login */
          {error && <p style={{ color: "red" }}>{error}</p>}

          /* 🔹 Google login button */
          <button type="button" onClick={handleGoogleLogin}>
            Sign in with Google
          </button>

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