import { collection, getDocs, doc, updateDoc} from "firebase/firestore";
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
  // Update admin application document
  await updateDoc(doc(db, "admins", adminId), {
    status: newStatus,
  });

  // Sync status to users collection — keep role as 'vendor' so they still
  // land on the vendor dashboard at login. isAdmin flag is what grants access.
  await updateDoc(doc(db, "users", adminId), {
    status: newStatus,
    isAdmin: newStatus === "approved",
  });
};

export const approveAdmin = (id) =>
  updateAdminStatus(id, "approved");

export const suspendAdmin = (id) =>
  updateAdminStatus(id, "suspended");