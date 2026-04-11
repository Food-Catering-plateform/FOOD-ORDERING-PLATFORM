import React, { useState } from "react"; //added useState so that what the user types is be stored.
import Register from "../../Services/Register"; //added this to use the signup logic

function SignupCustomer() {
  const [studentNumber, setStudentNumber] = useState(""); // I added this to keep the student number value
  const {
    handleRegister,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    role,
    setRole,
    error,
  } = Register(); // I added this to connect my form to the Firebase/Firestore register logic

  const onSubmit = async (e) => {
    e.preventDefault(); // I added this so the page does not refresh when the form submits
    setRole("student"); // I added this so the customer is saved with the student role
    await handleRegister(e); // I added this to run my teammate's signup function
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
                onChange={(e) => setName(e.target.value)} // I added this so the first name is stored in React state
                required
              />

              <label htmlFor="last-name">Last Name</label>
              <input
                type="text"
                id="last-name"
                name="lastName"
                required
              />

              <label htmlFor="student-number">Student Number</label>
              <input
                type="text"
                id="student-number"
                name="studentNumber"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)} // I added this so I can still capture student number from the form
                required
              />

              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)} // I added this because Firebase signup uses email
                required
              />

              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)} // I added this because Firebase signup uses password
                required
              />
            </fieldset>

            <button type="submit">Create Account</button>
          </form>

          {error && <p style={{ color: "red" }}>{error}</p>}
          {/* I added this to show signup errors coming from Firebase */}

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