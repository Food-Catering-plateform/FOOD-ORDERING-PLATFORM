import React, { useState, useRef, useEffect } from 'react';
import './MenuManagement.css';
import { collection, addDoc, updateDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../Firebase/firebaseConfig";
import { useAuth } from "../../Services/AuthContext";

function MenuManagement() {
  const { vendorId } = useAuth();

  const [items, setItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({
    name: '',
    price: '',
    qty: '',
    description: '',
    imageUrl: null
  });

  const formRef = useRef(null);

  function handleChange(e) {
    const { id, value, files } = e.target;

    if (id === 'foodImage') {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () =>
          setForm(f => ({ ...f, imageUrl: reader.result }));
        reader.readAsDataURL(file);
      }
    } else {
      const key = {
        foodName: 'name',
        foodPrice: 'price',
        foodQty: 'qty',
        foodDesc: 'description'
      }[id];

      setForm(f => ({ ...f, [key]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!vendorId) return;

    const menuCollectionRef = collection(db, "Vendors", vendorId, "menuItems");

    const imageUrl = form.imageUrl || (
      editingIndex !== null
        ? items[editingIndex].imageUrl
        : 'https://placehold.co/60x60/f5e6d3/7a4e27?text=Food'
    );

    const newItem = {
      name: form.name.trim(),
      price: parseFloat(form.price).toFixed(2),
      qty: form.qty,
      description: form.description.trim(),
      imageUrl
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

        setItems(prev => [
          ...prev,
          { ...newItem, id: docRef.id }
        ]);
      }

      setForm({ name: '', price: '', qty: '', description: '', imageUrl: null });

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

        const filteredData = data.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        setItems(filteredData);

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
      name: item.name,
      price: item.price,
      qty: item.qty,
      description: item.description,
      imageUrl: item.imageUrl
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
        setForm({ name: '', price: '', qty: '', description: '', imageUrl: null });
      }

    } catch (error) {
      console.error("Unable to delete item", error);
    }
  }

  if (!vendorId) return <p>Loading...</p>;

  return (
    <section className="page">
      <h1>Menu Management</h1>

      <section className="card" ref={formRef}>
        <h2>{editingIndex !== null ? 'Edit Food Item' : 'Add Food Item'}</h2>

        <form onSubmit={handleSubmit}>
          <input id="foodName" placeholder="Food Name" value={form.name} onChange={handleChange} />
          <input id="foodPrice" placeholder="Price" value={form.price} onChange={handleChange} />
          <input id="foodQty" placeholder="Quantity" value={form.qty} onChange={handleChange} />
          <textarea id="foodDesc" placeholder="Description" value={form.description} onChange={handleChange} />
          <input id="foodImage" type="file" onChange={handleChange} />

          <button type="submit" id="submitBtn">
            {editingIndex !== null ? 'Save Changes' : 'Add Product'}
          </button>
        </form>
      </section>

      <ul>
        {items.map((item, index) => (
          <li key={item.id}>
            <img src={item.imageUrl} alt={item.name} />
            <h3>{item.name}</h3>
            <p>R {item.price}</p>
            <button onClick={() => editItem(index)}>Edit</button>
            <button onClick={() => deleteItem(index)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default MenuManagement;