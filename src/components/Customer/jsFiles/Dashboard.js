import React , { useEffect, useState} from 'react';
import {db} from "../../../Firebase/firebaseConfig";
import {collection, getDocs} from "firebase/firestore";

function Dashboard() {
  const [menu, setMenu] = useState([]);

  useEffect(() =>{
    const fetchMenu = async () => {
      const VendorSnapshot = await getDocs(collection(db, "Vendors"));
      const allMenuItems = [];

      for (const vendorDoc of VendorSnapshot.docs){
        const vendorId = vendorDoc.id;

        const menuSnapshot = await getDocs(
          collection (db, "Vendors", vendorId, "menu")
        );

        menuSnapshot.forEach((doc) => {
          allMenuItems.push({
            ...doc.data(),
            vendorId : vendorId,
            vendorName: vendorDoc.data().businessName
          });
        });
      }
      setMenu(allMenuItems);
    };
    fetchMenu();
  }, []);

  return (
   <main>
    <section>
      <h1>Welcome to <b>UniEats</b></h1>
      <p>This is your main overview page.</p>
    </section>

    <section>
      {menu.map((item,index) =>(
        <div key = {index} className = "vendor-card"> 
          <h3 className = "business-name"> {item.businessName} </h3>

          <img
            src = {item.imageUrl || "https://via.placeholder.com/150"}
            alt = {item.businessName}
            className = "vendor-image" />

          <p className = "vendor-description"> {item.description} </p>
        
        </div>
      ))}

    </section>
   </main>
  );
}

export default Dashboard;