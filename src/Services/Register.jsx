import { useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../Firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";

const useRegister = (defaultRole) => {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    const activateRole = defaultRole;

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      const userData = {
        name,
        lastName,
        email,
        role: activateRole,
        // Students are auto-approved; vendors and admins require manual approval
        status: activateRole === "student" ? "approved" : "pending",
        createdAt: new Date(),
      };

      if (activateRole === "student") userData.studentNumber = studentNumber;
      if (activateRole === "vendor") {
        userData.businessName = businessName;
        userData.staffNumber = staffNumber;
      }

      await setDoc(doc(db, "users", user.uid), userData);

      if (activateRole === "vendor") {
        await setDoc(doc(db, "vendors", user.uid), {
          businessName,
          email,
          staffNumber,
          ownerId: user.uid,
          createdAt: new Date(),
          status: "pending",
        });
      }

      if (activateRole === "admin") {
        await setDoc(doc(db, "admins", user.uid), {
          name,
          lastName,
          email,
          ownerId: user.uid,
          createdAt: new Date(),
          status: "pending",
        });
      }

      // For vendors and admins: sign out immediately after saving their data so
      // the auth state listener in App.js does NOT fire and block them with a
      // "pending" wall before they even see the success screen.
      // They will log in again once approved.
      if (activateRole === "vendor" || activateRole === "admin") {
        await signOut(auth);
        navigate("/registration-success", { replace: true });
      } else {
        // Students are approved instantly — send them to login to sign in normally
        navigate("/", { replace: true });
      }

    } catch (err) {
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("An account with this email already exists. Please log in.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/weak-password":
          setError("Password must be at least 6 characters.");
          break;
        default:
          setError("Something went wrong. Please try again.");
      }
    }
  };

  return {
    handleRegister,
    name, setName,
    lastName, setLastName,
    email, setEmail,
    studentNumber, setStudentNumber,
    password, setPassword,
    businessName, setBusinessName,
    staffNumber, setStaffNumber,
    error,
  };
};

export default useRegister;