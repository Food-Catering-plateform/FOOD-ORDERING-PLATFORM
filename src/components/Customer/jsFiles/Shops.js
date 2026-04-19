import React, { useEffect, useState, useRef } from 'react';
import '../css/Shops.css';
import { db } from "../../../Firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import logo from '../../../Assets/logo2.png'

const Shops = ({ onSelectShop }) => {
  const [vendors, setVendors] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchVendors = async () => {
      const snapshot = await getDocs(collection(db, "Vendors"));

      const vendorList = [];
      snapshot.forEach((doc) => {
        vendorList.push({
          id: doc.id, // 🔥 THIS IS CRITICAL
          name: doc.data().businessName,
          category: doc.data().category,
          description: doc.data().description,
          image: doc.data().imageURL || "https://via.placeholder.com/150",
          dietaryLabels: ["N/A"] // optional for now
        });
      });

      console.log("VENDORS:", vendorList); // 👈 DEBUG
      setVendors(vendorList);
    };

    fetchVendors();
  }, []);

  return (
    <section className="shops-header">
      <header>
        <h1>
        Welcome to
        <img src = {logo} alt ="UniEats logo" className="logo" />
        </h1>
      </header>

      <section>
        <h2> The list of all vendors and their menus</h2>
      </section>

      <section className="scroll-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div className="vendor-grid" ref={scrollRef}>
          {vendors.map((vendor) => (
            <article key={vendor.id} className="vendor-card">
              <img src={vendor.image} alt={vendor.name} />

              <h3>{vendor.name}</h3>
              <p>{vendor.description}</p>

              <button onClick={() => onSelectShop(vendor)}>
                View Menu
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};

export default Shops;