import '../css/Basket.css';
import { useAuth } from '../../../Services/AuthContext';

const Basket = ({ basket, setBasket, setActivePage }) => {
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

  const handleCheckout = () => {
    if (!currentUser || basket.length === 0) return;

    const customerEmail = currentUser.email;
    if (!customerEmail) {
      alert('Your account has no email address. Cannot place order.');
      return;
    }

    localStorage.setItem('pendingPayment', JSON.stringify({
      items:         basket,
      customerId:    currentUser.uid,
      customerEmail: customerEmail,
      customerName:  currentUser.displayName || currentUser.email,
      total:         parseFloat(total.toFixed(2)),
    }));

    setActivePage('payment');
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
              <button className="place-order-btn" onClick={handleCheckout}>
                Checkout
              </button>
            </footer>
          </>
        )}
      </section>
    </main>
  );
};

export default Basket;