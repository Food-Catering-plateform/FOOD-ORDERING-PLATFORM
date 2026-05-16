import React, { useState, useEffect, useRef } from "react";
import "./styles.css";
import { auth, db } from "../../Firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";

//   Analytics helpers          

const PERIODS = ['Today', 'This Week', 'This Month'];

export function getPeriodStart(period) {
  const now = new Date();
  if (period === 'Today')      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'This Month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'This Week') {
    const day  = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  return new Date(0);
}

export function buildBarChart(orders, period) {
  if (period === 'Today') {
    const labels = ['7am','8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm'];
    const counts = new Array(labels.length).fill(0);
    orders.forEach(o => {
      const h = new Date(o.createdAt || o.time).getHours();
      if (h >= 7 && h <= 20) counts[h - 7]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  if (period === 'This Week') {
    const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const counts = new Array(7).fill(0);
    orders.forEach(o => {
      const day = new Date(o.createdAt || o.time).getDay();
      counts[day === 0 ? 6 : day - 1]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  if (period === 'This Month') {
    const labels = ['Wk 1','Wk 2','Wk 3','Wk 4'];
    const counts = new Array(4).fill(0);
    orders.forEach(o => {
      const date = new Date(o.createdAt || o.time).getDate();
      counts[Math.min(Math.floor((date - 1) / 7), 3)]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  return [];
}

export function buildVendorSales(orders) {
  const map = {};
  orders.forEach(o => {
    const vendorName = o.vendorName || 'Unknown Vendor';
    if (!map[vendorName]) map[vendorName] = { orders: 0, revenue: 0 };
    map[vendorName].orders++;
    map[vendorName].revenue += (o.total || 0);
  });
  return Object.entries(map)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function buildTopItems(orders) {
  const map = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      if (!map[item.name]) map[item.name] = { sold: 0, revenue: 0 };
      map[item.name].sold    += item.qty;
      map[item.name].revenue += item.qty * item.price;
    });
  });
  return Object.entries(map)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);
}

//   Export helpers          

function escapeCSV(val) {
  const str = String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

export function buildCSV(period, d) {
  const completionRate = d.orders > 0 ? Math.round((d.completed / d.orders) * 100) : 0;
  const rows = [];

  rows.push(['ADMIN ANALYTICS REPORT', period]);
  rows.push([]);
  rows.push(['SUMMARY']);
  rows.push(['Metric', 'Value']);
  rows.push(['Revenue', `R ${d.revenue.toFixed(2)}`]);
  rows.push(['Total Orders', d.orders]);
  rows.push(['Completed', d.completed]);
  rows.push(['Cancelled', d.cancelled]);
  rows.push(['Other', d.orders - d.completed - d.cancelled]);
  rows.push(['Completion Rate', `${completionRate}%`]);
  rows.push(['Customers Served', d.customers]);
  rows.push([]);
  rows.push(['ORDERS OVERVIEW']);
  rows.push(['Period', 'Orders']);
  d.hourly.forEach(h => rows.push([h.label, h.value]));
  rows.push([]);
  rows.push(['TOP SELLING ITEMS']);
  rows.push(['Rank', 'Item', 'Units Sold', 'Revenue (R)']);
  d.topItems.forEach((item, i) =>
    rows.push([`#${i + 1}`, item.name, item.sold, item.revenue.toFixed(2)])
  );
  rows.push([]);
  rows.push(['SALES PER VENDOR']);
  rows.push(['Vendor', 'Orders', 'Revenue (R)']);
  d.vendorSales.forEach(v =>
    rows.push([v.name, v.orders, v.revenue.toFixed(2)])
  );

  return rows.map(r => r.map(escapeCSV).join(',')).join('\r\n');
}

export function downloadCSV(period, d) {
  const csv = buildCSV(period, d);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin_analytics_${period.replace(/\s+/g, '_').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadReport(period, d) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const completionRate = d.orders > 0 ? Math.round((d.completed / d.orders) * 100) : 0;
  const maxHourly = Math.max(...d.hourly.map(h => h.value), 1);
  const maxSold   = d.topItems[0]?.sold || 1;
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = 50;

  const NAVY   = [30, 30, 47];
  const ORANGE = [249, 115, 22];
  const LIGHT  = [248, 248, 251];
  const GREY   = [200, 200, 200];

  const checkPage = (needed = 20) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 40;
    }
  };

  const sectionTitle = (text) => {
    checkPage(30);
    y += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ORANGE);
    doc.text(text.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentW, y);
    y += 12;
    doc.setTextColor(0, 0, 0);
  };

  const drawTable = (headers, rows, colWidths) => {
    const rowH = 20;
    const totalW = colWidths.reduce((a, b) => a + b, 0);

    checkPage(rowH + 4);
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, totalW, rowH, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    let cx = margin;
    headers.forEach((h, i) => {
      doc.text(h, cx + 6, y + 13);
      cx += colWidths[i];
    });
    y += rowH;

    doc.setFont('helvetica', 'normal');
    rows.forEach((row, ri) => {
      checkPage(rowH);
      doc.setFillColor(ri % 2 === 0 ? 255 : 248, ri % 2 === 0 ? 255 : 248, ri % 2 === 0 ? 255 : 251);
      doc.rect(margin, y, totalW, rowH, 'F');
      doc.setDrawColor(...GREY);
      doc.setLineWidth(0.3);
      doc.line(margin, y + rowH, margin + totalW, y + rowH);
      doc.setTextColor(30, 30, 47);
      cx = margin;
      row.forEach((cell, i) => {
        doc.text(String(cell), cx + 6, y + 13);
        cx += colWidths[i];
      });
      y += rowH;
    });
    y += 6;
  };

  //    Header   
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 38, 'F');
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Admin Analytics Report', margin, 25);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 200);
  doc.text(`Period: ${period}   ·   Generated: ${new Date().toLocaleString('en-ZA')}`, margin, 34);
  y = 60;

  //    Summary cards   
  sectionTitle('Summary');
  const cards = [
    ['Revenue', `R ${d.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
    ['Total Orders', String(d.orders)],
    ['Completion Rate', `${completionRate}%`],
    ['Customers Served', String(d.customers)],
  ];
  const cardW = contentW / 4 - 6;
  cards.forEach((card, i) => {
    const cx = margin + i * (cardW + 8);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(cx, y, cardW, 42, 4, 4, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(136, 136, 136);
    doc.text(card[0].toUpperCase(), cx + 8, y + 13);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(card[1], cx + 8, y + 32);
  });
  y += 56;

  //    Order breakdown   
  sectionTitle('Order Breakdown');
  drawTable(
    ['Status', 'Count'],
    [
      ['Completed', d.completed],
      ['Cancelled', d.cancelled],
      ['Other', d.orders - d.completed - d.cancelled],
    ],
    [contentW * 0.7, contentW * 0.3]
  );

  //    Orders overview bar chart   
  sectionTitle('Orders Overview (Peak Hours)');
  const chartH = 70;
  const barAreaW = contentW;
  const barW = Math.floor(barAreaW / d.hourly.length) - 2;
  d.hourly.forEach((h, i) => {
    const bh = h.value > 0 ? Math.max((h.value / maxHourly) * chartH, 3) : 0;
    const bx = margin + i * (barW + 2);
    const by = y + chartH - bh;
    doc.setFillColor(...NAVY);
    if (bh > 0) doc.rect(bx, by, barW, bh, 'F');
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(h.label, bx + barW / 2, y + chartH + 9, { align: 'center' });
    if (h.value > 0) {
      doc.setTextColor(...NAVY);
      doc.text(String(h.value), bx + barW / 2, by - 2, { align: 'center' });
    }
  });
  y += chartH + 20;

  //    Top selling items   
  sectionTitle('Top Selling Items');
  if (d.topItems.length === 0) {
    doc.setFontSize(9); doc.setTextColor(136, 136, 136);
    doc.text('No sales data yet.', margin, y); y += 20;
  } else {
    const barTrackW = contentW * 0.35;
    drawTable(
      ['#', 'Item', 'Sold', 'Revenue', 'Volume'],
      d.topItems.map((item, i) => [
        `#${i + 1}`,
        item.name.length > 28 ? item.name.slice(0, 26) + '…' : item.name,
        item.sold,
        `R ${item.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        '',
      ]),
      [28, contentW * 0.32, 36, 100, barTrackW]
    );
    const barColX = margin + 28 + contentW * 0.32 + 36 + 100;
    const rowStart = y - (d.topItems.length * 20) - 6;
    d.topItems.forEach((item, i) => {
      const ry = rowStart + i * 20 + 7;
      const fill = (item.sold / maxSold) * (barTrackW - 12);
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(barColX + 6, ry, barTrackW - 12, 7, 2, 2, 'F');
      if (fill > 0) {
        doc.setFillColor(...ORANGE);
        doc.roundedRect(barColX + 6, ry, fill, 7, 2, 2, 'F');
      }
    });
  }

  //    Sales per vendor   
  sectionTitle('Sales per Vendor');
  if (d.vendorSales.length === 0) {
    doc.setFontSize(9); doc.setTextColor(136, 136, 136);
    doc.text('No vendor data available.', margin, y); y += 20;
  } else {
    drawTable(
      ['Vendor', 'Orders', 'Revenue'],
      d.vendorSales.map(v => [
        v.name.length > 40 ? v.name.slice(0, 38) + '…' : v.name,
        v.orders,
        `R ${v.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      ]),
      [contentW * 0.55, contentW * 0.15, contentW * 0.3]
    );
  }

  //    Footer on every page   
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fY = doc.internal.pageSize.getHeight() - 18;
    doc.setDrawColor(...GREY);
    doc.setLineWidth(0.3);
    doc.line(margin, fY - 4, pageW - margin, fY - 4);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(170, 170, 170);
    doc.text('UniEats Admin Analytics · Confidential', margin, fY);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, fY, { align: 'right' });
  }

  doc.save(`admin_analytics_${period.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

//   ExportButton           

function ExportButton({ period, data }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '6px 11px',
          background: 'transparent',
          color: '#555',
          border: '1px solid #ddd',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
          <path d="M8 2v8M8 10l-2.5-2.5M8 10l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2.5 11.5v1A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Export
        <svg viewBox="0 0 10 10" fill="none" width="10" height="10"
          style={{ opacity: 0.5, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
          minWidth: '168px', background: '#fff', border: '1px solid #e8e8ee',
          borderRadius: '8px', boxShadow: '0 6px 20px rgba(0,0,0,0.09)',
          listStyle: 'none', padding: '4px', margin: 0,
          animation: 'dropIn 0.13s ease',
        }}>
          <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-4px);} to { opacity:1; transform:translateY(0);} }`}</style>
          <li>
            <button
              onClick={() => { downloadCSV(period, data); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
                padding: '8px 9px', background: 'none', border: 'none',
                borderRadius: '5px', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f8'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.05em', padding: '2px 5px', borderRadius: '4px', background: '#e6f9f0', color: '#16a34a', flexShrink: 0 }}>CSV</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#ffffff' }}>
                Spreadsheet <span style={{ fontSize: '11px', color: '#999' }}>.csv</span>
              </span>
            </button>
          </li>
          <li>
            <button
              onClick={() => { downloadReport(period, data); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
                padding: '8px 9px', background: 'none', border: 'none',
                borderRadius: '5px', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f8'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.05em', padding: '2px 5px', borderRadius: '4px', background: '#fff0e6', color: '#c2500a', flexShrink: 0 }}>PDF</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#ffffff' }}>
                Report <span style={{ fontSize: '11px', color: '#999' }}>.pdf</span>
              </span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

//    Analytics Section          

function AnalyticsSection() {
  const [period, setPeriod]   = useState('Today');
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const snap      = await getDocs(collection(db, 'Orders'));
        const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const result = {};
        for (const p of PERIODS) {
          const start        = getPeriodStart(p);
          const periodOrders = allOrders.filter(o => new Date(o.createdAt || o.time) >= start);
          const completed    = periodOrders.filter(o => o.status === 'completed');
          const cancelled    = periodOrders.filter(o => o.status === 'cancelled').length;
          const revenue      = completed.reduce((sum, o) => sum + (o.total || 0), 0);
          const customers    = new Set(completed.map(o => o.customerId)).size;

          result[p] = {
            revenue,
            orders:      periodOrders.length,
            completed:   completed.length,
            cancelled,
            customers,
            hourly:      buildBarChart(periodOrders, p),
            topItems:    buildTopItems(periodOrders),
            vendorSales: buildVendorSales(periodOrders),
          };
        }
        setData(result);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  if (loading || !data) return <p style={{ padding: '20px' }}>Loading analytics...</p>;

  const d              = data[period];
  const maxBar         = Math.max(...d.hourly.map(h => h.value), 1);
  const maxSold        = d.topItems[0]?.sold || 1;
  const completionRate = d.orders > 0 ? Math.round((d.completed / d.orders) * 100) : 0;

  return (
    <section>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                background: period === p ? '#1e1e2f' : '#fff',
                color: period === p ? '#fff' : '#333',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <ExportButton period={period} data={d} />
      </nav>

      <section className="cards" style={{ marginBottom: '24px' }}>
        <article>
          <h3>Revenue</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            R {d.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </p>
        </article>
        <article>
          <h3>Total Orders</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{d.orders}</p>
        </article>
        <article>
          <h3>Completion Rate</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{completionRate}%</p>
        </article>
        <article>
          <h3>Customers Served</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{d.customers}</p>
        </article>
      </section>

      <section className="cards">
        <article style={{ flex: 2, minWidth: '280px' }}>
          <h3>Orders Overview (Peak Hours)</h3>
          <ul style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px', listStyle: 'none', padding: 0, margin: 0 }}>
            {d.hourly.map((h, i) => (
              <li key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <b style={{ fontSize: '0.65rem', marginBottom: '2px', fontWeight: 'normal' }}>{h.value || ''}</b>
                <div
                  title={`${h.value} orders`}
                  style={{
                    width: '100%',
                    height: `${(h.value / maxBar) * 100}%`,
                    background: '#1e1e2f',
                    borderRadius: '4px 4px 0 0',
                    minHeight: h.value ? '4px' : '0',
                    display: 'block',
                  }}
                />
                <small style={{ fontSize: '0.6rem', marginTop: '4px', color: '#666' }}>{h.label}</small>
              </li>
            ))}
          </ul>
        </article>

        <article style={{ flex: 1, minWidth: '220px' }}>
          <h3>Top Selling Items</h3>
          {d.topItems.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>No sales data yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {d.topItems.map((item, i) => (
                <li key={i} style={{ marginBottom: '12px' }}>
                  <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', margin: '0 0 4px' }}>
                    <b>#{i + 1} {item.name}</b>
                    <small style={{ color: '#888' }}>{item.sold} sold</small>
                  </p>
                  <meter value={item.sold} max={maxSold} style={{ width: '100%', height: '6px', display: 'block' }} />
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section style={{ marginTop: '24px' }}>
        <article>
          <h3>Sales per Vendor</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '12px' }}>Vendor Name</th>
                <th style={{ padding: '12px' }}>Orders</th>
                <th style={{ padding: '12px' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {d.vendorSales.length === 0 ? (
                <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No vendor data available.</td></tr>
              ) : (
                d.vendorSales.map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{v.name}</td>
                    <td style={{ padding: '12px' }}>{v.orders}</td>
                    <td style={{ padding: '12px' }}>R {v.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </article>
      </section>
    </section>
  );
}

//  Main AdminDashboard 

const AdminDashboard = ({ setActivePage }) => {
  const [localPage, setLocalPage] = useState("dashboard");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActivePage("login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <section className="dashboard-container">
      <aside>
        <h2>Admin</h2>
        <nav aria-label="Admin navigation">
          <ul>
            <li><button onClick={() => setLocalPage("dashboard")}>Dashboard</button></li>
            <li><button onClick={() => {}}>Orders</button></li>
            <li><button onClick={() => setActivePage('admin-vendor-management')}>Vendors</button></li>
            <li><button onClick={() => {}}>Users</button></li>
            <li><button onClick={() => {}}>Payments</button></li>
            <li><button onClick={() => {}}>Settings</button></li>
            <li><button onClick={() => setLocalPage("analytics")}>Analytics</button></li>
            <li><button onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      </aside>

      <main>
        <header>
          <h1>{localPage === 'analytics' ? 'Analytics' : 'Dashboard'}</h1>
        </header>

        {localPage === 'analytics' ? (
          <AnalyticsSection />
        ) : (
          <>
            <section className="cards" aria-label="Summary statistics">
              <article>
                <h3>Total Orders</h3>
                <p>120</p>
              </article>
              <article>
                <h3>Revenue</h3>
                <p>R5,000</p>
              </article>
              <article>
                <h3>New Users</h3>
                <p>10</p>
              </article>
            </section>

            <section aria-labelledby="recent-orders-heading">
              <h2 id="recent-orders-heading">Recent Orders</h2>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Order ID</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>#001</td><td>John</td><td>Delivered</td></tr>
                  <tr><td>#002</td><td>Alice</td><td>Pending</td></tr>
                  <tr><td>#003</td><td>Mike</td><td>Cancelled</td></tr>
                </tbody>
              </table>
            </section>
          </>
        )}

        <footer>
          <small>© 2026 UniEats</small>
        </footer>
      </main>
    </section>
  );
};

export default AdminDashboard;