import React, { useState, useCallback, useEffect } from 'react';
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
import AdminVendorManagement from './components/Admin/AdminVendorManagement';
import { auth, db } from './Firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [activePage, setActivePage] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedShop, setSelectedShop] = useState(null);
  const [vendorUid, setVendorUid] = useState(null);
  const [checking, setChecking] = useState(true);
  const [basket, setBasket] = useState([]);

  const addToBasket = (item, shop) => {
    setBasket(prev => {
      const existing = prev.find(b => b.id === item.id);
      if (existing) {
        return prev.map(b => b.id === item.id ? { ...b, qty: b.qty + 1 } : b);
      }
      return [...prev, { ...item, qty: 1, vendorId: shop.id, vendorName: shop.name }];
    });
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const isAuthScreen = activePage === 'login' || activePage === 'logout' || activePage === 'vendor-pending';

  const useCustomerChrome =
    !isAuthScreen &&
    activePage !== 'vendor-dashboard' &&
    activePage !== 'store-setup' &&
    activePage !== 'admin-dashboard' &&
    activePage !== 'admin-vendor-management';

  const handleLoginSuccess = useCallback(async (role) => {
    if (role === 'admin') {
      setActivePage('admin-dashboard');
    } else if (role === 'vendor') {
      const uid = auth.currentUser.uid;
      setVendorUid(uid);
      setChecking(true);

      const vendorSnap = await getDoc(doc(db, 'vendors', uid));

      setChecking(false);

      if (!vendorSnap.exists()) {
        setActivePage('vendor-pending');
        return;
      }

      const status = vendorSnap.data().status;

      if (status === 'suspended') {
        setActivePage('vendor-suspended');
        return;
      }

      // Only explicitly approved vendors can proceed
      if (status !== 'approved') {
        setActivePage('vendor-pending');
        return;
      }

      // Approved — check if store is set up
      const storeSnap = await getDoc(doc(db, 'Vendors', uid));
      setActivePage(storeSnap.exists() ? 'vendor-dashboard' : 'store-setup');

    } else {
      setActivePage('shops');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          await handleLoginSuccess(userSnap.data().role);
        }
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, [handleLoginSuccess]);

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
        return <Basket basket={basket} setBasket={setBasket} />;
      case 'shops':
        return (
          <Shops
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
            addToBasket={addToBasket}
          />
        );
      case 'store-setup':
        return (
          <StoreSetup
            uid={vendorUid}
            onComplete={() => setActivePage('vendor-dashboard')}
            onCancel={() => setActivePage('login')}
          />
        );
      case 'vendor-dashboard':
        return <VDashboard uid={vendorUid} onLogout={() => setActivePage('login')} />;
      case 'admin-dashboard':
        return <AdminDashboard setActivePage={setActivePage} />;
      case 'admin-vendor-management':
        return <AdminVendorManagement setActivePage={setActivePage} />;
      case 'vendor-pending':
        return (
          <main style={pendingStyles.page}>
            <section style={pendingStyles.card}>
              <h1 style={pendingStyles.title}>Account Pending Approval</h1>
              <p style={pendingStyles.message}>
                Your vendor account is currently under review. An admin will approve your account shortly.
              </p>
              <button style={pendingStyles.btn} onClick={() => setActivePage('login')}>
                Back to Login
              </button>
            </section>
          </main>
        );
      case 'vendor-suspended':
        return (
          <main style={pendingStyles.page}>
            <section style={{ ...pendingStyles.card, borderColor: '#FCA5A5' }}>
              <h1 style={{ ...pendingStyles.title, color: '#DC2626' }}>Account Suspended</h1>
              <p style={pendingStyles.message}>
                Your vendor account has been suspended. Please contact support for assistance.
              </p>
              <button style={pendingStyles.btn} onClick={() => setActivePage('login')}>
                Back to Login
              </button>
            </section>
          </main>
        );
      case 'login':
      case 'logout':
        return <Login onLoginSuccess={handleLoginSuccess} />;
      default:
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }
  };

  if (
    activePage === 'vendor-dashboard' ||
    activePage === 'store-setup' ||
    activePage === 'admin-dashboard' ||
    activePage === 'admin-vendor-management' ||
    activePage === 'vendor-pending' ||
    activePage === 'vendor-suspended'
  ) {
    return <>{renderPage()}</>;
  }

  return (
    <>
      {useCustomerChrome && <Navbar setActivePage={setActivePage} />}
      <section className="app-shell" style={{ display: 'flex' }}>
        {useCustomerChrome && (
          <Sidebar
            setActivePage={setActivePage}
            activePage={activePage}
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
          />
        )}
        <main
          style={{
            marginLeft: useCustomerChrome ? (sidebarOpen ? '187px' : '60px') : '0',
            transition: '0.3s ease',
            paddingTop: useCustomerChrome ? '80px' : '0',
            padding: isAuthScreen ? '0' : '20px',
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            background: isAuthScreen ? '#f3f4f6' : '#e6f2ff',
            minHeight: '100vh',
          }}
        >
          {renderPage()}
        </main>
      </section>
    </>
  );
}

const pendingStyles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F9FAFB',
  },
  card: {
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '48px 40px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 16px',
  },
  message: {
    fontSize: '15px',
    color: '#6B7280',
    lineHeight: '1.6',
    margin: '0 0 24px',
  },
  btn: {
    padding: '10px 24px',
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
};

export default App;


