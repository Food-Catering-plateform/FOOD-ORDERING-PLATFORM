import React, { useState, useRef, useEffect } from 'react';
import './MenuManagement.css';
import { collection, addDoc, updateDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../Firebase/firebaseConfig";
import { useAuth } from "../../Services/AuthContext";

export const DIETARY_OPTIONS = [
  { key: 'halal',       label: 'Halal',       icon: '☪️'   },
  { key: 'vegan',       label: 'Vegan',       icon: '🌱'   },
  { key: 'vegetarian',  label: 'Vegetarian',  icon: '🥦'   },
  { key: 'nut-free',    label: 'Nut-Free',    icon: '🚫🥜' },
  { key: 'gluten-free', label: 'Gluten-Free', icon: '🌾'   },
];

export const ALLERGENS = [
  'Gluten','Dairy','Eggs','Nuts','Peanuts',
  'Soy','Fish','Shellfish','Sesame','Sulphites',
];

export const ALLERGEN_ICONS = {
  'Gluten': '🌾', 'Dairy': '🥛', 'Eggs': '🥚', 'Nuts': '🥜', 'Peanuts': '🥜',
  'Soy': '🫘', 'Fish': '🐟', 'Shellfish': '🦐', 'Sesame': '🌱', 'Sulphites': '🧪'
};

const EMPTY_FORM = {
  name: '', price: '', qty: '', description: '', imageUrl: null, allergens: [], dietary: []
};

function MenuManagement() {
  const { vendorId } = useAuth();
  const [items, setItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [allergenOpen, setAllergenOpen] = useState(false);
  const [dietaryOpen, setDietaryOpen] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState(null);

  const dropdownRef = useRef(null);
  const dietaryRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (!vendorId) return;
    const fetchItems = async () => {
        try {
          const snap = await getDocs(collection(db, "Vendors", vendorId, "menuItems"));
          setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
          console.error('Unable to fetch items', error);
        }
    };
    fetchItems();
  }, [vendorId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setAllergenOpen(false);
      if (dietaryRef.current && !dietaryRef.current.contains(e.target)) setDietaryOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const FIELD_MAP = { foodname: 'name', foodprice: 'price', foodqty: 'qty', fooddesc: 'description' };

  function handleChange(e) {
    const { id, value, files } = e.target;
    if (id === 'foodImage') {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setForm(prev => ({ ...prev, imageUrl: reader.result }));
        reader.readAsDataURL(file);
      }
    } else {
      const key = FIELD_MAP[id.toLowerCase()] || id.replace('food', '').toLowerCase();
      setForm(prev => ({ ...prev, [key]: value }));
    }
  }

  function toggleAllergen(allergen) {
    setForm(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  }

  function toggleDietary(key) {
    setForm(prev => ({
      ...prev,
      dietary: prev.dietary.includes(key)
        ? prev.dietary.filter(k => k !== key)
        : [...prev.dietary, key]
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const data = { ...form, price: parseFloat(form.price), qty: parseInt(form.qty) || 0 };
    try {
      if (editingIndex !== null) {
        const item = items[editingIndex];
        await updateDoc(doc(db, "Vendors", vendorId, "menuItems", item.id), data);
        setItems(prev => {
          const next = [...prev];
          next[editingIndex] = { ...item, ...data };
          return next;
        });
        setEditingIndex(null);
      } else {
        const docRef = await addDoc(collection(db, "Vendors", vendorId, "menuItems"), data);
        setItems(prev => [...prev, { id: docRef.id, ...data }]);
      }
      setForm(EMPTY_FORM);
    } catch (error) {
        console.error("Error saving item:", error);
    }
  }

  function editItem(index) {
    const item = items[index];
    setEditingIndex(index);
    setForm({
      name:        item.name        ?? '',
      price:       item.price       ?? '',
      qty:         item.qty         ?? '',
      description: item.description ?? '',
      imageUrl:    item.imageUrl    ?? null,
      allergens:   Array.isArray(item.allergens) ? item.allergens : [],
      dietary:     Array.isArray(item.dietary)   ? item.dietary   : [],
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function deleteItem(index) {
    if (deletingIndex !== index) {
      setDeletingIndex(index);
      return;
    }
    const item = items[index];
    try {
      await deleteDoc(doc(db, "Vendors", vendorId, "menuItems", item.id));
      setItems(prev => prev.filter((_, i) => i !== index));
      setDeletingIndex(null);
      if (editingIndex === index) {
        setEditingIndex(null);
        setForm(EMPTY_FORM);
      }
    } catch (error) {
      console.error("Unable to delete item", error);
      setDeletingIndex(null);
    }
  }

  if (!vendorId) return <p>Loading...</p>;

  const dietaryLabel = form.dietary.length > 0
    ? form.dietary.map(k => DIETARY_OPTIONS.find(d => d.key === k)?.label || k).join(', ')
    : 'Select dietary info (halal, vegan…)';

  return (
    <section className="page">
      <h1>Menu Management</h1>
      <section className="card" ref={formRef}>
        <h2>{editingIndex !== null ? 'Edit Food Item' : 'Add Food Item'}</h2>
        <form onSubmit={handleSubmit}>
          <input id="foodName"  placeholder="Food name"          value={form.name}        onChange={handleChange} required />
          <input id="foodPrice" placeholder="Price (R)"          value={form.price}       onChange={handleChange} required />
          <input id="foodQty"   placeholder="Quantity available"  value={form.qty}         onChange={handleChange} />
          <textarea id="foodDesc" placeholder="Description"      value={form.description} onChange={handleChange} />
          <input id="foodImage" type="file" accept="image/*"     onChange={handleChange} />

          <div className="allergen-dropdown" ref={dietaryRef}>
            <button type="button" className="allergen-toggle" onClick={() => setDietaryOpen(o => !o)}>
              {dietaryLabel}
              <span className="allergen-arrow">{dietaryOpen ? '▲' : '▼'}</span>
            </button>
            {dietaryOpen && (
              <ul className="allergen-list">
                {DIETARY_OPTIONS.map(({ key, label, icon }) => (
                  <li key={key}>
                    <label>
                      <input type="checkbox" checked={form.dietary.includes(key)} onChange={() => toggleDietary(key)} />
                      {icon} {label}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="allergen-dropdown" ref={dropdownRef}>
            <button type="button" className="allergen-toggle" onClick={() => setAllergenOpen(o => !o)}>
              {form.allergens.length > 0
                ? `⚠️ Contains: ${form.allergens.join(', ')}`
                : 'Select allergens (contains)'}
              <span className="allergen-arrow">{allergenOpen ? '▲' : '▼'}</span>
            </button>
            {allergenOpen && (
              <ul className="allergen-list">
                {ALLERGENS.map(allergen => (
                  <li key={allergen}>
                    <label>
                      <input type="checkbox" checked={form.allergens.includes(allergen)} onChange={() => toggleAllergen(allergen)} />
                      {ALLERGEN_ICONS[allergen]} {allergen}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" id="submitBtn">
            {editingIndex !== null ? 'Save Changes' : 'Add Product'}
          </button>
        </form>
      </section>

      {items.length === 0 ? (
        <p id="emptyMsg">No menu items yet. Add your first item above.</p>
      ) : (
        <ul className="menu-items-list">
          {items.map((item, index) => (
            <li key={item.id} className={editingIndex === index ? 'editing' : ''}>
              <img src={item.imageUrl} alt={item.name} />
              <div className="info">
                <h3>{item.name}</h3>
                <p>R {item.price}</p>
                {item.description ? <p>{item.description}</p> : null}
                {(item.dietary ?? []).length > 0 && (
                  <p className="allergen-tags">
                    {(item.dietary ?? []).map(k => {
                      const d = DIETARY_OPTIONS.find(o => o.key === k);
                      return <span key={k} className="allergen-tag dietary-tag">{d?.icon} {d?.label || k}</span>;
                    })}
                  </p>
                )}
                {(item.allergens ?? []).length > 0 && (
                  <p className="allergen-tags">
                    {(item.allergens ?? []).map(a => (
                      <span key={a} className="allergen-tag">{ALLERGEN_ICONS[a]} {a}</span>
                    ))}
                  </p>
                )}
              </div>
              <button onClick={() => editItem(index)}>Edit</button>
              <button
                className="delete-btn"
                onClick={() => deleteItem(index)}
                onMouseLeave={() => setDeletingIndex(null)}
                style={deletingIndex === index ? { background: '#ff4444', color: 'white' } : {}}
              >
                {deletingIndex === index ? 'Are you sure?' : 'Delete'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MenuManagement;