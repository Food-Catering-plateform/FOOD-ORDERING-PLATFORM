import React from 'react';
import '../css/Basket.css';
import { db } from '../../../Firebase/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../../Services/AuthContext';

const Basket = ({ basket, setBasket }) => {                                                                                                    
  const { currentUser } = useAuth();

  const increaseQty = (id) => {
    setBasket(prev => prev.map(b => b.id === id ? { ...b, qty: b.qty + 1 } : b));
  };

  const decreaseQty = (id) => {
    setBasket(prev =>
      prev
        .map(b => b.id === id ? { ...b, qty: b.qty - 1 } : b)
        .filter(b => b.qty > 0)
    );
  };

  const removeItem = (id) => {
    setBasket(prev => prev.filter(b => b.id !== id));
  };

  const total = basket.reduce((sum, b) => sum + parseFloat(b.price) * b.qty, 0);

  const placeOrder = async () => {
    if (!currentUser || basket.length === 0) return;

    const byVendor = basket.reduce((acc, item) => {
      if (!acc[item.vendorId]) acc[item.vendorId] = { vendorName: item.vendorName, items: [] };
      acc[item.vendorId].items.push(item);
      return acc;
    }, {});

    try {
      for (const [vendorId, { vendorName, items }] of Object.entries(byVendor)) {
        const vendorTotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.qty, 0);

        await addDoc(collection(db, 'Orders'), {
          vendorID:     vendorId,
          vendorName:   vendorName,
          customerId:   currentUser.uid,
          customerName: currentUser.displayName || currentUser.email,
          items:        items.map(i => ({ name: i.name, qty: i.qty, price: parseFloat(i.price) })),
          total:        parseFloat(vendorTotal.toFixed(2)),
          status:       'pending',
          time:         new Date().toLocaleString('en-ZA'),
          createdAt:    new Date().toISOString(),
          notes:        '',
        });
      }

      setBasket([]);
      alert('Order placed successfully!');
    } catch (err) {
      console.error('Failed to place order:', err);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <main>
      <section className="page">
        <h1>Basket</h1>

        {basket.length === 0 ? (
          <p>Your basket is empty</p>
        ) : (
          <>
            <ul className="basket-list">
              {basket.map(item => (
                <li key={item.id} className="basket-item">
                  <section className="basket-item__info">
                    <strong>{item.name}</strong>
                    <small>{item.vendorName}</small>
                    <span>R {(parseFloat(item.price) * item.qty).toFixed(2)}</span>
                  </section>

                  <section className="basket-item__controls">
                    <button onClick={() => decreaseQty(item.id)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => increaseQty(item.id)}>+</button>
                    <button className="remove-btn" onClick={() => removeItem(item.id)}>Remove</button>
                  </section>
                </li>
              ))}
            </ul>

            <footer className="basket-footer">
              <strong>Total: R {total.toFixed(2)}</strong>
              <button className="place-order-btn" onClick={placeOrder}>
                Place Order
              </button>
            </footer>
          </>
        )}
      </section>
    </main>
  );
};

export default Basket;