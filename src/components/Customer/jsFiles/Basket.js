import React, { useState } from 'react';
import '../css/Basket.css';
const Basket = () => {
  const [items, setItems] = useState([
    'Milk',
    'Bread',
    'Eggs'
  ]);

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <main>
      <section className="page">
        <h1>Basket</h1>

        {items.length === 0 ? (
          <p>Your basket is empty</p>
        ) : (
          <ul>
            {items.map((item, index) => (
              <li key={index}>
                {item}
                <button onClick={() => removeItem(index)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default Basket;