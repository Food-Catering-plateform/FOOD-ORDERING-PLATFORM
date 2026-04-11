import React from "react";
import "./style-signupCustomer.css"

function SignupCustomer() {

    return(
        <>
        <header>
            <h1>Eats</h1>
        </header>

        <main>
            <section>
            <form action="" method="POST" id="create-account">
                <h1>Please fill in your details to create an account</h1>
                <fieldset>
                    <label htmlFor="first-name">First Name</label>
                    <input
                        type="text"
                        id="first-name"
                        name="first-name"
                        required
                    />
                    
                    <label htmlFor="last-name">Last Name</label>
                    <input
                        type="text"
                        id="last-name"
                        name="last-name"
                        required
                    />

                    <label htmlFor="student-number">Student Number</label>
                    <input
                        type="text"
                        id="student-number"
                        name="studentNumber"
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
                </fieldset>

                <button type="submit">Create Account</button>
            </form>

            <nav>
                <p>
                    Don't have an account? Sign up <a href="/signup-role">Login up</a>
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
    )

}
export default SignupCustomer;