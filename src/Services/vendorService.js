import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../Firebase/firebaseConfig";

// ─── Vendors ────────────────────────────────────────────────────────────────

export const fetchAllVendors = async () => {
  const snapshot = await getDocs(collection(db, "vendors"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateVendorStatus = async (vendorId, newStatus) => {
  await updateDoc(doc(db, "vendors", vendorId), { status: newStatus });
};

export const approveVendor  = (id) => updateVendorStatus(id, "approved");
export const suspendVendor  = (id) => updateVendorStatus(id, "suspended");

// ─── Admins ──────────────────────────────────────────────────────────────────

export const fetchAllAdmins = async () => {
  const snapshot = await getDocs(collection(db, "admins"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateAdminStatus = async (adminId, newStatus) => {
  const adminRef = doc(db, "admins", adminId);
  await updateDoc(adminRef, { status: newStatus });
  await updateDoc(doc(db, "users", adminId), { status: newStatus });
};

export const approveAdmin  = (id) => updateAdminStatus(id, "approved");
export const suspendAdmin  = (id) => updateAdminStatus(id, "suspended");