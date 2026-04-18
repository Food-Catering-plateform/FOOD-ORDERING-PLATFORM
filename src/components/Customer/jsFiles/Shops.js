import React, { useEffect, useState, useRef } from 'react';
import '../css/Shops.css';
import { db } from "../../../Firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

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

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="vendor-container">
      <header>
        <h1>Campus Dining Options</h1>
      </header>

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

        <button className="scroll-arrow" onClick={scrollRight}>
          ➔
        </button>
      </section>
    </section>
  );
};

export default Shops;