import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../Firebase/firebaseConfig';
import { auth } from '../../Firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import './VDashboard.css';
import VenHome from './VenHome';
import MenuManagement from './MenuManagement';
import Orders from './Orders';
import Analytics from './Analytics';
import AccSettings from './AccSettings';

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
    getDoc(doc(db, 'stores', uid)).then(snap => {
      if (snap.exists()) setStoreData(snap.data());
    });
  }, [uid]);

  const handleStoreUpdate = async (updatedData) => {
    setStoreData(updatedData);
    await setDoc(doc(db, 'Vendors', uid), updatedData);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':      return <VenHome storeName={storeData?.name} />;
      case 'menu':      return <MenuManagement />;
      case 'orders':    return <Orders />;
      case 'analytics': return <Analytics />;
      case 'settings':  return <AccSettings storeData={storeData} onStoreUpdate={handleStoreUpdate} uid={uid} onLogout={onLogout} />;
      default:          return <VenHome />;
    }
  };

  return (
    <section className="vendor-dashboard">

      <aside className={`vendor-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>

        <header className="vendor-sidebar__header">
          <div className="vendor-sidebar__logo"></div>
          <button
            className="vendor-sidebar__toggle"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <i
              className={`ti ${sidebarOpen ? 'ti-layout-sidebar-left-collapse' : 'ti-layout-sidebar-right-collapse'}`}
              aria-hidden="true"
            />
          </button>
        </header>

        <nav className="vendor-sidebar__nav" aria-label="Vendor navigation">
          <ul>
            {navItems.map(item => (
              <React.Fragment key={item.key}>
                {item.section && (
                  <li aria-hidden="true">
                    <p className="vendor-sidebar__section">{item.section}</p>
                  </li>
                )}
                <li>
                  <button
                    className={`vendor-sidebar__item ${activeSection === item.key ? 'active' : ''}`}
                    onClick={() => setActiveSection(item.key)}
                    aria-current={activeSection === item.key ? 'page' : undefined}
                  >
                    <i className={`ti ${item.icon}`} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                </li>
              </React.Fragment>
            ))}

            {/* MOVED - logout now inside nav list so it is always visible */}
            {/* REMOVED - was a separate button outside nav hidden at very bottom */}
            <li className="vendor-sidebar__logout-item">
              <button
                className="vendor-sidebar__item vendor-sidebar__item--logout"
                onClick={() => signOut(auth).then(onLogout)}
              >
                <i className="ti ti-logout" aria-hidden="true" />
                <span>Logout</span>
              </button>
            </li>

          </ul>
        </nav>

      </aside>

      <main className="vendor-main">
        {renderSection()}
      </main>

    </section>
  );
}

export default VDashboard;