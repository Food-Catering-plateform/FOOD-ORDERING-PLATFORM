import React, { useState } from "react";
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
    <>
      <header>
        <h1>Eats</h1>
      </header>

      <main>
        <section>

          <form id="create-account" 
          onSubmit={(e) =>{
            e.preventDefault(); //I kept preventDefault here so page does not refresh
            handleRegister(e, "vendor");//It pass the role directly to Register instead of relying on setRole
          }}>
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
                //added this so the last name is captured from the form
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

export default SignupVendor;