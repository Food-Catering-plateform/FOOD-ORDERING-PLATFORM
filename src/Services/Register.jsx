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
  const [adminReason, setAdminReason] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    const activateRole = defaultRole;

    // Validate before creating the Firebase auth account
    if (activateRole === "admin" && !adminReason.trim()) {
      setError("Please provide a reason for applying for admin access.");
      return;
    }

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
          storeInitialized: false,
        });
      }

      if (activateRole === "admin") {
        await setDoc(doc(db, "admins", user.uid), {
          name,
          lastName,
          email,
          reason: adminReason,
          ownerId: user.uid,
          createdAt: new Date(),
          status: "pending",
        });
      }

      // Vendors: stay signed in — App.js will detect storeInitialized:false
      // and send them straight to StoreSetup. Only after they submit the store
      // will they be signed out and shown the pending screen.
      if (activateRole === "vendor") {
        navigate("/", { replace: true });
      } else if (activateRole === "admin") {
        // Admins: sign out immediately, nothing more to fill in
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
    adminReason, setAdminReason,
    error,
  };
};

export default useRegister;