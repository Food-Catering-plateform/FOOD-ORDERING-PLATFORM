import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../Firebase/firebaseConfig";

// ─── Vendors ────────────────────────────────────────────────────────────────

export const fetchAllVendors = async () => {
  const snapshot = await getDocs(collection(db, "Vendors"));

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

export const updateVendorStatus = async (vendorId, newStatus) => {

  // Update vendor document
  await updateDoc(doc(db, "Vendors", vendorId), {
    status: newStatus,
  });

  // Keep users collection in sync
  await updateDoc(doc(db, "users", vendorId), {
    status: newStatus,
  });
};

export const approveVendor = (id) =>
  updateVendorStatus(id, "approved");

export const suspendVendor = (id) =>
  updateVendorStatus(id, "suspended");

//  Admins 

export const fetchAllAdmins = async () => {
  const snapshot = await getDocs(collection(db, "admins"));

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

export const updateAdminStatus = async (adminId, newStatus) => {

  const adminRef = doc(db, "admins", adminId);

  // Update admin document
  await updateDoc(adminRef, {
    status: newStatus,
  });

  // Keep users collection in sync
  await updateDoc(doc(db, "users", adminId), {
    status: newStatus,
  });
};

export const approveAdmin = (id) =>
  updateAdminStatus(id, "approved");

export const suspendAdmin = (id) =>
  updateAdminStatus(id, "suspended");