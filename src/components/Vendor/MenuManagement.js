import React, { useState, useRef, useEffect } from 'react';
import './MenuManagement.css';
import { collection, addDoc, updateDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../Firebase/firebaseConfig";


function MenuManagement() {
  const itemCollectionRef = collection(db, "menuItems");

  const [items, setItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  const [form, setForm] = useState({
    name: '',
    price: '',
    qty: '',
    desc: '',
    image: null
  });

  const formRef = useRef(null);

  function handleChange(e) {
    const { id, value, files } = e.target;

    if (id === 'foodImage') {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () =>
          setForm(f => ({ ...f, image: reader.result }));
        reader.readAsDataURL(file);
      }
    } else {
      const key = {
        foodName: 'name',
        foodPrice: 'price',
        foodQty: 'qty',
        foodDesc: 'desc'
      }[id];

      setForm(f => ({ ...f, [key]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const image = form.image || (
      editingIndex !== null
        ? items[editingIndex].image
        : 'https://placehold.co/60x60/f5e6d3/7a4e27?text=Food'
    );

    const newItem = {
      name: form.name.trim(),
      price: parseFloat(form.price).toFixed(2),
      qty: form.qty,
      desc: form.desc.trim(),
      image
    };

    try {
      if (editingIndex !== null) {
        const itemToEdit = items[editingIndex];

        await updateDoc(
          doc(db, "menuItems", itemToEdit.id),
          newItem
        );

        setItems(prev =>
          prev.map((item, i) =>
            i === editingIndex ? { ...newItem, id: itemToEdit.id } : item
          )
        );

        setEditingIndex(null);

      } else {
        const docRef = await addDoc(itemCollectionRef, newItem);

        setItems(prev => [
          ...prev,
          { ...newItem, id: docRef.id }
        ]);
      }

      setForm({ name: '', price: '', qty: '', desc: '', image: null });

    } catch (error) {
      console.error("Error saving item:", error);
    }
  }

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await getDocs(itemCollectionRef);

        const filteredData = data.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setItems(filteredData);

      } catch (error) {
        console.error("Unable to fetch items", error);
      }
    };

    fetchItems();
  }, [itemCollectionRef]);

  function editItem(index) {
    const item = items[index];
    setEditingIndex(index);

    setForm({
      name: item.name,
      price: item.price,
      qty: item.qty,
      desc: item.desc,
      image: item.image
    });

    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function deleteItem(index) {
    const item = items[index];

    try {
      await deleteDoc(doc(db, "menuItems", item.id));

      setItems(prev => prev.filter((_, i) => i !== index));

      if (editingIndex === index) {
        setEditingIndex(null);
        setForm({ name: '', price: '', qty: '', desc: '', image: null });
      }

    } catch (error) {
      console.error("Unable to delete item", error);
    }
  }

  return (
    <section className="page">
      <h1>Menu Management</h1>

      <section className="card" ref={formRef}>
        <h2>Add Food Item</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="foodName">Food Name</label>
          <input id="foodName" type="text" placeholder="e.g. Burger" value={form.name} onChange={handleChange} required />

          <label htmlFor="foodPrice">Price</label>
          <input id="foodPrice" type="number" placeholder="0.00" min="0" step="0.01" value={form.price} onChange={handleChange} required />

          <label htmlFor="foodQty">Quantity</label>
          <input id="foodQty" type="number" placeholder="1" min="1" value={form.qty} onChange={handleChange} required />

          <label htmlFor="foodDesc">Description</label>
          <textarea id="foodDesc" placeholder="Describe food..." value={form.desc} onChange={handleChange} />

          <label htmlFor="foodImage">Image</label>
          <input id="foodImage" type="file" accept="image/*" onChange={handleChange} />

          <button type="submit" id="submitBtn">
            {editingIndex !== null ? 'Save Changes' : 'Add Product'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Existing Menu Items</h2>
        {items.length === 0 && <p id="emptyMsg">No items yet. Add one above.</p>}
        <ul id="productList">
          {items.map((item, index) => (
            <li key={item.id} className={editingIndex === index ? 'editing' : ''}>
              <img src={item.image} alt={item.name} />
              <section className="info" aria-label={item.name}>
                <h3>{item.name}</h3>
                <p>Price: R {item.price}</p>
                <p>Qty: {item.qty}</p>
                {item.desc && <em>{item.desc}</em>}
              </section>
              <button onClick={() => editItem(index)}>Edit</button>
              <button className="delete-btn" onClick={() => deleteItem(index)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

export default MenuManagement;