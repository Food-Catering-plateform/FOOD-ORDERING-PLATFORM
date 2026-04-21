import React from "react";
import { Link } from "react-router-dom";
import "./style-signup.css";
import Register from "../../Services/Register";

function SignupAdmin() {
  const {
    handleRegister,
    name,
    setName,
    lastName,
    setLastName,
    email,
    setEmail,
    password,
    setPassword,
    adminReason,
    setAdminReason,
    error,
  } = Register("admin");

  return (
    <section className="signup-flow" aria-label="Admin account application">
      <header>
        <h1>Eats</h1>
      </header>

      <main className="signup-layout">
        <section
          className="signup-form-section"
          aria-labelledby="admin-signup-form-title"
        >
          <form
            id="create-account"
            onSubmit={(e) => {
              e.preventDefault();
              handleRegister(e, "admin");
            }}
          >
            <h2 id="admin-signup-form-title">
              Apply for Admin Access
            </h2>
            <p style={{ color: "#6B7280", marginBottom: "16px", fontSize: "14px" }}>
              Admin accounts require approval from an existing administrator.
            </p>

            <fieldset className="signup-fieldset">
              <label htmlFor="first-name">First Name</label>
              <input
                type="text"
                id="first-name"
                name="firstName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <label htmlFor="last-name">Last Name</label>
              <input
                type="text"
                id="last-name"
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />

              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              <label htmlFor="admin-reason">
                Reason for Applying <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <textarea
                id="admin-reason"
                name="adminReason"
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder="Please explain why you are applying for admin access, your role at the institution, and any relevant experience."
                rows={5}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </fieldset>

            {error && (
              <p className="signup-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit">Submit Application</button>
          </form>

          <nav aria-label="Account sign-in">
            <p>
              Already have an account? <Link to="/">Log in</Link>
            </p>
          </nav>
        </section>

        <aside className="sider" aria-label="About admin access">
          <h2>Admin Access</h2>
          <p>Admin accounts are reviewed manually and grant access to platform management tools.</p>
        </aside>
      </main>

      <footer>
        <p>&copy; 2026 Eats</p>
      </footer>
    </section>
  );
}

export default SignupAdmin;