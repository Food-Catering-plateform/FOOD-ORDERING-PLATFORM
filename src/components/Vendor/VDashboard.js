import React, { useState } from 'react';
import './VDashboard.css';
import VenHome from './VenHome';
import MenuManagement from './MenuManagement';
import Orders from './Orders';
import Analytics from './Analytics';
import AccSettings from './AccSettings';
// import StoreSetup from './StoreSetup';

const navItems = [
  { key: 'home',      label: 'Dashboard'        },
  { key: 'menu',      label: 'Menu Management'  },
  { key: 'orders',    label: 'Orders'            },
  { key: 'analytics', label: 'Analytics'         },
  { key: 'settings',  label: 'Account Settings'  },
];

function VDashboard() {
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [storeCreated, setStoreCreated] = useState(false);
  const [storeData, setStoreData] = useState(null);

  const renderSection = () => {
    switch (activeSection) {
      case 'home':      return <VenHome storeName={storeData?.name} />;
      case 'menu':      return <MenuManagement />;
      case 'orders':    return <Orders />;
      case 'analytics': return <Analytics />;
      case 'settings':  return <AccSettings storeData={storeData} onStoreUpdate={setStoreData} />;
      default:          return <VenHome />;
    }
  };


  return (
    <section className="vendor-dashboard">

      <aside className={`vendor-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>

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
