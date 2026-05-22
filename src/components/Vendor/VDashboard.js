import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../Firebase/firebaseConfig';
import { auth } from '../../Firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import './VDashboard.css';
import VenHome from './VenHome';
import MenuManagement from './MenuManagement';
import Orders from './Orders';
import Analytics from './Analytics';
import NotificationBell from './NotificationBell';
import AccSettings from './AccSettings';
import { assets } from '../../Assets/assets';

const navItems = [
  { key: 'home',      label: 'Dashboard',       icon: 'ti-home'              },
  { key: 'menu',      label: 'Menu Management', icon: 'ti-tools-kitchen-2'   },
  { key: 'orders',    label: 'Orders',           icon: 'ti-shopping-bag'      },
  { key: 'analytics', label: 'Analytics',        icon: 'ti-chart-bar'         },
  { key: 'settings',  label: 'Account Settings', icon: 'ti-settings'          },
];

function VDashboard({ uid, onLogout }) {
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [storeData, setStoreData]         = useState(null);

  useEffect(() => {
    if (!uid) return;
    //  Fetch from 'Vendors' collection  
    getDoc(doc(db, 'Vendors', uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setStoreData({
          ...data,
          name: data.businessName || data.name
        });
      }
    });
  }, [uid]);

  const handleStoreUpdate = (updatedData) => {
    // Only update local state. 
    // AccSettings.js handles the Firestore write correctly with { merge: true }.
    setStoreData(prev => ({
      ...prev,
      ...updatedData,
      name: updatedData.name || prev.name
    }));
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':      return <VenHome storeName={storeData?.name} setActiveSection={setActiveSection} />;
      case 'menu':      return <MenuManagement />;
      case 'orders':    return <Orders />;
      case 'analytics': return <Analytics />;
      case 'settings':  return <AccSettings storeData={storeData} onStoreUpdate={handleStoreUpdate} uid={uid} onLogout={onLogout} />;
      default:          return <VenHome />;
    }
  };

  return (
    <section className="vendor-dashboard">

      {/* ── Top navbar (mirrors customer Navbar) ── */}
      <header className="vendor-navbar">
        <button
          className="vendor-navbar__toggle"
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            /* X / close icon */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            /* Hamburger icon */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6"  />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        <img src={assets.colourlesslogo} alt="UniEats" className="vendor-navbar__logo" />

        <div className="vendor-navbar__actions">
          <NotificationBell />
        </div>
      </header>

      <div className="vendor-body">
        {/* ── Sidebar ── */}
        <aside className={`vendor-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="vendor-sidebar__nav" aria-label="Vendor navigation">
            <ul>
              {navItems.map(item => (
                <li key={item.key}>
                  <button
                    className={`vendor-sidebar__item ${activeSection === item.key ? 'active' : ''}`}
                    onClick={() => setActiveSection(item.key)}
                  >
                    <i className={`ti ${item.icon}`} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
              <li className="vendor-sidebar__logout-item">
                <button className="vendor-sidebar__item vendor-sidebar__item--logout" onClick={() => signOut(auth).then(onLogout)}>
                  <i className="ti ti-logout" aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="vendor-main">
          {renderSection()}
        </main>
      </div>

    </section>
  );
}

export default VDashboard;