import React, { useState } from 'react';
import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/Sidebar/Sidebar';
import Login from './components/login-and-signup/login';
import Shops from './components/Customer/jsFiles/Shops';
import Profile from './components/Customer/jsFiles/Profile';
import Notifications from './components/Customer/jsFiles/Notifications';
import Orders from './components/Customer/jsFiles/Orders';
import Basket from './components/Customer/jsFiles/Basket';

function App() {
  const [activePage, setActivePage] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'profile': return <Profile />;
      case 'notifications': return <Notifications />;
      case 'orders': return <Orders />;
      case 'basket': return <Basket />;
      case 'shops': return <Shops />;
      case 'login': return <Login />;
      default: return <Login />;
    }
  };

  return (
    <>
      {activePage !== 'login' && <Navbar setActivePage={setActivePage} />}

      <div style={{ display: 'flex' }}>
        {activePage !== 'login' && (
          <Sidebar
            setActivePage={setActivePage}
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
          />
        )}

        <main
          className="main-content"
          style={{
            marginLeft: activePage !== 'login' ? (sidebarOpen ? '187px' : '60px') : '0',
            transition: '0.3s ease',
            padding: '20px',
            flex: 1,
            background: '#f5f6fa',
            minHeight: '100vh'
          }}
        >
          {renderPage()}
        </main>
      </div>
    </>
  );
}

export default App;