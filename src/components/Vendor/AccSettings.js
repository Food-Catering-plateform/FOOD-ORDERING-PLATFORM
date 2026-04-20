import React, { useState, useEffect } from 'react';
import './AccSettings.css';
import { auth, db } from '../../Firebase/firebaseConfig';
import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CATEGORIES = [
  'Fast Food', 'Traditional', 'Halal', 'Vegetarian',
  'Seafood', 'Desserts & Drinks', 'Grills & Braai', 'Other',
];

function AccSettings({ onStoreUpdate, uid, onLogout }) {
  const [storeForm, setStoreForm] = useState({
    name: '', category: '', description: '', address: '', phone: '',
    hours: {}, logoPreview: null, bannerPreview: null,
  });

  const [accountForm, setAccountForm] = useState({
    fullName: '', email: '', contact: '', currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const [loading, setLoading]       = useState(true);
  const [saved, setSaved]           = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [adminApp, setAdminApp]     = useState({ message: '', submitted: false });

  // Fetch vendor data + check existing admin application from database
  useEffect(() => {
    if (!uid) return;

    const fetchVendorData = async () => {
      try {
        const vendorSnap = await getDoc(doc(db, 'Vendors', uid));
        const userData   = await getDoc(doc(db, 'users',   uid));
        const appSnap    = await getDoc(doc(db, 'adminApplications', uid));

        if (vendorSnap.exists()) {
          const v = vendorSnap.data();
          setStoreForm({
            name:          v.businessName  || '',
            category:      v.category      || '',
            description:   v.description   || '',
            address:       v.address       || '',
            phone:         v.phoneNumber   || '',
            hours:         v.hours         || {},
            logoPreview:   v.logoURL       || null,
            bannerPreview: v.bannerURL     || null,
          });
        }

        if (userData.exists()) {
          const u = userData.data();
          setAccountForm(prev => ({
            ...prev,
            fullName: u.fullName || '',
            email:    u.email    || '',
            contact:  u.contact  || '',
          }));
        }

        // Restore submitted state if application already exists in Firestore
        if (appSnap.exists()) {
          setAdminApp({ message: appSnap.data().message, submitted: true });
        }

      } catch (err) {
        console.error('Failed to fetch vendor data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [uid]);

  // ── Submit admin application to Firestore 
  const handleAdminApplication = async () => {
    if (!adminApp.message.trim() || !uid) return;
    try {
      await setDoc(doc(db, 'adminApplications', uid), {
        vendorId:    uid,
        vendorName:  storeForm.name,
        message:     adminApp.message,
        status:      'pending',
        submittedAt: serverTimestamp(),
      });
      setAdminApp(prev => ({ ...prev, submitted: true }));
    } catch (err) {
      console.error('Failed to submit admin application:', err);
    }
  };

  //  Delete account remove it everywhere 
  const handleDeleteAccount = async () => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users',   uid));
    await deleteDoc(doc(db, 'Vendors', uid));
    await deleteUser(auth.currentUser);
    onLogout();
  };

  const updateStore   = (field, value) => setStoreForm(prev => ({ ...prev, [field]: value }));
  const updateAccount = (field, value) => setAccountForm(prev => ({ ...prev, [field]: value }));

  const updateHours = (day, field, value) =>
    setStoreForm(prev => ({
      ...prev,
      hours: { ...prev.hours, [day]: { ...prev.hours[day], [field]: value } },
    }));
//make image a object
  const handleImage = (previewField, file) => {
    if (!file) return;
    setStoreForm(prev => ({ ...prev, [previewField]: URL.createObjectURL(file) }));
  };
//when you save changes on edits
  const handleSave = () => {
    if (onStoreUpdate) onStoreUpdate({ ...storeForm });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <p className="acc-settings__loading">Loading your settings…</p>;

  return (
    <article className="acc-settings">

      <header className="acc-settings__header">
        <h1>Account Settings</h1>
        <p>Manage your store details and personal information.</p>
      </header>

      {saved && (
        <p className="acc-settings__toast" role="status">Changes saved successfully!</p>
      )}

      {/* ── Store Details ── */}
      <section className="acc-card">
        <h2 className="acc-card__title">Store Details</h2>

        <p className="acc-field">
          <label>Store Name</label>
          <input type="text" value={storeForm.name}
            onChange={e => updateStore('name', e.target.value)} />
        </p>

        <p className="acc-field">
          <label>Category</label>
          <select value={storeForm.category} onChange={e => updateStore('category', e.target.value)}>
            <option value="">-- Select --</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </p>

        <p className="acc-field">
          <label>Description</label>
          <textarea
            value={storeForm.description}
            onChange={e => updateStore('description', e.target.value)}
            rows={3} maxLength={200}
          />
          <output className="acc-field__count">{storeForm.description.length}/200</output>
        </p>

        <p className="acc-field">
          <label>Address</label>
          <input type="text" value={storeForm.address}
            onChange={e => updateStore('address', e.target.value)} />
        </p>

        <p className="acc-field">
          <label>Store Contact Number</label>
          <input type="tel" value={storeForm.phone}
            onChange={e => updateStore('phone', e.target.value)} />
        </p>

        <section className="acc-field">
          <label>Operating Hours</label>
          <ul className="hours-grid">
            {DAYS.map(day => {
              const h = storeForm.hours[day] || { open: '08:00', close: '20:00', closed: false };
              return (
                <li key={day} className="hours-row">
                  <abbr className="hours-day" title={day}>{day.slice(0, 3)}</abbr>
                  <label className="hours-closed">
                    <input type="checkbox" checked={h.closed}
                      onChange={e => updateHours(day, 'closed', e.target.checked)} />
                    Closed
                  </label>
                  {!h.closed && (
                    <>
                      <input type="time" value={h.open} className="hours-time"
                        onChange={e => updateHours(day, 'open', e.target.value)} />
                      <span className="hours-sep">–</span>
                      <input type="time" value={h.close} className="hours-time"
                        onChange={e => updateHours(day, 'close', e.target.value)} />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="acc-images">
          <p className="acc-field">
            <label>Store Logo</label>
            <label className="upload-box upload-box--logo">
              {storeForm.logoPreview
                ? <img src={storeForm.logoPreview} alt="Logo" className="upload-preview" />
                : <small className="upload-placeholder">Click to change logo</small>}
              <input type="file" accept="image/*" hidden
                onChange={e => handleImage('logoPreview', e.target.files[0])} />
            </label>
          </p>

          <p className="acc-field">
            <label>Store Banner</label>
            <label className="upload-box upload-box--banner">
              {storeForm.bannerPreview
                ? <img src={storeForm.bannerPreview} alt="Banner" className="upload-preview" />
                : <small className="upload-placeholder">Click to change banner</small>}
              <input type="file" accept="image/*" hidden
                onChange={e => handleImage('bannerPreview', e.target.files[0])} />
            </label>
          </p>
        </section>
      </section>

      {/* ── Personal Details ── */}
      <section className="acc-card">
        <h2 className="acc-card__title">Personal Details</h2>

        <p className="acc-field">
          <label>Full Name</label>
          <input type="text" value={accountForm.fullName} placeholder="Your full name"
            onChange={e => updateAccount('fullName', e.target.value)} />
        </p>

        <p className="acc-field">
          <label>Email Address</label>
          <input type="email" value={accountForm.email} placeholder="your@email.com"
            onChange={e => updateAccount('email', e.target.value)} />
        </p>

        <p className="acc-field">
          <label>Personal Contact Number</label>
          <input type="tel" value={accountForm.contact} placeholder="e.g. 083 123 4567"
            onChange={e => updateAccount('contact', e.target.value)} />
        </p>

        <h3 className="acc-divider">Change Password</h3>

        <p className="acc-field">
          <label>Current Password</label>
          <input type="password" value={accountForm.currentPassword}
            placeholder="Enter current password"
            onChange={e => updateAccount('currentPassword', e.target.value)} />
        </p>

        <section className="acc-row">
          <p className="acc-field">
            <label>New Password</label>
            <input type="password" value={accountForm.newPassword} placeholder="New password"
              onChange={e => updateAccount('newPassword', e.target.value)} />
          </p>
          <p className="acc-field">
            <label>Confirm Password</label>
            <input type="password" value={accountForm.confirmPassword} placeholder="Repeat new password"
              onChange={e => updateAccount('confirmPassword', e.target.value)} />
          </p>
        </section>
      </section>

      {/* ── Platform Access ── */}
      <section className="acc-card acc-card--muted">
        <h2 className="acc-card__title acc-card__title--muted">Platform Access</h2>
        {adminApp.submitted ? (
          <p className="admin-app__status">
            Your application has been submitted and is under review.
          </p>
        ) : (
          <>
            <p className="admin-app__hint">
              Want to help manage the platform? You can request elevated access here.
            </p>
            <p className="acc-field">
              <label>Reason for applying</label>
              <textarea
                rows={3}
                value={adminApp.message}
                onChange={e => setAdminApp(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Briefly describe why you'd like admin access..."
              />
            </p>
            <button
              className="btn btn--ghost"
              disabled={!adminApp.message.trim()}
              onClick={handleAdminApplication}
            >
              Submit Application
            </button>
          </>
        )}
      </section>

      {/* ── Danger Zone ── */}
      <section className="acc-card acc-card--danger">
        <h2 className="acc-card__title acc-card__title--danger">Danger Zone</h2>
        <p className="danger-hint">Deleting your account is permanent and cannot be undone.</p>
        {!confirming ? (
          <button className="btn btn--danger-ghost" onClick={() => setConfirming(true)}>
            Delete Account
          </button>
        ) : (
          <section className="danger-confirm">
            <p className="danger-confirm__warning">
              Are you sure? This will delete your store and all your data.
            </p>
            <footer className="danger-confirm__actions">
              <button className="btn btn--ghost" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="btn btn--danger" onClick={handleDeleteAccount}>
                Yes, delete my account
              </button>
            </footer>
          </section>
        )}
      </section>

      <footer className="acc-settings__footer">
        <button className="btn btn--primary" onClick={handleSave}>Save Changes</button>
      </footer>

    </article>
  );
}

export default AccSettings;