import React from "react";
import { Link } from "react-router-dom";
import "./style-signup.css";

function SignupRole() {
  return (
    <section className="signup-flow" aria-label="Choose how to register">
      <header>
        <h1>Eats</h1>
      </header>

      <main className="signup-layout">
        <section className="auth-up" aria-labelledby="signup-heading">
          <h2 id="signup-heading">Create an Account</h2>
          <p>Select your role to continue</p>

          <nav aria-label="Registration options">
            <Link to="/signup-customer" className="role-btn">
              Sign up as Customer
            </Link>
            <Link to="/signup-vendor" className="role-btn">
              Sign up as Vendor
            </Link>
          </nav>

          <p>
            Already have an account? <Link to="/">Log in</Link>
          </p>
        </section>

        <aside className="sider" aria-label="About UniEats">
          <h2>Join UniEats</h2>
          <p>Order food or manage your store on campus.</p>
        </aside>
      </main>

      <footer>
        <p>&copy; 2026 UniEats</p>
      </footer>
    </section>
  );
}

export default SignupRole;
