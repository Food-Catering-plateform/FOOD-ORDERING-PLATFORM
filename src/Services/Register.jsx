import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
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
    const activateRole = defaultRole; // comes from hook argument, always reliable

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      const userData = {
        name,
        lastName,
        email,
        role: activateRole,
        createdAt: new Date(),
      };

      if (activateRole === "student") userData.studentNumber = studentNumber;
      if (activateRole === "vendor") {
        userData.businessName = businessName;
        userData.staffNumber = staffNumber;
      }

      await setDoc(doc(db, "users", user.uid), userData);

      navigate("/", { replace: true });

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