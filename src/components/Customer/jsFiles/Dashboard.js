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
        <div key = {index} > 
          <h3>{item.name}</h3>
          <p>R{item.price}</p>
          <p>{item.vendorName}</p>
        </div>
      ))}

    </section>
   </main>
  );
}

export default Dashboard;