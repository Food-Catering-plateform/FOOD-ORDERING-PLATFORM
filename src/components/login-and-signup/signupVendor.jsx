import React from "react";
import { Link } from "react-router-dom";
import "./style-signup.css";
import Register from "../../Services/Register";

function SignupVendor() {
  const {
    handleRegister,
    name,
    setName,
    lastName,
    setLastName,
    staffNumber,
    setStaffNumber,
    businessName,
    setBusinessName,
    email,
    setEmail,
    password,
    setPassword,
    error,
  } = Register("vendor");

  return (
    <section className="signup-flow" aria-label="Vendor account registration">
      <header>
        <h1>Eats</h1>
      </header>

      <main className="signup-layout">
        <section
          className="signup-form-section"
          aria-labelledby="vendor-signup-form-title"
        >
          <form
            id="create-account"
            onSubmit={(e) => {
              e.preventDefault();
              handleRegister(e, "vendor");
            }}
          >
            <h2 id="vendor-signup-form-title">
              Please fill in your details to create an account
            </h2>

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

              <label htmlFor="staff-number">Staff Number</label>
              <input
                type="text"
                id="staff-number"
                name="staffNumber"
                value={staffNumber}
                onChange={(e) => setStaffNumber(e.target.value)}
                required
              />

              <label htmlFor="business-name">Business Name</label>
              <input
                type="text"
                id="business-name"
                name="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
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
            </fieldset>

            {error && (
              <p className="signup-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit">Create Account</button>
          </form>

          <nav aria-label="Account sign-in">
            <p>
              Already have an account? <Link to="/">Log in</Link>
            </p>
          </nav>
        </section>

        <aside className="sider" aria-label="Why join Eats">
          <h2>Join Eats</h2>
          <p>One step away from skipping the queue.</p>
        </aside>
      </main>

      <footer>
        <p>&copy; 2026 Eats</p>
      </footer>
    </section>
  );
}

export default SignupVendor;
