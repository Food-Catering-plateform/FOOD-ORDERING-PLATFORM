import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// I fixed the paths to match folder structure
import Login from "./components/Login/Login";
import SignupRole from "./components/SignupRole/SignupRole";
import SignupCustomer from "./components/SignupCustomer/SignupCustomer";
import SignupVendor from "./components/SignupVendor/SignupVendor";

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