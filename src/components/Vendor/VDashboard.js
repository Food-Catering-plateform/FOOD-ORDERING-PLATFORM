import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../Firebase/firebaseConfig';
import './VDashboard.css';
import VenHome from './VenHome';
import MenuManagement from './MenuManagement';
import Orders from './Orders';
import Analytics from './Analytics';
import AccSettings from './AccSettings';

const navItems = [
  { key: 'home',      label: 'Dashboard'        },
  { key: 'menu',      label: 'Menu Management'  },
  { key: 'orders',    label: 'Orders'            },
  { key: 'analytics', label: 'Analytics'         },
  { key: 'settings',  label: 'Account Settings'  },
];

function VDashboard({ uid }) {
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [storeData, setStoreData] = useState(null);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'stores', uid)).then(snap => {
      if (snap.exists()) setStoreData(snap.data());
    });
  }, [uid]);

  const handleStoreUpdate = async (updatedData) => {
    setStoreData(updatedData);
    await setDoc(doc(db, 'stores', uid), updatedData);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':      return <VenHome storeName={storeData?.name} />;
      case 'menu':      return <MenuManagement />;
      case 'orders':    return <Orders />;
      case 'analytics': return <Analytics />;
      case 'settings':  return <AccSettings storeData={storeData} onStoreUpdate={handleStoreUpdate} />;
      default:          return <VenHome />;
    }
  };


  return (
    <section className="vendor-dashboard" style={{ position: 'fixed', inset: 0, display: 'flex', zIndex: 200 }}>

      <aside
        className={`vendor-sidebar ${sidebarOpen ? 'open' : 'closed'}`}
        style={{
          backgroundColor: '#1a1a1a',
          width: sidebarOpen ? '210px' : '54px',
          height: '100%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
        }}
      >

        <header className="vendor-sidebar__header">
          {sidebarOpen && <h2 className="vendor-sidebar__title">Vendor Panel</h2>}
          <button
            className="vendor-sidebar__toggle"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <span className="toggle-line" />
            <span className="toggle-line" />
            <span className="toggle-line" />
          </button>
        </header>

        <nav className="vendor-sidebar__nav" aria-label="Vendor navigation">
          <ul>
            {navItems.map(item => (
              <li key={item.key}>
                <button
                  className={`vendor-sidebar__item ${activeSection === item.key ? 'active' : ''}`}
                  onClick={() => setActiveSection(item.key)}
                  aria-current={activeSection === item.key ? 'page' : undefined}
                >
                  {sidebarOpen ? item.label : item.label.charAt(0)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

      </aside>

      <main className={`vendor-main ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {renderSection()}
      </main>

    </section>
  );
}

export default VDashboard;
