import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../Firebase/firebaseConfig';
import { auth } from '../../Firebase/firebaseConfig'; // Firebase auth instance needed to sign the user out
import { signOut } from 'firebase/auth'; // signs the vendor out of Firebase when they exit setup
import { useAuth } from '../../Services/AuthContext';
import './StoreSetup.css';

const STEPS = ['Basic Info', 'Location & Hours', 'Branding', 'Review'];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CATEGORIES = [
  'Fast Food', 'Traditional', 'Halal', 'Vegetarian',
  'Seafood', 'Desserts & Drinks', 'Grills & Braai', 'Other',
];

const defaultHours = DAYS.reduce((acc, day) => {
  acc[day] = { open: '08:00', close: '20:00', closed: false };
  return acc;
}, {});

function StoreSetup({ onComplete, onCancel }) {
  const { vendorId } = useAuth();
//set states
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    phone: '',
    hours: defaultHours,
    logo: null,
    banner: null,
    logoPreview: null,
    bannerPreview: null,
  });
  const [errors, setErrors] = useState({});

  const update = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));
///literaly what the it says, it update hours on firebase
  const updateHours = (day, field, value) =>
    setForm(prev => ({
      ...prev,
      hours: { ...prev.hours, [day]: { ...prev.hours[day], [field]: value } },
    }));

  const handleImage = (field, previewField, file) => {
    if (!file) return;
    setForm(prev => ({
      ...prev,
      [field]: file,
      [previewField]: URL.createObjectURL(file),
    }));
  };
//indicates complusory values
  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.name.trim())        e.name        = 'Store name is required';
      if (!form.category)           e.category    = 'Please select a category';
      if (!form.description.trim()) e.description = 'Add a short description';
    }
    if (step === 1) {
      if (!form.address.trim()) e.address = 'Address is required';
      if (!form.phone.trim())   e.phone   = 'Contact number is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);
///puts data in database
  const handleSubmit = async () => {
    if (!vendorId) return;

    const storeData = {
      businessName: form.name,
      category:     form.category,
      description:  form.description,
      address:      form.address,
      phoneNumber:  form.phone,
      hours:        form.hours,
      status:       'pending',
      storeInitialized: true,
    };

    await setDoc(doc(db, 'vendors', vendorId), storeData, { merge: true });
    // Sign out then show the pending wall — admin must approve before dashboard access
    await signOut(auth);
    if (onComplete) onComplete();
  };

  if (!vendorId) return <p>Loading...</p>;

  return (
    <main className="store-setup-page">
      <article className="store-setup">

        <header className="store-setup__header">
          <h1 className="store-setup__title">Set Up Your Store</h1>
          <ol className="store-setup__steps" aria-label="Setup progress">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`store-setup__step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              >
                <b className="step-dot">{i < step ? '✓' : i + 1}</b>
                <small className="step-label">{label}</small>
              </li>
            ))}
          </ol>
        </header>

        <section className="store-setup__card">

          {step === 0 && (
            <fieldset className="store-setup__fieldset">
              <legend>Basic Information</legend>

              <label className="field">
                <b className="field__label">Store Name</b>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="e.g. Mama's Kitchen"
                />
                {errors.name && <em className="field__error">{errors.name}</em>}
              </label>

              <label className="field">
                <b className="field__label">Category</b>
                <select value={form.category} onChange={e => update('category', e.target.value)}>
                  <option value="">-- Select a category --</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <em className="field__error">{errors.category}</em>}
              </label>

              <label className="field">
                <b className="field__label">Short Description</b>
                <textarea
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  placeholder="Tell customers what makes your store special..."
                  rows={3}
                  maxLength={200}
                />
                <output className="field__count">{form.description.length}/200</output>
                {errors.description && <em className="field__error">{errors.description}</em>}
              </label>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset className="store-setup__fieldset">
              <legend>Location &amp; Hours</legend>

              <label className="field">
                <b className="field__label">Address</b>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => update('address', e.target.value)}
                  placeholder="e.g. 12 Main Street, Soweto"
                />
                {errors.address && <em className="field__error">{errors.address}</em>}
              </label>

              <label className="field">
                <b className="field__label">Contact Number</b>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  placeholder="e.g. 011 123 4567"
                />
                {errors.phone && <em className="field__error">{errors.phone}</em>}
              </label>

              <section className="field">
                <b className="field__label">Operating Hours</b>
                <ul className="hours-grid">
                  {DAYS.map(day => (
                    <li key={day} className="hours-row">
                      <abbr className="hours-day" title={day}>{day.slice(0, 3)}</abbr>

                      <label className="hours-closed">
                        <input
                          type="checkbox"
                          checked={form.hours[day].closed}
                          onChange={e => updateHours(day, 'closed', e.target.checked)}
                        />
                        Closed
                      </label>

                      {!form.hours[day].closed && (
                        <>
                          <input
                            type="time"
                            value={form.hours[day].open}
                            onChange={e => updateHours(day, 'open', e.target.value)}
                            className="hours-time"
                          />
                          <i className="hours-sep">–</i>
                          <input
                            type="time"
                            value={form.hours[day].close}
                            onChange={e => updateHours(day, 'close', e.target.value)}
                            className="hours-time"
                          />
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="store-setup__fieldset">
              <legend>Branding</legend>

              <section className="field">
                <b className="field__label">Store Logo</b>
                <label className="upload-box">
                  {form.logoPreview
                    ? <img src={form.logoPreview} alt="Logo preview" className="upload-preview upload-preview--logo" />
                    : <small className="upload-placeholder">Click to upload logo</small>}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={e => handleImage('logo', 'logoPreview', e.target.files[0])}
                  />
                </label>
              </section>

              <section className="field">
                <b className="field__label">Store Banner</b>
                <label className="upload-box upload-box--wide">
                  {form.bannerPreview
                    ? <img src={form.bannerPreview} alt="Banner preview" className="upload-preview upload-preview--banner" />
                    : <small className="upload-placeholder">Click to upload banner image</small>}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={e => handleImage('banner', 'bannerPreview', e.target.files[0])}
                  />
                </label>
                <small className="field__hint">Optional — displayed at the top of your store page</small>
              </section>
            </fieldset>
          )}

          {step === 3 && (
            <section className="store-setup__review">
              <h2>Review Your Store</h2>

              {form.bannerPreview && (
                <img src={form.bannerPreview} alt="Store banner" className="review-banner" />
              )}

              <figure className="review-profile">
                {form.logoPreview && (
                  <img src={form.logoPreview} alt="Store logo" className="review-logo" />
                )}
                <figcaption>
                  <h3>{form.name || '—'}</h3>
                  <p className="review-category">{form.category || '—'}</p>
                  <p className="review-desc">{form.description || '—'}</p>
                </figcaption>
              </figure>

              <dl className="review-details">
                <dt>Address</dt>      <dd>{form.address || '—'}</dd>
                <dt>Phone</dt>        <dd>{form.phone || '—'}</dd>
                <dt>Hours</dt>
                <dd>
                  {DAYS.map(day => (
                    <p key={day} className="review-hour-row">
                      <abbr title={day}>{day.slice(0, 3)}</abbr>
                      <output>
                        {form.hours[day].closed
                          ? 'Closed'
                          : `${form.hours[day].open} – ${form.hours[day].close}`}
                      </output>
                    </p>
                  ))}
                </dd>
              </dl>
            </section>
          )}

        </section>

        <footer className="store-setup__nav">
          {/* on step 0: exit button signs vendor out and goes back to login via onCancel */}
          {step === 0 && (
            <button className="btn btn--ghost" onClick={() => signOut(auth).then(onCancel)}>Exit</button>
          )}
          {step > 0 && (
            <button className="btn btn--ghost" onClick={back}>Back</button>
          )}
          {step < STEPS.length - 1
            ? <button className="btn btn--primary" onClick={next}>Next</button>
            : <button className="btn btn--primary" onClick={handleSubmit}>Launch Store</button>
          }
        </footer>

      </article>
    </main>
  );
}

export default StoreSetup;