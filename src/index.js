import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SignupRole from './components/login-and-signup/signup-role';
import SignupCustomer from './components/login-and-signup/signupCustomer';
import SignupVendor from './components/login-and-signup/signupVendor';
import { AuthProvider } from './Services/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signup-role" element={<SignupRole />} />
          <Route path="/signup-customer" element={<SignupCustomer />} />
          <Route path="/signup-vendor" element={<SignupVendor />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();