import React, { useEffect, useState } from 'react';
import '../css/MenuView.css';
import { db } from "../../../Firebase/firebaseConfig";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

/* ── Dietary / allergen data ── */
const DIETARY_FLAGS = {
  halal:        { label: 'Halal',        icon: '☪️',   cls: 'diet-pill--halal'    },
  vegan:        { label: 'Vegan',        icon: '🌱',   cls: 'diet-pill--vegan'    },
  vegetarian:   { label: 'Vegetarian',   icon: '🥦',   cls: 'diet-pill--veggie'   },
  'nut-free':   { label: 'Nut-Free',     icon: '🚫🥜', cls: 'diet-pill--nut-free' },
  'gluten-free':{ label: 'Gluten-Free',  icon: '🌾',   cls: 'diet-pill--gluten'   },
};

const ALLERGEN_ICONS = {
  Gluten: '🌾', Dairy: '🥛', Eggs: '🥚',
  Nuts: '🥜', Peanuts: '🥜', Soy: '🫘',
  Fish: '🐟', Shellfish: '🦐', Sesame: '🌿',
  Sulphites: '🍷',
};

/* ── Check if shop is open right now ── */
function checkIsOpen(hours) {
  if (!hours) return false;
  const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long' });
  const todayHours = hours[today];
  if (!todayHours || todayHours.closed) return false;
  const now = new Date();
  const [oh, om] = todayHours.open.split(':').map(Number);
  const [ch, cm] = todayHours.close.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= oh * 60 + om && nowMins <= ch * 60 + cm;
}

/* ── Dietary accordion ── */
function DietaryInfo({ item }) {
  const [open, setOpen] = useState(false);
  const hasDietary   = item.dietary  && item.dietary.length  > 0;
  const hasAllergens = item.allergens && item.allergens.length > 0;
  if (!hasDietary && !hasAllergens) return null;

  return (
    <div className="menu-item__dietary-container">
      <button
        type="button"
        className="menu-item__info-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {open ? '▲' : '▼'} Dietary & Allergen Info
      </button>
      {open && (
        <div className="menu-item__dietary-details">
          {hasDietary && (
            <div className="menu-item__dietary">
              <p className="menu-item__dietary-title">Dietary</p>
              <div className="menu-item__dietary-pills">
                {item.dietary.map(d => {
                  const info = DIETARY_FLAGS[d.toLowerCase()] || { label: d, icon: '✅', cls: 'diet-pill--vegan' };
                  return (
                    <span key={d} className={`diet-pill ${info.cls}`}>
                      {info.icon} {info.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {hasAllergens && (
            <div className="menu-item__allergens">
              <p className="menu-item__allergen-label">⚠️ Contains Allergens</p>
              <div className="menu-item__allergen-pills">
                {item.allergens.map(a => (
                  <span key={a} className="diet-pill diet-pill--allergen">
                    {ALLERGEN_ICONS[a] || '⚠️'} {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main component ── */
const MenuView = ({ shop, onBack, addToBasket }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [addedId,   setAddedId]   = useState(null);
  const [isOpen,    setIsOpen]    = useState(false);
  const [hours,     setHours]     = useState(null);
  const [banner,    setBanner]    = useState(null);

  useEffect(() => {
    if (!shop?.id) return;

    const fetchData = async () => {
      const vendorSnap = await getDoc(doc(db, 'Vendors', shop.id));
      if (vendorSnap.exists()) {
        const data = vendorSnap.data();
        setHours(data.hours || null);
        setIsOpen(checkIsOpen(data.hours));
        setBanner(data.bannerImageUrl || null);
      }

      const menuSnapshot = await getDocs(
        collection(db, 'Vendors', shop.id, 'menuItems')
      );
      const items = [];
      menuSnapshot.forEach(d => items.push({ id: d.id, ...d.data() }));
      setMenuItems(items);
    };

    fetchData();
  }, [shop]);

  const todayLabel = () => {
    if (!hours) return null;
    const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long' });
    const t = hours[today];
    if (!t) return 'No hours listed for today';
    if (t.closed) return `Closed today`;
    return `Today: ${t.open} – ${t.close}`;
  };

  return (
    <main className="menu-container">
      {/* Banner as a simple image on top */}
      {banner && (
        <div className="menu-banner">
          <img src={banner} alt="" className="menu-banner__img" />
        </div>
      )}

      <div className="menu-content">
        <header className="menu-header">
          <h2>{shop?.name || 'Menu'}</h2>
          <div className={`menu-status-banner ${isOpen ? 'menu-status-banner--open' : 'menu-status-banner--closed'}`}>
            <span className="menu-status-banner__dot" />
            <span>{isOpen ? 'Open now' : 'Closed'}</span>
            {todayLabel() && <span className="menu-status-banner__hours"> · {todayLabel()}</span>}
          </div>
          {isOpen && <p className="menu-instruction">Select items to add to your order.</p>}
        </header>

        <section className="menu-list">
          {menuItems.map((item) => {
            // --- NEW: Availability Logic ---
            // Item is available if NOT manually sold out AND (qty is not set OR qty > 0)
            const isAvailable = !item.isSoldOut && (item.qty === undefined || item.qty === '' || parseInt(item.qty) > 0);

            return (
              <article key={item.id} className={`menu-item ${!isAvailable ? 'menu-item--sold-out' : ''}`}>
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="menu-item__img" />}

                <div className="menu-item-body">
                  <header className="menu-item__header">
                    <h3>{item.name}</h3>
                    <data value={item.price} className="menu-item__price">
                      R{parseFloat(item.price || 0).toFixed(2)}
                    </data>
                  </header>
                  {item.description && <p className="menu-item__description">{item.description}</p>}
                  <DietaryInfo item={item} />
                </div>

                <footer className="menu-item__footer">
                  {/* --- NEW: Show Availability Tag instead of Qty --- */}
                  <small className={`menu-item__availability ${isAvailable ? 'available' : 'sold-out'}`} style={{ fontWeight: '700', color: isAvailable ? '#00C896' : '#ef4444' }}>
                    {isAvailable ? '● Available' : '○ Sold Out'}
                  </small>

                  {isOpen ? (
                    <button
                      type="button"
                      disabled={!isAvailable} // --- NEW: Disable button if sold out
                      className={`menu-item__add-btn ${addedId === item.id ? 'added' : ''} ${!isAvailable ? 'disabled' : ''}`}
                      onClick={() => {
                        if (!isAvailable) return;
                        addToBasket(item, shop);
                        setAddedId(item.id);
                        setTimeout(() => setAddedId(null), 1000);
                      }}
                    >
                      {addedId === item.id ? '✓ Added!' : (isAvailable ? 'Add to Basket' : 'Sold Out')}
                    </button>
                  ) : (
                    <button type="button" className="btn-closed" disabled>
                      Shop Closed
                    </button>
                  )}
                </footer>
              </article>
            );
          })}
        </section>

        <nav className="menu-nav">
          <button type="button" className="back-btn" onClick={onBack}>
            ← Back to Shops
          </button>
        </nav>
      </div>
    </main>
  );
};

export default MenuView;
