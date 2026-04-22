import { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../Firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";

export const useLogin = (options = {}) => {
  const { onLoginSuccess } = options;
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const redirectByRole = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      setError("Account not found. Please register first.");
      return;
    }

const { role } = userSnap.data();

    // Check vendor approval status — route to the right screen via onLoginSuccess
    // so App.js can show the correct pending/suspended UI rather than a login error.
    if (role === "vendor") {
      const vendorSnap = await getDoc(doc(db, "vendors", user.uid));
      if (vendorSnap.exists()) {
        const vendorStatus = vendorSnap.data().status;
        if (vendorStatus === "suspended") {
          if (onLoginSuccess) { onLoginSuccess("vendor-suspended"); return; }
          setError("Your vendor account has been suspended. Please contact support.");
          return;
        }
        if (vendorStatus !== "approved") {
          if (onLoginSuccess) { onLoginSuccess("vendor-pending"); return; }
          setError("Your vendor account is pending approval. Please wait for an admin to approve your account.");
          return;
        }
      }
    }

    // Check admin approval status
    if (role === "admin") {
      const adminSnap = await getDoc(doc(db, "admins", user.uid));
      if (adminSnap.exists()) {
        const adminStatus = adminSnap.data().status;
        if (adminStatus === "suspended") {
          if (onLoginSuccess) { onLoginSuccess("admin-suspended"); return; }
          setError("Your admin account has been suspended. Please contact support.");
          return;
        }
        if (adminStatus !== "approved") {
          if (onLoginSuccess) { onLoginSuccess("admin-pending"); return; }
          setError("Your admin account is pending approval. Please wait for an existing admin to approve your account.");
          return;
        }
      }
    }

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
    setInfo("");
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
    setInfo("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
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
      } else if (err.code === "auth/unauthorized-domain") {
        setError("Google sign-in is not authorized for this domain yet.");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setError("This email already exists with another sign-in method.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup was blocked by your browser. Allow popups and try again.");
      } else {
        setError("Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (email) => {
    setError("");
    setInfo("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo("Password reset email sent. Please check your inbox.");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No user found with that email.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Failed to send password reset email.");
      }
    }
  };

  return {
    handleLogin,
    handleGoogleLogin,
    handlePasswordReset,
    error,
    info,
    loading,
  };
};
