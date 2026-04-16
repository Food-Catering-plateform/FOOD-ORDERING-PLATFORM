import React from 'react';
import '../css/Shops.css';

const dummyVendors = [
  {
    id: 1,
    name: "Matrix Grill",
    category: "Fast Food",
    description: "Best burgers on campus.",
    image: "https://via.placeholder.com/150",
    dietaryLabels: ["Halal"]
  },
  {
    id: 2,
    name: "Green Leaf",
    category: "Healthy",
    description: "Salads and wraps.",
    image: "https://via.placeholder.com/150",
    dietaryLabels: ["Vegan", "Gluten-Free"]
  }
];

// 2. Set vendors to default to an empty array [] so .map() doesn't fail, to prevent errors when i npm start.
const Shops = ({ vendors = dummyVendors }) => { 
  return (
    <main className="vendor-container">
      <header>
        <h1>Campus Dining Options</h1>
        <p>Select a vendor to browse their menu.</p>
      </header>

      <section className="vendor-grid">
        {/* The ?. is optional chaining—it prevents a crash if vendors is null */}
        {vendors?.map((vendor) => (
          <article key={vendor.id} className="vendor-card">
            <figure>
              <img src={vendor.image} alt={`${vendor.name} storefront`} />
              <figcaption>{vendor.category}</figcaption>
            </figure>
            
            <h3>{vendor.name}</h3>
            <p>{vendor.description}</p>
            
            <footer>
              {/* Dietary INFO : SA Data requirement  */}
              <small>Available: {vendor.dietaryLabels.join(', ')}</small>
              <button type="button" onClick={() => console.log('View Menu')}>
                View Menu
              </button>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
};

export default Shops;