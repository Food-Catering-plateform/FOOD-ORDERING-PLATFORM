import React from 'react';
import '../css/Shops.css';

const dummyMenu = [
  { id: 101, name: "Beef Burger", price: 55, dietary: "Halal", description: "Grilled patty with secret sauce." },
  { id: 102, name: "Vegan Wrap", price: 45, dietary: "Vegan", description: "Fresh greens and chickpeas." }
];

const MenuView = ({ menuItems = dummyMenu, shopName = "Matrix Grill" }) => {
  return (
    <section className="menu-container">
      <header>
        <h2>{shopName} Menu</h2>
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
              {/* SA Data/Dietary info  */}
              <small>Tag: {item.dietary}</small>
              <button type="button" onClick={() => console.log('Added to Basket')}>
                Add to Basket
              </button>
            </footer>
          </article>
        ))}
      </section>
      
      <nav>
        <button type="button" className="back-btn">Back to Shops</button>
      </nav>
    </section>
  );
};

export default MenuView;