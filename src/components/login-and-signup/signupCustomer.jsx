import React from "react";
import Register from "../../Services/Register"; //added this to use the signup logic

function SignupCustomer() {
  const {
    handleRegister,
    name,
    setName,// I added these because Register now also stores last name and student number in Firebase/Firestore
    lastName,
    setLastName,
    studentNumber,
    setStudentNumber,
    email,
    setEmail,
    password,
    setPassword,
    role,
    setRole,
    error,
  } = Register(); // I added this to connect my form to the Firebase/Firestore register logic

  return (
    <>
      <header>
        <h1>Eats</h1>
      </header>

      <main>
        <section>
          <form id="create-account" 
          onSubmit={(e) =>{
            e.preventDefault(); //I kept preventDefault here so page does not refresh
              setRole("student");  //I moved role setting here before calling register
              handleRegister(e);  //I now directly call the backend signup logic
          }}>
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
                value={lastName}// I added this so the last name typed by the user is also captured and sent to Register for storage
                onChange={(e) => setLastName(e.target.value)}
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