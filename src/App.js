import React, { useState, useCallback } from 'react';
import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/Sidebar/Sidebar';
import Login from './components/login-and-signup/login';
import Shops from './components/Customer/jsFiles/Shops';
import Profile from './components/Customer/jsFiles/Profile';
import Notifications from './components/Customer/jsFiles/Notifications';
import Orders from './components/Customer/jsFiles/Orders';
import Basket from './components/Customer/jsFiles/Basket';
import VendorPage from './components/Vendor/create';
import MenuView from './components/Customer/jsFiles/MenuView';
import AdminDashboard from './components/Admin/AdminDashboard';

function App() {
  const [activePage, setActivePage] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedShop, setSelectedShop] = useState(null);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const isAuthScreen = activePage === 'login' || activePage === 'logout';
  const useCustomerChrome =
    !isAuthScreen &&
    activePage !== 'vendor-dashboard' &&
    activePage !== 'admin-dashboard';

  const handleLoginSuccess = useCallback((role) => {
    if (role === 'admin') {
      setActivePage('admin-dashboard');
    } else if (role === 'vendor') {
      setActivePage('vendor-dashboard');
    } else {
      // student/customer → shops (customer home)
      setActivePage('shops');
    }
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'profile':
        return <Profile setActivePage={setActivePage} />;
      case 'notifications':
        return <Notifications />;
      case 'orders':
        return <Orders />;
      case 'basket':
        return <Basket />;
      case 'shops':
        return( <Shops 
                onSelectShop={(shop) => {
                setSelectedShop(shop); 
                setActivePage('menu-view'); 
            }}
        />
      );
      case 'menu-view':
        return (
          <MenuView 
            shop={selectedShop} 
            onBack={() => setActivePage('shops')} 
          />
        );
      case 'vendor-dashboard':
        return <VendorPage />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'login':
      case 'logout':
        return <Login onLoginSuccess={handleLoginSuccess} />;
      default:
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <>
      {useCustomerChrome && <Navbar setActivePage={setActivePage} />}

      <section
        className="app-shell"
        aria-label={isAuthScreen ? 'Sign in or register' : 'Main workspace'}
        style={{ display: 'flex' }}
      >
        {useCustomerChrome && (
          <Sidebar
            setActivePage={setActivePage}
            activePage={activePage}
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
          />
        )}

        <main
          className="main-content"
          style={{
            marginLeft: useCustomerChrome ? (sidebarOpen ? '187px' : '60px') : '0',
            transition: '0.3s ease',
            paddingTop: useCustomerChrome ? '80px' : '0',
            padding: isAuthScreen ? '0' : '20px',
            flex: 1,
            background: isAuthScreen ? '#f3f4f6' : '#f5f6fa',
            minHeight: '100vh',
          }}
        >
          {renderPage()}
        </main>
      </section>
    </>
  );
}

export default App;
