import React, { useState, useEffect, useRef } from "react";
import "./styles.css";
import { auth, db } from "../../Firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";


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
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1c23' }}>
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
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1c23' }}>
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



function OrdersSection() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'Orders'));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        all.sort((a, b) => new Date(b.createdAt || b.time || 0) - new Date(a.createdAt || a.time || 0));
        setOrders(all);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch_();
  }, []);

  if (loading) return <p style={{ padding: '24px' }}>Loading orders…</p>;

  const statusClass = s => {
    if (!s) return 'status-pending';
    const v = s.toLowerCase();
    if (v === 'completed' || v === 'delivered') return 'status-approved';
    if (v === 'cancelled') return 'status-suspended';
    return 'status-pending';
  };

  const FILTERS = ['all', 'pending', 'completed', 'cancelled'];
  const visible = filter === 'all' ? orders : orders.filter(o => (o.status || '').toLowerCase() === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter(o => !['completed','delivered','cancelled'].includes((o.status||'').toLowerCase())).length,
    completed: orders.filter(o => ['completed','delivered'].includes((o.status||'').toLowerCase())).length,
    cancelled: orders.filter(o => (o.status||'').toLowerCase() === 'cancelled').length,
  };

  return (
    <section>
      <nav style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 18px', borderRadius: '8px', border: '1.5px solid #E8E6E1',
            background: filter === f ? '#1A1C23' : '#fff',
            color: filter === f ? '#fff' : '#555',
            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} <span style={{ opacity: 0.6, fontSize: '0.78rem' }}>({counts[f]})</span>
          </button>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p style={{ color: '#888' }}>No orders found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Vendor</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(o => (
              <tr key={o.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#888' }}>#{o.id.slice(0, 8)}</td>
                <td>{o.customerName || o.customerId || '—'}</td>
                <td>{o.vendorName || '—'}</td>
                <td style={{ fontSize: '0.82rem', color: '#666' }}>
                  {(o.items || []).map(i => `${i.name} x${i.qty}`).join(', ') || '—'}
                </td>
                <td>R {(o.total || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td><span className={statusClass(o.status)}>{o.status || 'Unknown'}</span></td>
                <td style={{ color: '#888', fontSize: '0.82rem' }}>
                  {o.createdAt || o.time ? new Date(o.createdAt || o.time).toLocaleString('en-ZA') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function UsersSection() {
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('customers');

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        const [cSnap, vSnap] = await Promise.all([
          getDocs(collection(db, 'customers')),
          getDocs(collection(db, 'vendors')),
        ]);
        setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setVendors(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch_();
  }, []);

  if (loading) return <p style={{ padding: '24px' }}>Loading users…</p>;

  const list = tab === 'customers' ? customers : vendors;

  return (
    <section>
      <nav style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['customers', 'vendors'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 20px', borderRadius: '8px', border: '1.5px solid #E8E6E1',
            background: tab === t ? '#1A1C23' : '#fff',
            color: tab === t ? '#fff' : '#555',
            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)} <span style={{ opacity: 0.6, fontSize: '0.78rem' }}>
              ({tab === 'customers' ? customers.length : vendors.length})
            </span>
          </button>
        ))}
      </nav>

      {list.length === 0 ? (
        <p style={{ color: '#888' }}>No {tab} found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              {tab === 'vendors' && <th>Store</th>}
              <th>Joined</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map(u => (
              <tr key={u.id}>
                <td>{u.name || u.displayName || '—'}</td>
                <td style={{ color: '#555', fontSize: '0.88rem' }}>{u.email || '—'}</td>
                {tab === 'vendors' && <td>{u.storeName || u.businessName || '—'}</td>}
                <td style={{ color: '#888', fontSize: '0.82rem' }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-ZA') : '—'}
                </td>
                <td>
                  <span className={u.suspended ? 'status-suspended' : 'status-approved'}>
                    {u.suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function PaymentsSection() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      try {
        let all = [];
        try {
          const snap = await getDocs(collection(db, 'Payments'));
          all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (_) {}

        if (all.length === 0) {
          const snap = await getDocs(collection(db, 'Orders'));
          all = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(o => ['completed', 'delivered'].includes((o.status || '').toLowerCase()));
        }

        all.sort((a, b) => new Date(b.createdAt || b.time || b.paidAt || 0) - new Date(a.createdAt || a.time || a.paidAt || 0));
        setPayments(all);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch_();
  }, []);

  if (loading) return <p style={{ padding: '24px' }}>Loading payments…</p>;

  const total = payments.reduce((s, p) => s + (p.total || p.amount || 0), 0);

  return (
    <section>
      <section className="cards" style={{ marginBottom: '24px', padding: 0 }}>
        <article>
          <h3>Total Processed</h3>
          <p className="stat-value">R {total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
        </article>
        <article>
          <h3>Transactions</h3>
          <p className="stat-value">{payments.length}</p>
        </article>
        <article>
          <h3>Avg. Order Value</h3>
          <p className="stat-value">
            R {payments.length ? (total / payments.length).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '0.00'}
          </p>
        </article>
      </section>

      {payments.length === 0 ? (
        <p style={{ color: '#888' }}>No payments found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Customer</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#888' }}>#{p.id.slice(0, 8)}</td>
                <td>{p.customerName || p.customerId || '—'}</td>
                <td>{p.vendorName || '—'}</td>
                <td style={{ fontWeight: 600 }}>R {(p.total || p.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                <td style={{ color: '#555', fontSize: '0.85rem' }}>{p.paymentMethod || p.method || 'PayFast'}</td>
                <td style={{ color: '#888', fontSize: '0.82rem' }}>
                  {p.createdAt || p.time || p.paidAt
                    ? new Date(p.createdAt || p.time || p.paidAt).toLocaleString('en-ZA')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function SettingsSection() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    siteName: 'UniEats',
    supportEmail: 'support@unieats.co.za',
    orderNotifications: true,
    maintenanceMode: false,
    maxVendors: '',
    allowNewSignups: true,
  });

  const handleChange = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const handleSave = async () => {
    try {
      // Save to Firestore if desired — using localStorage as lightweight fallback
      localStorage.setItem('adminSettings', JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
  };

  const row = (label, desc, child) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0', borderBottom: '1px solid #F0EEE9' }}>
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem' }}>{label}</p>
        {desc && <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#888' }}>{desc}</p>}
      </div>
      {child}
    </div>
  );

  const toggle = (key) => (
    <button
      onClick={() => handleChange(key, !settings[key])}
      style={{
        width: '46px', height: '26px', borderRadius: '99px', border: 'none', cursor: 'pointer',
        background: settings[key] ? '#1A1C23' : '#ddd',
        position: 'relative', transition: 'background .2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: settings[key] ? '23px' : '3px',
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#fff', transition: 'left .2s', display: 'block',
      }} />
    </button>
  );

  return (
    <section>
      <article style={{ maxWidth: '600px' }}>
        <h3 style={{ marginTop: 0 }}>General</h3>
        {row('Platform Name', 'Displayed across the app',
          <input value={settings.siteName} onChange={e => handleChange('siteName', e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #E8E6E1', fontSize: '0.88rem', width: '180px' }} />
        )}
        {row('Support Email', 'Where user queries are sent',
          <input value={settings.supportEmail} onChange={e => handleChange('supportEmail', e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #E8E6E1', fontSize: '0.88rem', width: '220px' }} />
        )}
        {row('Max Vendors', 'Leave blank for unlimited',
          <input type="number" value={settings.maxVendors} onChange={e => handleChange('maxVendors', e.target.value)}
            placeholder="Unlimited"
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #E8E6E1', fontSize: '0.88rem', width: '120px' }} />
        )}

        <h3 style={{ marginTop: '28px' }}>Notifications & Access</h3>
        {row('Order Notifications', 'Send email alerts for new orders', toggle('orderNotifications'))}
        {row('Allow New Sign-ups', 'Let new customers & vendors register', toggle('allowNewSignups'))}
        {row('Maintenance Mode', 'Take the platform offline for users', toggle('maintenanceMode'))}

        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleSave} style={{
            padding: '10px 28px', background: '#1A1C23', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
          }}>
            Save Changes
          </button>
          {saved && <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.88rem' }}>✓ Saved</span>}
        </div>
      </article>
    </section>
  );
}



function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, revenue: 0, newUsers: 0 });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'Orders'));
        const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const completed = allOrders.filter(o => o.status === 'completed');
        const revenue = completed.reduce((sum, o) => sum + (o.total || 0), 0);

        // Sort by createdAt descending and take 10 most recent
        const sorted = [...allOrders].sort((a, b) => {
          const aTime = new Date(a.createdAt || a.time || 0).getTime();
          const bTime = new Date(b.createdAt || b.time || 0).getTime();
          return bTime - aTime;
        });

        setStats({
          totalOrders: allOrders.length,
          revenue,
          newUsers: new Set(allOrders.map(o => o.customerId).filter(Boolean)).size,
        });
        setRecentOrders(sorted.slice(0, 10));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  if (loading) return <p style={{ padding: '24px' }}>Loading dashboard…</p>;

  const statusClass = (status) => {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'delivered') return 'status-approved';
    if (s === 'cancelled') return 'status-suspended';
    return 'status-pending';
  };

  return (
    <>
      <section className="cards" aria-label="Summary statistics">
        <article>
          <h3>Total Orders</h3>
          <p className="stat-value">{stats.totalOrders}</p>
        </article>
        <article>
          <h3>Revenue</h3>
          <p className="stat-value">R {stats.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
        </article>
        <article>
          <h3>Unique Customers</h3>
          <p className="stat-value">{stats.newUsers}</p>
        </article>
      </section>

      <section aria-labelledby="recent-orders-heading" style={{ paddingTop: 0 }}>
        <h2 id="recent-orders-heading" className="section-title">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p style={{ color: '#888' }}>No orders found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Order ID</th>
                <th scope="col">Customer</th>
                <th scope="col">Vendor</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#888' }}>
                    #{order.id.slice(0, 8)}
                  </td>
                  <td>{order.customerName || order.customerId || '—'}</td>
                  <td>{order.vendorName || '—'}</td>
                  <td>R {(order.total || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={statusClass(order.status)}>
                      {order.status || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ color: '#888', fontSize: '0.85rem' }}>
                    {order.createdAt || order.time
                      ? new Date(order.createdAt || order.time).toLocaleDateString('en-ZA')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
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

  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    orders: 'Orders',
    vendors: 'Vendors',
    users: 'Users',
    payments: 'Payments',
    settings: 'Settings',
    analytics: 'Analytics',
  };

  const navBtn = (page, label) => (
    <li className={localPage === page ? 'active' : ''}>
      <button onClick={() => {
        if (page === 'vendors') { setActivePage('admin-vendor-management'); }
        else { setLocalPage(page); }
      }}>{label}</button>
    </li>
  );

  const renderPage = () => {
    switch (localPage) {
      case 'orders':    return <OrdersSection />;
      case 'users':     return <UsersSection />;
      case 'payments':  return <PaymentsSection />;
      case 'settings':  return <SettingsSection />;
      case 'analytics': return <AnalyticsSection />;
      default:          return <DashboardOverview />;
    }
  };

  return (
    <section className="dashboard-container">
      <aside>
        <h2>Admin</h2>
        <nav aria-label="Admin navigation">
          <ul>
            {navBtn('dashboard', 'Dashboard')}
            {navBtn('orders', 'Orders')}
            {navBtn('vendors', 'Vendors')}
            {navBtn('users', 'Users')}
            {navBtn('payments', 'Payments')}
            {navBtn('settings', 'Settings')}
            {navBtn('analytics', 'Analytics')}
            <li><button onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      </aside>

      <main>
        <header>
          <h1>{PAGE_TITLES[localPage] || 'Dashboard'}</h1>
        </header>

        {renderPage()}

        <footer>
          <small>© 2026 UniEats</small>
        </footer>
      </main>
    </section>
  );
};

export default AdminDashboard;