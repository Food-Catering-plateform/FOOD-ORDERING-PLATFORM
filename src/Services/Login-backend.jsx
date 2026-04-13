import { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../Firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {it 
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Redirect user based on role
  const redirectByRole = async (user) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError("Account not found. Please register first.");
        return;
      }

      const role = userSnap.data().role;

      if (role === "student") {
        navigate("/student/dashboard");
      } else if (role === "vendor") {
        navigate("/vendor/dashboard");
      } else if (role === "admin") {
        navigate("/admin/dashboard");
      } else {
        setError("Invalid user role.");
      }
    } catch (err) {
      console.error("Role fetch error:", err);
      setError("Failed to fetch user role.");
    }
  };

  //  Email/Password Login
  const handleLogin = async (email, password) => {
    setError("");

    try {
      const result = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      await redirectByRole(result.user);
    } catch (err) {
      console.error("Login error:", err);

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setError("Invalid email or password.");
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  //  Google Login
  const handleGoogleLogin = async () => {
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError("No account found. Please register first.");
        return;
      }

      await redirectByRole(result.user);
    } catch (err) {
      console.error("Google login error:", err);
      setError("Google sign-in failed.");
    }
  };

  return {
    handleLogin,
    handleGoogleLogin,
    error
  };
};