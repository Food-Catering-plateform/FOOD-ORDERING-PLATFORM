import React from "react";
import { Link } from "react-router-dom";
import "./style-signup.css";
import Register from "../../Services/Register";

function SignupCustomer() {
  const {
    handleRegister,
    name,
    setName,
    lastName,
    setLastName,
    studentNumber,
    setStudentNumber,
    email,
    setEmail,
    password,
    setPassword,
    error,
  } = Register("student");

  return (
    <section className="signup-flow" aria-label="Customer account registration">
      <header>
        <h1>UniEats</h1>
      </header>

      <main className="signup-layout">
        <section
          className="signup-form-section"
          aria-labelledby="customer-signup-form-title"
        >
          <form
            id="create-account"
            onSubmit={(e) => {
              e.preventDefault();
              handleRegister(e, "student");
            }}
          >
            <h2 id="customer-signup-form-title">
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

              <label htmlFor="student-number">Student Number</label>
              <input
                type="text"
                id="student-number"
                name="studentNumber"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
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
        <p>&copy; 2026 UniEats</p>
      </footer>
    </section>
  );
}

export default SignupCustomer;
