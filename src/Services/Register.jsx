import { useState } from "react"; 
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../Firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";

const Register = (defaultRole) => {
    //each of these states corresponds to the form fields in firestore and gets updated as the user type in the variable values in the form. 
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  
  const handleRegister = async (e) => {
    e.preventDefault(); // this stops the form from refreshing the page when submitted,and lets firebase receive the data
    setError(""); //clears any previous error messages before attempting to register a new user
      const activateRole = role || defaultRole;
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);// sends the email and password to Firebase auth and creates the account , 
      const user = result.user;//from the result firebase gave back, grab the user object which contains the unique user ID(uid) that we will use to store the user data in firestore

      const userData = { // builds an object with the user data to be stored in firestore
        name: name,
        lastName: lastName,
        email: email,
        role: activateRole,
        createdAt: new Date(),
      };
     // only add student number to the user document if the role is stident
      if (activateRole === "student") {
        userData.studentNumber = studentNumber;
      }
      if(activateRole === "vendor"){
        userData.businessName = businessName;
        userData.staffNumber = staffNumber;
      }

      await setDoc(doc(db, "users", user.uid), userData);//find the user's document in the users collection in firestore using the uid and write all their data to it
      
      if (role === "student") {
    navigate("/student/dashboard");
   } else if (role === "vendor") {
      navigate("/vendor/dashboard");
 }// initialize navigation function so that I can redirect after registration

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
    role, setRole,
    businessName, setBusinessName,
    staffNumber, setStaffNumber,
    error,
  };
};

export default Register;