import React, { useRef } from 'react'
import '../css/Shops.css';

const Shops = ({ vendors = [] }) => {
  const scrollRef = useRef(null);

  const scrollRight = () => {
    scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
  };

  return (
    <main className="vendor-container">
      <header>
        <h1>Campus Dining Options</h1>
        <p>Explore multi-vendor menus from across the campus[cite: 40].</p>
      </header>

      <section className="scroll-wrapper">
        {/* Semantic list container */}
        <div className="vendor-grid" ref={scrollRef}>
          {vendors.map((vendor) => (
            <article key={vendor.id} className="vendor-card">
              <figure>
                <img src={vendor.image} alt={`${vendor.name} shop`} />
                <figcaption>{vendor.category}</figcaption>
              </figure>
              <h3>{vendor.name}</h3>
              <footer>
                <small>Dietary: {vendor.dietaryLabels.join(', ')} </small>
                <button type="button">View Menu</button>
              </footer>
            </article>
          ))}
        </div>

        {/* The "Arrow" button to view more */}
        <button 
          className="scroll-arrow" 
          onClick={scrollRight} 
          aria-label="View more shops"
        >
          ➔
        </button>
      </section>
    </main>
  );
};

export default Shops;