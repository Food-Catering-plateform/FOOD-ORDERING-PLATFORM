import React, { useState, useCallback } from 'react';
import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/Sidebar/Sidebar';
import Login from './components/login-and-signup/login';
import Shops from './components/Customer/jsFiles/Shops';
import Profile from './components/Customer/jsFiles/Profile';
import Notifications from './components/Customer/jsFiles/Notifications';
import Orders from './components/Customer/jsFiles/Orders';
import Basket from './components/Customer/jsFiles/Basket';
import VDashboard from './components/Vendor/VDashboard';
import StoreSetup from './components/Vendor/StoreSetup';
import MenuView from './components/Customer/jsFiles/MenuView';
import AdminDashboard from './components/Admin/AdminDashboard';
import { auth, db } from './Firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

function App() {
  const [activePage, setActivePage] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedShop, setSelectedShop] = useState(null);
  const [vendorUid, setVendorUid] = useState(null);
  const [checking, setChecking] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const isAuthScreen = activePage === 'login' || activePage === 'logout';
  const useCustomerChrome =
    !isAuthScreen &&
    activePage !== 'vendor-dashboard' &&
    activePage !== 'store-setup' &&
    activePage !== 'admin-dashboard';

  const handleLoginSuccess = useCallback(async (role) => {
    if (role === 'admin') {
      setActivePage('admin-dashboard');
    } else if (role === 'vendor') {
      const uid = auth.currentUser.uid;
      setVendorUid(uid);
      setChecking(true);
      const storeSnap = await getDoc(doc(db, 'stores', uid));
      setChecking(false);
      setActivePage(storeSnap.exists() ? 'vendor-dashboard' : 'store-setup');
    } else {
      setActivePage('shops');
    }
  }, []);

  const renderPage = () => {
    if (checking) {
      return (
        <p style={{ textAlign: 'center', marginTop: '40vh', fontSize: '1rem', color: '#999' }}>
          Loading...
        </p>
      );
    }

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
      case 'store-setup':
        return <StoreSetup uid={vendorUid} onComplete={() => setActivePage('vendor-dashboard')} />;
      case 'vendor-dashboard':
        return <VDashboard uid={vendorUid} />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      case 'login':
      case 'logout':
        return <Login onLoginSuccess={handleLoginSuccess} />;
      default:
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }
  };

  if (activePage === 'vendor-dashboard' || activePage === 'store-setup' || activePage === 'admin-dashboard') {
    return <>{renderPage()}</>;
  }

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

/*import VDashboard from './components/Vendor/VDashboard';

function App() {
  return <VDashboard />;
}

export default App;*/

