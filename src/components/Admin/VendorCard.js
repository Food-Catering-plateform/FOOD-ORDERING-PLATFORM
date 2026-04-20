import React from "react";

const statusColors = {
  pending:   { bg: "#FFF8E1", color: "#F59E0B" },
  approved:  { bg: "#E8F5E9", color: "#22C55E" },
  suspended: { bg: "#FEECEC", color: "#EF4444" },
};

export default function VendorCard({ vendor, onApprove, onSuspend, isLoading }) {
  const statusStyle = statusColors[vendor.status] || statusColors.pending;

  return (
    <article className="vendor-card">
      <section className="vendor-card-info">
        <h3>{vendor.name || "Unnamed Vendor"}</h3>
        <p>{vendor.email || "No email"}</p>
        <p>Store: {vendor.storeName || "N/A"}</p>
        <mark
          style={{
            background: statusStyle.bg,
            color: statusStyle.color,
            padding: "2px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {vendor.status
            ? vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)
            : "Pending"}
        </mark>
      </section>

      <menu className="vendor-card-actions">
        {vendor.status !== "approved" && (
          <li>
            <button
              onClick={() => onApprove(vendor.id)}
              disabled={isLoading}
              className="avm-btn avm-btn-approve"
            >
              {isLoading ? "..." : "Approve"}
            </button>
          </li>
        )}
        {vendor.status !== "suspended" && (
          <li>
            <button
              onClick={() => onSuspend(vendor.id)}
              disabled={isLoading}
              className="avm-btn avm-btn-suspend"
            >
              {isLoading ? "..." : "Suspend"}
            </button>
          </li>
        )}
      </menu>
    </article>
  );
}