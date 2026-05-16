import React, { useEffect, useState } from 'react';
import { db } from "../../../Firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import '../css/dashboard.css';

const CATEGORY_COLORS = {
  'Traditional':       { icon: '🍲' },
  'Halal':             { icon: '☪️'  },
  'Fast Food':         { icon: '🍔' },
  'Desserts & Drinks': { icon: '🍰' },
  'Grills & Braai':    { icon: '🔥' },
  'Other':             { icon: '🍽️' },
};

const FILTERS = [
  'All', 'Traditional', 'Halal', 'Fast Food',
  'Desserts & Drinks', 'Grills & Braai', 'Other',
];

const categoryClass = (cat) =>
  (cat || 'other').toLowerCase().replace(/[^a-z]/g, '-');

export default function Dashboard({ setActivePage, setSelectedShop, search = '' }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('All');

  useEffect(() => {
    const fetchVendors = async () => {
      const snap = await getDocs(collection(db, 'Vendors'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(v => v.status === 'approved' && v.businessName);
      setVendors(list);
      setLoading(false);
    };
    fetchVendors();
  }, []);

  const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long' });

  const isOpenNow = (vendor) => {
    if (!vendor.hours) return false;
    const todayHours = vendor.hours[today];
    if (!todayHours || todayHours.closed) return false;
    const now = new Date();
    const [oh, om] = todayHours.open.split(':').map(Number);
    const [ch, cm] = todayHours.close.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= oh * 60 + om && nowMins <= ch * 60 + cm;
  };

  const filtered = vendors.filter(v => {
    const matchSearch =
      v.businessName.toLowerCase().includes(search.toLowerCase()) ||
      (v.description || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || v.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="db-page">

      {/* ── Category filter pills ── */}
      <nav className="db-filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`db-pill${filter === f ? ' db-pill--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f !== 'All' && (CATEGORY_COLORS[f]?.icon + ' ')}{f}
          </button>
        ))}
      </nav>

      {/* ── Stats bar ── */}
      <div className="db-stats">
        <span className="db-stats__text">
          <strong>{filtered.length}</strong> {filtered.length === 1 ? 'shop' : 'shops'} available
        </span>
        <span className="db-stats__dot" />
        <span className="db-stats__text">
          <strong>{filtered.filter(isOpenNow).length}</strong> open now
        </span>
      </div>

      {/* ── Vendor grid ── */}
      <main className="db-grid">

        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="db-skeleton" />
        ))}

        {!loading && filtered.length === 0 && (
          <div className="db-empty">
            <p className="db-empty__icon">🍽️</p>
            <p className="db-empty__title">No shops found</p>
            <p className="db-empty__hint">Try a different search or category</p>
          </div>
        )}

        {!loading && filtered.map(vendor => {
          const open   = isOpenNow(vendor);
          const catCls = categoryClass(vendor.category);
          const catIcon = CATEGORY_COLORS[vendor.category]?.icon || '🍽️';

          return (
            <article
              key={vendor.id}
              className={`db-card db-card--${catCls}`}
              onClick={() => {
                setSelectedShop({ id: vendor.id, name: vendor.businessName });
                setActivePage('menu-view');
              }}
            >
              <div className="db-card__img-wrap">
                {vendor.imageUrl || vendor.logoUrl ? (
                  <img
                    src={vendor.imageUrl || vendor.logoUrl}
                    alt={vendor.businessName}
                    className="db-card__img"
                  />
                ) : (
                  <span className="db-card__emoji">{catIcon}</span>
                )}
                <span className={`db-card__badge db-card__badge--${open ? 'open' : 'closed'}`}>
                  {open ? '● Open' : '○ Closed'}
                </span>
                {vendor.category && (
                  <span className="db-card__cat-tag">{vendor.category}</span>
                )}
              </div>

              <div className="db-card__body">
                <h3 className="db-card__title">{vendor.businessName}</h3>
                {vendor.description && (
                  <p className="db-card__desc">{vendor.description}</p>
                )}
                {vendor.address && (
                  <p className="db-card__address">📍 {vendor.address}</p>
                )}
              </div>

              <div className="db-card__footer">
                <span className="db-card__view-btn">View Menu →</span>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
}