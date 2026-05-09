import React, { useEffect, useState } from 'react';
import '../css/MenuView.css';
import { db } from "../../../Firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

/* ── Standardised dietary / allergen data source ── */
const DIETARY_FLAGS = {
  halal:    { label: 'Halal',     icon: '☪️',  cls: 'diet-pill--halal'    },
  vegan:    { label: 'Vegan',     icon: '🌱',  cls: 'diet-pill--vegan'    },
  vegetarian:{ label: 'Vegetarian',icon: '🥦', cls: 'diet-pill--veggie'   },
  'nut-free':{ label: 'Nut-Free', icon: '🚫🥜',cls: 'diet-pill--nut-free' },
  'gluten-free':{ label: 'Gluten-Free', icon: '🌾', cls: 'diet-pill--gluten' },
};

const ALLERGEN_ICONS = {
  Gluten:    '🌾', Dairy:    '🥛', Eggs:      '🥚',
  Nuts:      '🥜', Peanuts:  '🥜', Soy:       '🫘',
  Fish:      '🐟', Shellfish:'🦐', Sesame:    '🌿',
  Sulphites: '🍷',
};

function DietaryInfo({ item }) {
  const [open, setOpen] = useState(false);

  const hasDietary  = item.dietary  && item.dietary.length  > 0;
  const hasAllergens = item.allergens && item.allergens.length > 0;

  if (!hasDietary && !hasAllergens) return null;

  return (
    <div>
      <button
        type="button"
        className="menu-item__info-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {open ? '▲' : '▼'} Dietary & Allergen Info
      </button>

      {open && (
        <div>
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

const MenuView = ({ shop, onBack, addToBasket }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [addedId, setAddedId]     = useState(null);

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
            {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}

            <div className="menu-item-body">
              <header>
                <h3>{item.name}</h3>
                <data value={item.price}>R{item.price}</data>
              </header>

              {item.description && <p>{item.description}</p>}

              {/* ── Dietary & allergen accordion ── */}
              <DietaryInfo item={item} />
            </div>

            <footer>
              <small>Qty: {item.qty}</small>
              <button
                type="button"
                className={addedId === item.id ? 'added' : ''}
                onClick={() => {
                  addToBasket(item, shop);
                  setAddedId(item.id);
                  setTimeout(() => setAddedId(null), 1000);
                }}
              >
                {addedId === item.id ? '✓ Added!' : 'Add to Basket'}
              </button>
            </footer>
          </article>
        ))}
      </section>

      <nav>
        <button type="button" className="back-btn" onClick={onBack}>
          ← Back to Shops
        </button>
      </nav>
    </section>
  );
};

export default MenuView;