import React, { useState, useCallback, useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/Sidebar/Sidebar';
import Login from './components/login-and-signup/login';
import Profile from './components/Customer/jsFiles/Profile';
import Notifications from './components/Customer/jsFiles/Notifications';
import Orders from './components/Customer/jsFiles/Orders';
import Basket from './components/Customer/jsFiles/Basket';
import VDashboard from './components/Vendor/VDashboard';
import StoreSetup from './components/Vendor/StoreSetup';
import MenuView from './components/Customer/jsFiles/MenuView';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminVendorManagement from './components/Admin/AdminVendorManagement';
import PaymentSuccess from './components/Customer/jsFiles/PaymentSuccess';
import Payment from './components/Customer/jsFiles/Payment';
import { auth, db } from './Firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Dashboard from './components/Customer/jsFiles/Dashboard';
import { CustomerOrdersProvider } from './Context/CustomerOrdersContext';

function App() {
  const isPaymentSuccess = window.location.search.includes('page=payment-success');

  const [activePage, setActivePage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page) return page;
    return 'login';
  });

  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [vendorUid, setVendorUid]       = useState(null);
  const [checking, setChecking]         = useState(!isPaymentSuccess);
  const [basket, setBasket]             = useState([]);
  const [search, setSearch]             = useState('');

  // ADDED - seenStatus tracks which order notifications have been read
  const [seenStatus, setSeenStatus] = useState({});

  // ADDED - marks a single order notification as read
  const handleMarkRead = useCallback((order) => {
    setSeenStatus(prev => ({ ...prev, [order.id]: true }));
  }, []);

  // ADDED - marks all order notifications as read
  const handleMarkAllRead = useCallback(() => {
    setSeenStatus(prev => {
      const allRead = { ...prev };
      Object.keys(allRead).forEach(id => { allRead[id] = true; });
      return allRead;
    });
  }, []);

  // ADDED - syncs seenStatus when NotificationBell updates it
  const handleSeenStatusChange = useCallback((newStatus) => {
    setSeenStatus(newStatus);
  }, []);

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

  const isAuthScreen =
    activePage === 'login' ||
    activePage === 'logout' ||
    activePage === 'registration-success' ||
    activePage === 'vendor-pending' ||
    activePage === 'admin-pending';

  const useCustomerChrome =
    !isAuthScreen &&
    activePage !== 'vendor-dashboard' &&
    activePage !== 'store-setup' &&
    activePage !== 'admin-dashboard' &&
    activePage !== 'admin-vendor-management' &&
    activePage !== 'payment-success' &&
    activePage !== 'payment';

  const handleLoginSuccess = useCallback(async (roleOrStatus) => {
    if (
      roleOrStatus === 'vendor-pending' ||
      roleOrStatus === 'vendor-suspended' ||
      roleOrStatus === 'admin-pending' ||
      roleOrStatus === 'admin-suspended'
    ) {
      setActivePage(roleOrStatus);
      return;
    }

    if (roleOrStatus === 'admin') {
      setActivePage('admin-dashboard');
    } else if (roleOrStatus === 'vendor') {
      const uid = auth.currentUser.uid;
      setVendorUid(uid);
      setChecking(true);
      const storeSnap = await getDoc(doc(db, 'Vendors', uid));
      setChecking(false);
      setActivePage(storeSnap.exists() ? 'vendor-dashboard' : 'store-setup');
    } else {
      setActivePage('shops');
    }
  }, []);

  useEffect(() => {
    if (isPaymentSuccess) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const { role } = userSnap.data();

          if (role === 'vendor' || (role === 'admin' && userSnap.data().isAdmin)) {
            const targetUid = user.uid;
            const vendorSnap = await getDoc(doc(db, 'Vendors', targetUid));
            if (vendorSnap.exists()) {
              const vd = vendorSnap.data();
              if (vd.status === 'suspended') { setActivePage('vendor-suspended'); setChecking(false); return; }
              if (vd.status !== 'approved' && !vd.storeInitialized) {
                setVendorUid(targetUid);
                setActivePage('store-setup');
                setChecking(false);
                return;
              }
              if (vd.status !== 'approved') { setActivePage('vendor-pending'); setChecking(false); return; }
              setVendorUid(targetUid);
              setActivePage('vendor-dashboard');
              setChecking(false);
              return;
            } else {
              setVendorUid(targetUid);
              setActivePage('store-setup');
              setChecking(false);
              return;
            }
          }

          if (role === 'admin') {
            const adminSnap = await getDoc(doc(db, 'admins', user.uid));
            if (adminSnap.exists()) {
              const as = adminSnap.data().status;
              if (as === 'suspended') { setActivePage('admin-suspended'); setChecking(false); return; }
              if (as !== 'approved')  { setActivePage('admin-pending');   setChecking(false); return; }
            }
          }

          await handleLoginSuccess(role);
        }
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, [handleLoginSuccess, isPaymentSuccess]);

  const pendingScreen = (title, message, titleColor = '#111827', borderColor = '#E5E7EB') => (
    <main style={pendingStyles.page}>
      <section style={{ ...pendingStyles.card, borderColor }}>
        <h1 style={{ ...pendingStyles.title, color: titleColor }}>{title}</h1>
        <p style={pendingStyles.message}>{message}</p>
        <button style={pendingStyles.btn} onClick={() => setActivePage('login')}>
          Back to Login
        </button>
      </section>
    </main>
  );

  const registrationSuccessScreen = () => (
    <main style={pendingStyles.page}>
      <section style={{ ...pendingStyles.card, borderColor: '#86EFAC' }}>
        <div style={pendingStyles.iconWrap}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill="#22C55E" />
            <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 style={{ ...pendingStyles.title, color: '#15803D' }}>Registration Submitted!</h1>
        <p style={pendingStyles.message}>
          Your account has been created and is now <strong>pending review</strong>.
          An admin will approve your account shortly. You will be able to log in
          once your account is approved.
        </p>
        <button style={pendingStyles.btn} onClick={() => setActivePage('login')}>
          Go to Login
        </button>
      </section>
    </main>
  );

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

      // UPDATED - now passes seenStatus and handlers so individual read works
      case 'notifications':
        return (
          <Notifications
            seenStatus={seenStatus}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        );

      case 'orders':
        return <Orders />;
      case 'basket':
        return <Basket basket={basket} setBasket={setBasket} setActivePage={setActivePage} />;
      case 'payment':
        return <Payment setActivePage={setActivePage} setBasket={setBasket} />;
      case 'payment-success':
        return <PaymentSuccess setActivePage={setActivePage} setBasket={setBasket} />;
      case 'shops':
        return (
          <Dashboard
            setActivePage={setActivePage}
            setSelectedShop={setSelectedShop}
            search={search}
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
            onComplete={() => setActivePage('vendor-pending')}
            onCancel={() => setActivePage('login')}
          />
        );
      case 'vendor-dashboard':
        return <VDashboard uid={vendorUid} onLogout={() => setActivePage('login')} setActivePage={setActivePage} />;
      case 'admin-dashboard':
        return <AdminDashboard setActivePage={setActivePage} />;
      case 'admin-vendor-management':
        return <AdminVendorManagement setActivePage={setActivePage} />;
      case 'registration-success':
        return registrationSuccessScreen();
      case 'vendor-pending':
        return pendingScreen(
          'Account Pending Approval',
          'Your vendor account is currently under review. An admin will approve your account shortly. Please check back later.'
        );
      case 'vendor-suspended':
        return pendingScreen(
          'Account Suspended',
          'Your vendor account has been suspended. Please contact support for assistance.',
          '#DC2626', '#FCA5A5'
        );
      case 'admin-pending':
        return pendingScreen(
          'Admin Request Pending',
          'Your admin account request is currently under review. An existing admin will approve your request shortly.'
        );
      case 'admin-suspended':
        return pendingScreen(
          'Admin Account Suspended',
          'Your admin account has been suspended. Please contact support for assistance.',
          '#DC2626', '#FCA5A5'
        );
      case 'login':
      case 'logout':
      default:
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }
  };

  const fullPageScreens = [
    'vendor-dashboard', 'store-setup',
    'admin-dashboard', 'admin-vendor-management',
    'vendor-pending', 'vendor-suspended',
    'admin-pending', 'admin-suspended',
    'registration-success',
    'payment-success',
    'payment',
  ];

  if (fullPageScreens.includes(activePage)) {
    return <>{renderPage()}</>;
  }

  const shell = (
    <>
      {useCustomerChrome && (
        // UPDATED - now passes seenStatus and handlers so bell stays in sync
        <Navbar
          setActivePage={setActivePage}
          search={search}
          setSearch={setSearch}
          activePage={activePage}
          seenStatus={seenStatus}
          onSeenStatusChange={handleSeenStatusChange}
        />
      )}
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
            marginLeft: useCustomerChrome ? (sidebarOpen ? '200px' : '0') : '0',
            transition: 'margin-left 0.3s ease',
            paddingTop: useCustomerChrome ? '80px' : '0',
            padding: isAuthScreen ? '0' : undefined,
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            background: isAuthScreen ? '#f3f4f6' : '#FFF7ED',
            minHeight: '100vh',
          }}
        >
          {renderPage()}
        </main>
      </section>
    </>
  );

  if (useCustomerChrome) {
    return <CustomerOrdersProvider>{shell}</CustomerOrdersProvider>;
  }

  return shell;
}

const pendingStyles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' },
  card: { background: '#fff', border: '1px solid', borderRadius: '12px', padding: '48px 40px', maxWidth: '480px', width: '100%', textAlign: 'center' },
  iconWrap: { display: 'flex', justifyContent: 'center', marginBottom: '20px' },
  title: { fontSize: '24px', fontWeight: '700', margin: '0 0 16px' },
  message: { fontSize: '15px', color: '#6B7280', lineHeight: '1.6', margin: '0 0 24px' },
  btn: { padding: '10px 24px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
};

export default App;