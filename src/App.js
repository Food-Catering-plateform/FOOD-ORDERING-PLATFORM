import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Auth
import Login from "./components/login-and-signup/login";
import SignupRole from "./components/login-and-signup/signup-role";
import SignupCustomer from "./components/login-and-signup/signupCustomer";
import SignupVendor from "./components/login-and-signup/signupVendor";

// Customer Dashboard
import Navbar from "./components/Navbar/Navbar";
import Sidebar from "./components/Sidebar/Sidebar";
import Shops from "./components/Customer/jsFiles/Shops";
import Profile from "./components/Customer/jsFiles/Profile";
import Notifications from "./components/Customer/jsFiles/Notifications";
import Orders from "./components/Customer/jsFiles/Orders";
import Basket from "./components/Customer/jsFiles/Basket";

// Vendor Dashboard
import VendorPage from "./components/Vendor/create";

// Customer Dashboard Layout
const CustomerDashboard = () => {
  const [activePage, setActivePage] = useState("shops");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const renderPage = () => {
    switch (activePage) {
      case "profile": return <Profile />;
      case "notifications": return <Notifications />;
      case "orders": return <Orders />;
      case "basket": return <Basket />;
      default: return <Shops />;
    }
  };

  return (
    <>
      <Navbar setActivePage={setActivePage} />
      <div style={{ display: "flex" }}>
        <Sidebar
          setActivePage={setActivePage}
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
        />
        <main
          className="main-content"
          style={{
            marginLeft: sidebarOpen ? "187px" : "60px",
            transition: "0.3s ease",
            padding: "20px",
            flex: 1,
            background: "#f5f6fa",
            minHeight: "100vh",
          }}
        >
          {renderPage()}
        </main>
      </div>
    </>
  );
};

// Vendor Dashboard Layout
const VendorDashboard = () => {
  return (
    <main>
      <VendorPage />
    </main>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup-role" element={<SignupRole />} />
        <Route path="/signup-customer" element={<SignupCustomer />} />
        <Route path="/signup-vendor" element={<SignupVendor />} />

        {/* Dashboard Routes */}
        <Route path="/student/dashboard" element={<Shops />} />
        <Route path="/vendor/dashboard" element={<VendorDashboard />} />
        <Route path= "/admin/dashboard" element={<h1>AdminDashboard</h1>}
/>      </Routes>
    </BrowserRouter>
  );
};

export default App;