import React from "react";
import "./style-signupVendor.css";

function SignupVendor() {
  return (
    <>
      <header>
        <h1>Eats</h1>
      </header>

      <main>
        <section>
          <form method="POST" id="create-vendor-account">
            <h2>Create your vendor account</h2>

            <fieldset>
              <label htmlFor="business-name">Business Name</label>
              <input
                type="text"
                id="business-name"
                name="businessName"
                required
              />

              <label htmlFor="owner-name">Owner Full Name</label>
              <input
                type="text"
                id="owner-name"
                name="ownerName"
                required
              />

              <label htmlFor="student-or-staff-number">Student or Staff Number</label>
              <input
                type="text"
                id="student-or-staff-number"
                name="studentOrStaffNumber"
                required
              />

              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                required
              />

              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                required
              />

              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                type="password"
                id="confirm-password"
                name="confirmPassword"
                required
              />
            </fieldset>

            <button type="submit">Create Account</button>
          </form>

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