import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// I fixed the paths to match folder structure
import Login from "./components/login-and-signup/login";
import SignupRole from "./components/login-and-signup/signup-role";
import SignupCustomer from "./components/login-and-signup/signupCustomer";
import SignupVendor from "./components/login-and-signup/signupVendor";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup-role" element={<SignupRole />} />
        <Route path="/signup-customer" element={<SignupCustomer />} />
        <Route path="/signup-vendor" element={<SignupVendor />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;