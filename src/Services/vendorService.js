import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../Firebase/firebaseConfig";

/**
 * Fetch all vendor documents from Firestore
 * @returns {Promise<Array>} Array of vendor objects
 */
export const fetchAllVendors = async () => {
  const snapshot = await getDocs(collection(db, "vendors"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Update a vendor's status in Firestore
 * @param {string} vendorId
 * @param {string} newStatus - "approved" | "suspended" | "pending"
 */
export const updateVendorStatus = async (vendorId, newStatus) => {
  const vendorRef = doc(db, "vendors", vendorId);
  await updateDoc(vendorRef, { status: newStatus });
};

export const approveVendor = (vendorId) => updateVendorStatus(vendorId, "approved");
export const suspendVendor = (vendorId) => updateVendorStatus(vendorId, "suspended");