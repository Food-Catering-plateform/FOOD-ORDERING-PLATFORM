import React, { useState, useEffect } from 'react';
import '../css/Profile.css';
import { db, storage } from '../../../Firebase/firebaseConfig';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { useAuth } from '../../../Services/AuthContext';
import { updateEmail, deleteUser } from 'firebase/auth';

export default function Profile({ setActivePage }) {
  const { currentUser } = useAuth();
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    phone: '',
    email: '',
    studentNumber: '',
    role: '',
  });
  
  const [photoURL, setPhotoURL] = useState('');
  const [previewURL, setPreviewURL] = useState('');

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    // Document ID is the uid — fetch directly
    const userDocRef = doc(db, 'users', currentUser.uid);

    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        setForm({
          name: userData.name || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          email: userData.email || currentUser.email || '',
          studentNumber: userData.studentNumber || '',
          role: userData.role || '',
        });
        setPhotoURL(userData.photoURL || '');
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load profile data');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    setUploading(true);
    setError('');
    
    try {
      const photoRef = ref(storage, `profile_pictures/${currentUser.uid}`);
      await uploadBytes(photoRef, file);
      const downloadURL = await getDownloadURL(photoRef);

      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      setPhotoURL(downloadURL);
      setPreviewURL('');
      setSuccess('Profile picture updated successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        name: form.name,
        lastName: form.lastName,
        phone: form.phone,
      });

      if (form.email !== currentUser.email) {
        await updateEmail(currentUser, form.email);
      }

      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      console.error(err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) return;
    if (!currentUser) return;

    setSaving(true);
    setError('');

    try {
      if (photoURL) {
        try {
          const photoRef = ref(storage, `profile_pictures/${currentUser.uid}`);
          await deleteObject(photoRef);
        } catch (e) {
          console.log("No photo to delete or already deleted");
        }
      }

      await deleteDoc(doc(db, 'users', currentUser.uid));
      await deleteUser(currentUser);

      alert('Account deleted successfully.');
      setActivePage('login');
    } catch (err) {
      console.error(err);
      setError('Failed to delete account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="profile-page"><div className="loading">Loading profile...</div></main>;
  }

  return (
    <main className="profile-page">
      <header className="profile-header">
        <h1>Personal Information</h1>
        <button className="logout-btn" onClick={() => setActivePage('login')}>
          Logout
        </button>
      </header>

      <section className="avatar-section">
        <figure className="avatar-wrapper">
          <div className="avatar">
            {photoURL || previewURL ? (
              <img 
                src={previewURL || photoURL} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            )}
          </div>
          
          <label className="avatar-edit-btn" htmlFor="photo-upload">
            {uploading ? '...' : 
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            }
          </label>
          <input 
            type="file" 
            id="photo-upload" 
            accept="image/*" 
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
          />
        </figure>
      </section>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {editing ? (
        <form className="edit-form" onSubmit={handleSave}>
          <fieldset>
            <label htmlFor="name">First Name</label>
            <input id="name" name="name" type="text" value={form.name} onChange={handleChange} required />
          </fieldset>

          <fieldset>
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" name="lastName" type="text" value={form.lastName} onChange={handleChange} />
          </fieldset>

          <fieldset>
            <label htmlFor="phone">Phone Number</label>
            <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} />
          </fieldset>

          <fieldset>
            <label htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
          </fieldset>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <section className="info-section">
          <article className="info-row" onClick={() => setEditing(true)}>
            <header>
              <span className="label">First Name</span>
              <p className="value">{form.name || 'Not set'}</p>
            </header>
            <span className="arrow">›</span>
          </article>

          <article className="info-row" onClick={() => setEditing(true)}>
            <header>
              <span className="label">Last Name</span>
              <p className="value">{form.lastName || 'Not set'}</p>
            </header>
            <span className="arrow">›</span>
          </article>

          <article className="info-row" onClick={() => setEditing(true)}>
            <header>
              <span className="label">Phone Number</span>
              <p className="value">{form.phone || 'Not set'}</p>
            </header>
            <span className="arrow">›</span>
          </article>

          <article className="info-row" onClick={() => setEditing(true)}>
            <header>
              <span className="label">Email Address</span>
              <p className="value">{form.email || 'Not set'}</p>
            </header>
            <span className="arrow">›</span>
          </article>

          <article className="info-row">
            <header>
              <span className="label">Student Number</span>
              <p className="value">{form.studentNumber || 'Not set'}</p>
            </header>
          </article>

          <article className="info-row">
            <header>
              <span className="label">Role</span>
              <p className="value">{form.role || 'Not set'}</p>
            </header>
          </article>
        </section>
      )}

      <section className="danger-zone">
        <h2>Danger Zone</h2>
        <p className="danger-desc">Once you delete your account, there is no going back. All your data will be permanently removed.</p>
        <button 
          className="delete-account-btn" 
          type="button"
          onClick={handleDeleteAccount}
          disabled={saving}
        >
          {saving ? 'Deleting...' : 'Delete My Account'}
        </button>
      </section>
    </main>
  );
}