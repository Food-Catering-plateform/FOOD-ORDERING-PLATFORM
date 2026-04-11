import React from "react";
import "./style-signup-role.css";

function SignupRole() {
  return (
    <>
      <header>
        <h1>Eats</h1>
      </header>

      <main>
        <section className="auth-up">
          <h2 id="signup-heading">Create an Account</h2>
          <p>Select your role to continue</p>

          <nav>
            <a href="/signup-customer" className="role-btn">
              Sign up as Customer
            </a>

            <a href="/signup-vendor" className="role-btn">
              Sign up as Vendor
            </a>
          </nav>

          <p>
            Already have an account? <a href="/login">Log in</a>
          </p>
        </section>

        <aside className="sider">
          <h2>Join EaziEats</h2>
          <p>Order food or manage your store on campus.</p>
        </aside>
      </main>

      <footer>
        <p>&copy; 2026 EaziEats</p>
      </footer>
    </>
  );
}

export default SignupRole;