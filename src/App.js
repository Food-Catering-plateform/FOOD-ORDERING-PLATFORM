 import React from 'react'
 import Navbar from './components/Navbar/Navbar'
 import Sidebar from './components/Sidebar/Sidebar'
 import MenuTasks from './components/Vendor/create'
 import VendorPage from './components/Vendor/create'
 import VenSidebar from './components/Vendor/VenSidebar'

 function App(){
  return (
    <main>

      <VendorPage />
      <VenSidebar/>
      <Navbar/>

    </main>
 
  );
}

export default App

