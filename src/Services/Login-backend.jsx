import { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../Firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";

/**
 * @param {{ onLoginSuccess?: (role: string) => void }} options
 * When `onLoginSuccess` is set (e.g. from App), email/Google sign-in updates parent state instead of navigating to routes that are not defined.
 */
export const useLogin = (options = {}) => {
  const { onLoginSuccess } = options;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const redirectByRole = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      setError("Account not found. Please register first.");
      return;
    }

    const role = userSnap.data().role;

    if (onLoginSuccess) {
      onLoginSuccess(role);
      return;
    }

    if (role === "student") {
      navigate("/student/dashboard");
    } else if (role === "vendor") {
      
      navigate("/vendor/dashboard");
    } else if (role === "admin") {
      navigate("/admin/dashboard");
    } else {
      setError("Invalid user role.");
    }
  };

  const handleLogin = async (email, password) => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await redirectByRole(result.user);
    } catch (err) {
      console.error("Login error:", err);

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-email"
      ) {
        setError("Invalid email or password.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
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
      if (err.code === "auth/popup-closed-by-user") {
        setError("");
      } else {
        setError("Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    handleLogin,
    handleGoogleLogin,
    error,
    loading,
  };
};
