import { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../Firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const redirectByRole = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName || "Student",
        email: user.email,
        role: "student",
        createdAt: new Date()
      });
      navigate("/student/dashboard");
    } else {
      const role = userSnap.data().role;
      if (role === "student") navigate("/student/dashboard");
      if (role === "vendor")  navigate("/vendor/dashboard");
      if (role === "admin")   navigate("/admin/dashboard");
    }
  };

  const handleLogin = async (email, password) => {
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await redirectByRole(result.user);
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await redirectByRole(result.user);
    } catch (err) {
      setError("Google sign-in failed");
    }
  };

  return { handleLogin, handleGoogleLogin, error };
};