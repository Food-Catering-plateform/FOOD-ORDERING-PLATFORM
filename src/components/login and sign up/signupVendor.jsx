import React, { useState } from "react";
import "./style-signupCustomer.css";
import Register from "../services/Register";

function SignupCustomer() {
  const [studentNumber, setStudentNumber] = useState("");
  const [lastName, setLastName] = useState(""); // I added this so the last name is also captured in React state

  const {
    handleRegister,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    setRole,
    error,
  } = Register();

  const onSubmit = async (e) => {
    e.preventDefault();

    setRole("student"); 
    // I kept this so the customer is marked as a student role

    await handleRegister(e);
    // I kept this to run my teammate's Firebase signup logic
  };

  return (
    <>
      <header>
        <h1>Eats</h1>
      </header>

      <main>
        <section>
          <form id="create-account" onSubmit={onSubmit}>
            <h1>Please fill in your details to create an account</h1>

            <fieldset>
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
                // I added this so the last name is captured from the form
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
                required
              />

              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </fieldset>

            <button type="submit">Create Account</button>
          </form>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <nav>
            <p>
              Already have an account? <a href="/login">Log in</a>
            </p>
          </nav>
        </section>

        <aside className="sider">
          <h2>Join Eats</h2>
          <p>One step away from skipping the queue.</p>
        </aside>
      </main>

      <footer>
        <p>&copy; 2026 Eats</p>
      </footer>
    </>
  );
}

export default SignupCustomer;