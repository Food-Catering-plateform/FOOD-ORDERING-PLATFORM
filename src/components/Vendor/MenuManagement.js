import React, { useState, useRef, useEffect } from 'react';
import './MenuManagement.css';
import { collection, addDoc, updateDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../Firebase/firebaseConfig";
import { useAuth } from "../../Services/AuthContext";

const ALLERGENS = [
  'Gluten', 'Dairy', 'Eggs', 'Nuts', 'Peanuts',
  'Soy', 'Fish', 'Shellfish', 'Sesame', 'Sulphites'
];

function MenuManagement() {
  const { vendorId } = useAuth();

  const [items, setItems]               = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [allergenOpen, setAllergenOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', price: '', qty: '', description: '', imageUrl: null, allergens: []
  });

  const formRef     = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAllergenOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(e) {
    const { id, value, files } = e.target;

    if (id === 'foodImage') {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => setForm(f => ({ ...f, imageUrl: reader.result }));
        reader.readAsDataURL(file);
      }
    } else {
      const key = {
        foodName:  'name',
        foodPrice: 'price',
        foodQty:   'qty',
        foodDesc:  'description'
      }[id];
      setForm(f => ({ ...f, [key]: value }));
    }
  }

  function toggleAllergen(allergen) {
    setForm(f => ({
      ...f,
      allergens: f.allergens.includes(allergen)
        ? f.allergens.filter(a => a !== allergen)
        : [...f.allergens, allergen]
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!vendorId) return;

    const menuCollectionRef = collection(db, "Vendors", vendorId, "menuItems");

    const imageUrl = form.imageUrl || (
      editingIndex !== null
        ? items[editingIndex].imageUrl
        : 'https://placehold.co/60x60/1e1e1e/c04040?text=Food'
    );

    const newItem = {
      name:        form.name.trim(),
      price:       parseFloat(form.price).toFixed(2),
      qty:         form.qty,
      description: form.description.trim(),
      imageUrl,
      allergens:   form.allergens
    };

    try {
      if (editingIndex !== null) {
        const itemToEdit = items[editingIndex];
        await updateDoc(
          doc(db, "Vendors", vendorId, "menuItems", itemToEdit.id),
          newItem
        );
        setItems(prev =>
          prev.map((item, i) =>
            i === editingIndex ? { ...newItem, id: itemToEdit.id } : item
          )
        );
        setEditingIndex(null);
      } else {
        const docRef = await addDoc(menuCollectionRef, newItem);
        setItems(prev => [...prev, { ...newItem, id: docRef.id }]);
      }

      setForm({ name: '', price: '', qty: '', description: '', imageUrl: null, allergens: [] });

    } catch (error) {
      console.error("Error saving item:", error);
    }
  }

  useEffect(() => {
    if (!vendorId) return;
    const fetchItems = async () => {
      try {
        const menuCollectionRef = collection(db, "Vendors", vendorId, "menuItems");
        const data = await getDocs(menuCollectionRef);
        setItems(data.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Unable to fetch items", error);
      }
    };
    fetchItems();
  }, [vendorId]);

  function editItem(index) {
    const item = items[index];
    setEditingIndex(index);
    setForm({
      name:        item.name,
      price:       item.price,
      qty:         item.qty,
      description: item.description,
      imageUrl:    item.imageUrl,
      allergens:   item.allergens || []
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function deleteItem(index) {
    const item = items[index];
    try {
      await deleteDoc(doc(db, "Vendors", vendorId, "menuItems", item.id));
      setItems(prev => prev.filter((_, i) => i !== index));
      if (editingIndex === index) {
        setEditingIndex(null);
        setForm({ name: '', price: '', qty: '', description: '', imageUrl: null, allergens: [] });
      }
    } catch (error) {
      console.error("Unable to delete item", error);
    }
  }

  if (!vendorId) return <p>Loading...</p>;

  return (
    <section className="page">
      <h1>Menu Management</h1>

      {/* ── Add / Edit form ── */}
      <section className="card" ref={formRef}>
        <h2>{editingIndex !== null ? 'Edit Food Item' : 'Add Food Item'}</h2>

        <form onSubmit={handleSubmit}>
          <input
            id="foodName"
            placeholder="Food name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            id="foodPrice"
            placeholder="Price (R)"
            value={form.price}
            onChange={handleChange}
            required
          />
          <input
            id="foodQty"
            placeholder="Quantity available"
            value={form.qty}
            onChange={handleChange}
          />
          <textarea
            id="foodDesc"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
          />
          <input id="foodImage" type="file" accept="image/*" onChange={handleChange} />

          {/* Allergen picker */}
          <div className="allergen-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className="allergen-toggle"
              onClick={() => setAllergenOpen(o => !o)}
            >
              {form.allergens.length > 0
                ? `Allergens: ${form.allergens.join(', ')}`
                : 'Select allergens'}
              <span className="allergen-arrow">{allergenOpen ? '▲' : '▼'}</span>
            </button>

            {allergenOpen && (
              <ul className="allergen-list">
                {ALLERGENS.map(allergen => (
                  <li key={allergen}>
                    <label>
                      <input
                        type="checkbox"
                        checked={form.allergens.includes(allergen)}
                        onChange={() => toggleAllergen(allergen)}
                      />
                      {allergen}
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

      {/* ── Menu items list ── */}
      {items.length === 0 ? (
        <p id="emptyMsg">No menu items yet. Add your first item above.</p>
      ) : (
        <ul>
          {items.map((item, index) => (
            <li key={item.id} className={editingIndex === index ? 'editing' : ''}>
              <img src={item.imageUrl} alt={item.name} />

              <div className="info">
                <h3>{item.name}</h3>
                <p>R {item.price}</p>
                {item.description ? <p>{item.description}</p> : null}
                {item.allergens?.length > 0 && (
                  <p className="allergen-tags">
                    {item.allergens.map(a => (
                      <span key={a} className="allergen-tag">{a}</span>
                    ))}
                  </p>
                )}
              </div>

              <button onClick={() => editItem(index)}>Edit</button>
              <button className="delete-btn" onClick={() => deleteItem(index)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MenuManagement;