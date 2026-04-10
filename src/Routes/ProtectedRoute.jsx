import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser, role } = useAuth();

  // Not logged in → go to login page
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Wrong role → go back to login page
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/login" />;
  }

  // Correct role → show the page
  return children;
};

export default ProtectedRoute;