import React, { useState, useEffect } from "react";
import { fetchAllVendors, approveVendor, suspendVendor } from "../../Services/vendorService";
import "./AdminVendorManagement.css";

const STATUS_FILTERS = ["all", "pending", "approved", "suspended"];

const statusColors = {
  pending:   { bg: "#FFF8E1", color: "#F59E0B" },
  approved:  { bg: "#E8F5E9", color: "#22C55E" },
  suspended: { bg: "#FEECEC", color: "#EF4444" },
};

export default function AdminVendorManagement({ setActivePage }) {
  const [vendors, setVendors]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter]               = useState("all");
  const [error, setError]                 = useState(null);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllVendors();
      setVendors(data);
    } catch (err) {
      setError("Failed to load vendors. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (vendorId) => {
    setActionLoading(vendorId);
    try {
      await approveVendor(vendorId);
      setVendors((prev) =>
        prev.map((v) => (v.id === vendorId ? { ...v, status: "approved" } : v))
      );
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (vendorId) => {
    setActionLoading(vendorId);
    try {
      await suspendVendor(vendorId);
      setVendors((prev) =>
        prev.map((v) => (v.id === vendorId ? { ...v, status: "suspended" } : v))
      );
    } catch (err) {
      console.error("Suspend failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered =
    filter === "all" ? vendors : vendors.filter((v) => v.status === filter);

  return (
    <main className="avm-page">

      <header className="avm-header">
        <button
          onClick={() => setActivePage("admin-dashboard")}
          className="avm-back-btn"
        >
          ← Back to Dashboard
        </button>
        <h1 className="avm-title">Vendor Management</h1>
        <p className="avm-subtitle">Approve or suspend vendors on the platform</p>
      </header>

      <nav className="avm-tabs" aria-label="Filter vendors by status">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`avm-tab${filter === tab ? " active" : ""}`}
            aria-current={filter === tab ? "true" : undefined}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="avm-tab-count">
              {tab === "all"
                ? vendors.length
                : vendors.filter((v) => v.status === tab).length}
            </span>
          </button>
        ))}
      </nav>

      {error && (
        <p role="alert" className="avm-error">{error}</p>
      )}

      <section aria-label="Vendor list">
        {loading ? (
          <p className="avm-empty">Loading vendors...</p>
        ) : filtered.length === 0 ? (
          <p className="avm-empty">No vendors found.</p>
        ) : (
          <table className="avm-table">
            <thead>
              <tr>
                <th scope="col">Vendor Name</th>
                <th scope="col">Email</th>
                <th scope="col">Store</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vendor) => {
                const statusStyle =
                  statusColors[vendor.status] || statusColors.pending;
                return (
                  <tr key={vendor.id}>
                    <td>
                      <strong className="avm-vendor-name">
                        {vendor.businessName || "—"}
                      </strong>
                    </td>
                    <td>{vendor.email || "—"}</td>
                    <td>{vendor.businessName || "—"}</td>
                    <td>
                      <mark
                        className="avm-badge"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                        }}
                      >
                        {vendor.status
                          ? vendor.status.charAt(0).toUpperCase() +
                            vendor.status.slice(1)
                          : "Pending"}
                      </mark>
                    </td>
                    <td>
                      <menu className="avm-actions">
                        {vendor.status !== "approved" && (
                          <li>
                            <button
                              className="avm-btn avm-btn-approve"
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleApprove(vendor.id)}
                              aria-label={`Approve ${vendor.name}`}
                            >
                              {actionLoading === vendor.id ? "..." : "Approve"}
                            </button>
                          </li>
                        )}
                        {vendor.status !== "suspended" && (
                          <li>
                            <button
                              className="avm-btn avm-btn-suspend"
                              disabled={actionLoading === vendor.id}
                              onClick={() => handleSuspend(vendor.id)}
                              aria-label={`Suspend ${vendor.name}`}
                            >
                              {actionLoading === vendor.id ? "..." : "Suspend"}
                            </button>
                          </li>
                        )}
                      </menu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

    </main>
  );
}