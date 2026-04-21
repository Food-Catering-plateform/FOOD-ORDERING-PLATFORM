import React, { useState, useEffect } from "react";
import {
  fetchAllVendors, approveVendor, suspendVendor,
  fetchAllAdmins,  approveAdmin,  suspendAdmin,
} from "../../Services/vendorService";
import "./AdminVendorManagement.css";

const STATUS_FILTERS = ["all", "pending", "approved", "suspended"];

const statusColors = {
  pending:   { bg: "#FFF8E1", color: "#F59E0B" },
  approved:  { bg: "#E8F5E9", color: "#22C55E" },
  suspended: { bg: "#FEECEC", color: "#EF4444" },
};

export default function AdminVendorManagement({ setActivePage }) {
  const [activeTab, setActiveTab]         = useState("vendors");
  const [vendors, setVendors]             = useState([]);
  const [admins, setAdmins]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter]               = useState("all");
  const [error, setError]                 = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vendorData, adminData] = await Promise.all([
        fetchAllVendors(),
        fetchAllAdmins(),
      ]);
      setVendors(vendorData);
      setAdmins(adminData);
    } catch (err) {
      setError("Failed to load data. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      if (activeTab === "vendors") {
        await approveVendor(id);
        setVendors((prev) => prev.map((v) => v.id === id ? { ...v, status: "approved" } : v));
      } else {
        await approveAdmin(id);
        setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, status: "approved" } : a));
      }
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (id) => {
    setActionLoading(id);
    try {
      if (activeTab === "vendors") {
        await suspendVendor(id);
        setVendors((prev) => prev.map((v) => v.id === id ? { ...v, status: "suspended" } : v));
      } else {
        await suspendAdmin(id);
        setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, status: "suspended" } : a));
      }
    } catch (err) {
      console.error("Suspend failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const currentData = activeTab === "vendors" ? vendors : admins;
  const filtered = filter === "all" ? currentData : currentData.filter((v) => v.status === filter);

  const renderTable = () => (
    <table className="avm-table">
      <thead>
        <tr>
          <th scope="col">{activeTab === "vendors" ? "Business Name" : "Name"}</th>
          <th scope="col">Email</th>
          <th scope="col">Status</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((item) => {
          const statusStyle = statusColors[item.status] || statusColors.pending;
          return (
            <tr key={item.id}>
              <td>
                <strong className="avm-vendor-name">
                  {activeTab === "vendors"
                    ? (item.businessName || "—")
                    : (`${item.name || ""} ${item.lastName || ""}`.trim() || "—")}
                </strong>
              </td>
              <td>{item.email || "—"}</td>
              <td>
                <mark
                  className="avm-badge"
                  style={{ background: statusStyle.bg, color: statusStyle.color }}
                >
                  {item.status
                    ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                    : "Pending"}
                </mark>
              </td>
              <td>
                <menu className="avm-actions">
                  {item.status !== "approved" && (
                    <li>
                      <button
                        className="avm-btn avm-btn-approve"
                        disabled={actionLoading === item.id}
                        onClick={() => handleApprove(item.id)}
                        aria-label={`Approve ${item.email}`}
                      >
                        {actionLoading === item.id ? "..." : "Approve"}
                      </button>
                    </li>
                  )}
                  {item.status !== "suspended" && (
                    <li>
                      <button
                        className="avm-btn avm-btn-suspend"
                        disabled={actionLoading === item.id}
                        onClick={() => handleSuspend(item.id)}
                        aria-label={`Suspend ${item.email}`}
                      >
                        {actionLoading === item.id ? "..." : "Suspend"}
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
  );

  return (
    <main className="avm-page">

      <header className="avm-header">
        <button onClick={() => setActivePage("admin-dashboard")} className="avm-back-btn">
          ← Back to Dashboard
        </button>
        <h1 className="avm-title">User Management</h1>
        <p className="avm-subtitle">Approve or suspend vendors and admins on the platform</p>
      </header>

      {/* Vendors / Admins tabs */}
      <nav className="avm-type-tabs" aria-label="Switch between vendors and admins">
        <button
          className={`avm-type-tab${activeTab === "vendors" ? " active" : ""}`}
          onClick={() => { setActiveTab("vendors"); setFilter("all"); }}
        >
          Vendors
          <span className="avm-tab-count">{vendors.length}</span>
        </button>
        <button
          className={`avm-type-tab${activeTab === "admins" ? " active" : ""}`}
          onClick={() => { setActiveTab("admins"); setFilter("all"); }}
        >
          Admin Requests
          <span className="avm-tab-count">{admins.length}</span>
        </button>
      </nav>

      {/* Status filter tabs */}
      <nav className="avm-tabs" aria-label="Filter by status">
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
                ? currentData.length
                : currentData.filter((v) => v.status === tab).length}
            </span>
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="avm-error">{error}</p>}

      <section aria-label={activeTab === "vendors" ? "Vendor list" : "Admin requests list"}>
        {loading ? (
          <p className="avm-empty">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="avm-empty">No {activeTab === "vendors" ? "vendors" : "admin requests"} found.</p>
        ) : (
          renderTable()
        )}
      </section>

    </main>
  );
}