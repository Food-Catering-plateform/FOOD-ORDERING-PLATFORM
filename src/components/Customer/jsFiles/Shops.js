import React, { useRef } from 'react';
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

const Shops = ({ vendors = dummyVendors, onSelectShop}) => { 
  // Reference for the scrollable container
  const scrollRef = useRef(null);

  // Function to move the scrollbar to the right
  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="vendor-container">
      <header>
        <h1>Campus Dining Options</h1>
        <p>Select a vendor to browse their menu.</p>
      </header>

      {/* Added a wrapper for the grid and the arrow button */}
      <section className="scroll-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div className="vendor-grid" ref={scrollRef}>
          {vendors?.map((vendor) => (
            <article key={vendor.id} className="vendor-card">
              <figure>
                <img src={vendor.image} alt={`${vendor.name} storefront`} />
                <figcaption>{vendor.category}</figcaption>
              </figure>
              
              <h3>{vendor.name}</h3>
              <p>{vendor.description}</p>
              
              <footer>
                {/* SA Data Integration requirement  */}
                <small>Available: {vendor.dietaryLabels.join(', ')}</small>
                <button type="button" onClick={() => onSelectShop(vendor)}>
                  View Menu
                </button>
              </footer>
            </article>
          ))}
        </div>

        {/* The Arrow Button */}
        <button 
          className="scroll-arrow" 
          onClick={scrollRight}
          type="button"
          aria-label="View more shops"
        >
          ➔
        </button>
      </section>
    </section>
  );
};

export default Shops;