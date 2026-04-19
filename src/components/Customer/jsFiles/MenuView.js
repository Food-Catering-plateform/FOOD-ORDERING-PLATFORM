import React, { useEffect, useState } from 'react';
import '../css/Shops.css';
import { db } from "../../../Firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

const MenuView = ({ shop, onBack, addToBasket }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      if (!shop?.id) return; 

      const menuSnapshot = await getDocs(
        collection(db, "Vendors", shop.id, "menuItems")
      );

      const items = [];
      menuSnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });

      console.log(items); 
      setMenuItems(items);
    };

    fetchMenu();
  }, [shop]);

  return (
    <section className="menu-container">
      <header>
        <h2>{shop?.name || "Menu"} Menu</h2>
        <p>Select items to add to your order.</p>
      </header>

      <section className="menu-list">
        {menuItems.map((item) => (
          <article key={item.id} className="menu-item">
            <header>
              <h3>{item.name}</h3>
              <data value={item.price}>R{item.price}</data>
            </header>

            <p>{item.description}</p>

            <footer>
              <small>Qty: {item.qty}</small>
              {/* flashes "Added!" for 1 second so the student knows the click worked */}
              <button
                type="button"
                onClick={() => {
                  addToBasket(item, shop);
                  setAddedId(item.id);
                  setTimeout(() => setAddedId(null), 1000);
                }}
              >
                {addedId === item.id ? 'Added!' : 'Add to Basket'}
              </button>
            </footer>
          </article>
        ))}
      </section>

      <nav>
        <button type="button" className="back-btn" onClick={onBack}>
          Back to Shops
        </button>
      </nav>
    </section>
  );
};

export default MenuView;