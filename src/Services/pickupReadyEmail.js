import { doc, getDoc } from 'firebase/firestore';
import { db } from '../Firebase/firebaseConfig';

export async function sendOrderReadyForPickupEmail(order) {
  const serviceId  = process.env.REACT_APP_EMAILJS_SERVICE_ID;
  const templateId = process.env.REACT_APP_EMAILJS_READY_TEMPLATE_ID;
  const publicKey  = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

  // FIX - log clearly so you can see in browser console what is missing
  if (!serviceId || !templateId || !publicKey) {
    console.error('[pickupReadyEmail] EmailJS env vars missing:', {
      serviceId:  !!serviceId,
      templateId: !!templateId,
      publicKey:  !!publicKey,
    });
    return {
      ok: false,
      error: 'EmailJS is not configured. Check your .env file.',
    };
  }

  if (order.status !== 'ready') {
    console.warn('[pickupReadyEmail] Order is not ready status:', order.status);
    return { ok: false, error: 'Order is not in ready status.' };
  }

  if (order.pickupEmailSent) {
    console.log('[pickupReadyEmail] Email already sent for order:', order.id);
    return { ok: true };
  }

  let recipientEmail = order.customerEmail || null;
  console.log('[pickupReadyEmail] customerEmail from order:', recipientEmail);

  // FIX - fallback: look up email from Firestore users collection
  if (!recipientEmail && order.customerId) {
    console.log('[pickupReadyEmail] Looking up email from Firestore for uid:', order.customerId);
    try {
      const userSnap = await getDoc(doc(db, 'users', order.customerId));
      if (userSnap.exists()) {
        const d = userSnap.data();
        recipientEmail = d.email || d.userEmail || null;
        console.log('[pickupReadyEmail] Found email in Firestore:', recipientEmail);
      } else {
        console.warn('[pickupReadyEmail] No user document found for uid:', order.customerId);
      }
    } catch (err) {
      console.error('[pickupReadyEmail] Firestore lookup failed:', err);
    }
  }

  // FIX - fallback: use customerName if it looks like an email
  if (!recipientEmail && typeof order.customerName === 'string' && order.customerName.includes('@')) {
    recipientEmail = order.customerName.trim();
    console.log('[pickupReadyEmail] Using customerName as email:', recipientEmail);
  }

  if (!recipientEmail) {
    console.error('[pickupReadyEmail] No email found for order:', order.id);
    return {
      ok: false,
      error: 'No customer email found for this order.',
    };
  }

  console.log('[pickupReadyEmail] Sending email to:', recipientEmail, 'for order:', order.id);

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  serviceId,
        template_id: templateId,
        user_id:     publicKey,
        template_params: {
          to_email:      recipientEmail,
          customer_name: order.customerName || 'Customer',
          order_id:      order.id,
          total_amount:  typeof order.total === 'number' ? `R ${order.total.toFixed(2)}` : '',
          pickup_time:   order.time || 'as soon as possible',
          reply_to:      order.vendorName || 'Campus vendor',
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[pickupReadyEmail] EmailJS API error:', text);
      return { ok: false, error: text || `HTTP ${response.status}` };
    }

    console.log('[pickupReadyEmail] Email sent successfully to:', recipientEmail);
    return { ok: true };

  } catch (err) {
    console.error('[pickupReadyEmail] Fetch failed:', err);
    return { ok: false, error: err.message };
  }
}