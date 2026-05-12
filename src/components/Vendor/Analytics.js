import React, { useState, useRef, useEffect } from 'react';
import './Analytics.css';

import { db } from '../../Firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../Services/AuthContext';

// FIX: Added a helper to handle Firebase Timestamps so dates don't return "Invalid Date"
const safeDate = (val) => {
  if (!val) return new Date(0);
  return val.toDate ? val.toDate() : new Date(val);
};

//EXPORT

// helpers

function escapeCSV(val) {
  const str = String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function buildCSV(period, d) {
  const completionRate = Math.round((d.completed / d.orders) * 100);
  const rows = [];

  rows.push(['ANALYTICS REPORT', period]);
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

  return rows.map(r => r.map(escapeCSV).join(',')).join('\r\n');
}

function downloadCSV(period, d) {
  const csv = buildCSV(period, d);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics_${period.replace(/\s+/g, '_').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s );
  });
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s );
  });
  return window.jspdf.jsPDF;
}

async function downloadPDF(period, d) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const completionRate = Math.round((d.completed / d.orders) * 100);

  const orange = [249, 115, 22];
  const dark   = [26,  26,  46];
  const gray   = [120, 120, 140];

  // Header
  doc.setFillColor(...dark);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14).setFont(undefined, 'bold');
  doc.text('Analytics Report', 14, 14);
  doc.setFontSize(9).setFont(undefined, 'normal');
  doc.setTextColor(...[200, 200, 220]);
  doc.text(`Period: ${period}   ·   Generated ${new Date().toLocaleString('en-ZA')}`, 14, 19);

  let y = 32;

  // Summary cards
  doc.setTextColor(...orange);
  doc.setFontSize(8).setFont(undefined, 'bold');
  doc.text('SUMMARY', 14, y); y += 4;

  const stats = [
    ['Revenue', `R ${d.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
    ['Total Orders', String(d.orders)],
    ['Completion Rate', `${completionRate}%`],
    ['Customers Served', String(d.customers)],
  ];
  const cardW = 43, cardH = 18, gap = 4, startX = 14;
  stats.forEach(([label, value], i) => {
    const x = startX + i * (cardW + gap);
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');
    doc.setTextColor(...gray).setFontSize(7).setFont(undefined, 'normal');
    doc.text(label.toUpperCase(), x + 4, y + 6);
    doc.setTextColor(...dark).setFontSize(12).setFont(undefined, 'bold');
    doc.text(value, x + 4, y + 14);
  });
  y += cardH + 8;

  // Order Breakdown
  doc.setTextColor(...orange).setFontSize(8).setFont(undefined, 'bold');
  doc.text('ORDER BREAKDOWN', 14, y); y += 2;

  doc.autoTable({
    startY: y,
    head: [['Status', 'Count']],
    body: [
      ['Completed', d.completed],
      ['Cancelled', d.cancelled],
      ['Other',     d.orders - d.completed - d.cancelled],
    ],
    headStyles:   { fillColor: dark, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles:   { fontSize: 9, textColor: dark },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    margin: { left: 14, right: 14 },
    tableWidth: 80,
  });
  y = doc.lastAutoTable.finalY + 8;

  // Orders Overview
  doc.setTextColor(...orange).setFontSize(8).setFont(undefined, 'bold');
  doc.text('ORDERS OVERVIEW', 14, y); y += 2;

  const maxVal = Math.max(...d.hourly.map(h => h.value));
  doc.autoTable({
    startY: y,
    head: [['Period', 'Orders', 'Volume']],
    body: d.hourly.map(h => [h.label, h.value, '']),
    headStyles: { fillColor: dark, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: dark },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 2: { cellWidth: 80 } },
    margin: { left: 14, right: 14 },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 2) {
        const h = d.hourly[data.row.index];
        const pct = h.value / maxVal;
        const bx = data.cell.x + 2, by = data.cell.y + data.cell.height / 2 - 2;
        const bw = (data.cell.width - 4) * pct;
        doc.setFillColor(230, 230, 235);
        doc.roundedRect(data.cell.x + 2, by, data.cell.width - 4, 4, 1, 1, 'F');
        if (bw > 0) {
          doc.setFillColor(...orange);
          doc.roundedRect(bx, by, bw, 4, 1, 1, 'F');
        }
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Top Selling Items
  doc.setTextColor(...orange).setFontSize(8).setFont(undefined, 'bold');
  doc.text('TOP SELLING ITEMS', 14, y); y += 2;

  doc.autoTable({
    startY: y,
    head: [['#', 'Item', 'Units Sold', 'Revenue']],
    body: d.topItems.map((item, i) => [
      `#${i + 1}`,
      item.name,
      item.sold,
      `R ${item.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
    ]),
    headStyles: { fillColor: dark, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: dark },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 12 }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...[220, 220, 230]);
  doc.line(14, pageH - 12, 196, pageH - 12);
  doc.setTextColor(...gray).setFontSize(8).setFont(undefined, 'normal');
  doc.text('UniEats Vendor Analytics  ·  Confidential', 14, pageH - 7);

  doc.save(`analytics_${period.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

// ExportButton

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
    <div className="export-wrapper" ref={ref}>
      <button
        className="export-btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="13" height="13">
          <path d="M8 2v8M8 10l-2.5-2.5M8 10l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2.5 11.5v1A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Export
        <svg viewBox="0 0 10 10" fill="none" aria-hidden="true" width="10" height="10" className={`export-caret ${open ? 'open' : ''}`}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <ul className="export-dropdown" role="menu">
          <li role="menuitem">
            <button className="export-option" onClick={() => { downloadCSV(period, data); setOpen(false); }}>
              <span className="export-badge export-badge--csv">CSV</span>
              <span className="export-label">Spreadsheet <em>.csv</em></span>
            </button>
          </li>
          <li role="menuitem">
            <button className="export-option" onClick={() => { downloadPDF(period, data); setOpen(false); }}>
              <span className="export-badge export-badge--pdf">PDF</span>
              <span className="export-label">Report <em>.pdf</em></span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

// ANALYTICS

const PERIODS = ['Today', 'This Week', 'This Month'];
// returns the Date object representing the start of the selected period
// used to filter orders that fall within Today / This Week / This Month
function getPeriodStart(period) {
  const now = new Date();
  if (period === 'Today')      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'This Month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'This Week') {
    // week starts on Monday — getDay() returns 0=Sun so we shift accordingly
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
}

// builds the bar chart data depending on the period:
// Today -one bar per hour 
// This Week -one bar per day (Mon–Sun)
// This Month one bar per week (Wk 1–4)
function buildBarChart(orders, period) {
  if (period === 'Today') {
    const labels = ['8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm'];
    const counts = new Array(10).fill(0);
    orders.forEach(o => {
      // FIX: Used safeDate() to handle Firebase timestamps
      const h = safeDate(o.createdAt || o.time).getHours();
      if (h >= 8 && h <= 17) counts[h - 8]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  if (period === 'This Week') {
    const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const counts = new Array(7).fill(0);
    orders.forEach(o => {
      // FIX: Used safeDate() to handle Firebase timestamps
      const day = safeDate(o.createdAt || o.time).getDay(); // 0=Sun
      // shift so Mon=0, Sun=6
      counts[day === 0 ? 6 : day - 1]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  if (period === 'This Month') {
    const labels = ['Wk 1','Wk 2','Wk 3','Wk 4'];
    const counts = new Array(4).fill(0);
    orders.forEach(o => {
      // FIX: Used safeDate() to handle Firebase timestamps
      const date = safeDate(o.createdAt || o.time).getDate();
      // clamp to 3 so dates in the 29th–31st still fall into Wk 4
      counts[Math.min(Math.floor((date - 1) / 7), 3)]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  return [];
}


// aggregates all items sold across orders in the period and returns top 5 by qty sold
function buildTopItems(orders) {
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

function Analytics() {
  const { vendorId } = useAuth();
  const [period, setPeriod]   = useState('Today');
  const [loading, setLoading] = useState(true);
  // data holds computed stats for all three periods so switching tabs is instant (no re-fetch)
  const [data, setData]       = useState(null);

  useEffect(() => {
    if (!vendorId) return;

    const fetchAnalytics = async () => {
      setLoading(true);

      // fetch ALL orders for this vendor once, then slice by period in JS
      // avoids making 3 separate Firestore queries every time the tab changes
      const snap = await getDocs(
        query(collection(db, 'Orders'), where('vendorID', '==', vendorId))
      );
      const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const result = {};
      for (const p of PERIODS) {
        const start        = getPeriodStart(p);
        // filter to only orders that started on or after the period start
        // FIX: Used safeDate() to handle Firebase timestamps
        const periodOrders = allOrders.filter(o => safeDate(o.createdAt || o.time) >= start);

        // FIX: Added .toLowerCase() to status checks to handle "Completed" vs "completed"
        const completed = periodOrders.filter(o => o.status?.toLowerCase() === 'completed');
        const cancelled = periodOrders.filter(o => o.status?.toLowerCase() === 'cancelled').length;
        // revenue only counts completed orders — pending/cancelled don't count as earned
        const revenue   = completed.reduce((sum, o) => sum + (o.total || 0), 0);
        // unique customers = unique customerIds on completed orders (Set removes duplicates)
        const customers = new Set(completed.map(o => o.customerId)).size;

        result[p] = {
          revenue,
          orders:    periodOrders.length,
          completed: completed.length,
          cancelled,
          customers,
          hourly:    buildBarChart(periodOrders, p),
          topItems:  buildTopItems(periodOrders),
        };
      }

      setData(result);
      setLoading(false);
    };

    fetchAnalytics();
  }, [vendorId]);

  if (loading || !data) {
    return <article className="analytics"><p style={{ padding: '20px' }}>Loading analytics...</p></article>;
  }

  const d              = data[period];
  // guard against dividing by zero when there are no orders yet
  const maxBar         = Math.max(...d.hourly.map(h => h.value), 1);
  const maxSold        = d.topItems[0]?.sold || 1;
  const completionRate = d.orders > 0 ? Math.round((d.completed / d.orders) * 100) : 0;

  return (
    <article className="analytics">

      <header className="analytics__header">
        <h1>Analytics</h1>
        <div className="analytics__header-right">
          <nav className="period-tabs">
            {PERIODS.map(p => (
              <button
                key={p}
                className={`period-tab ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </nav>
          <ExportButton period={period} data={d} />
        </div>
      </header>

      <section className="analytics__stats">
        <article className="stat-card">
          <p className="stat-card__label">Revenue</p>
          <h2 className="stat-card__value">R {d.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</h2>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Total Orders</p>
          <h2 className="stat-card__value">{d.orders}</h2>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Completion Rate</p>
          <h2 className="stat-card__value">{completionRate}%</h2>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Customers Served</p>
          <h2 className="stat-card__value">{d.customers}</h2>
        </article>
      </section>

      <section className="analytics__bottom">

        <section className="analytics__card analytics__card--chart">
          <h2>Orders Overview</h2>
          <ul className="bar-chart">
            {d.hourly.map((h, i) => (
              <li key={i} className="bar-col">
                <figure className="bar-track">
                  <b
                    className="bar-fill"
                    style={{ height: `${(h.value / maxBar) * 100}%` }}
                    title={`${h.value} orders`}
                  />
                </figure>
                <small className="bar-label">{h.label}</small>
                <output className="bar-value">{h.value}</output>
              </li>
            ))}
          </ul>

          <ul className="orders-breakdown">
            <li className="breakdown-item breakdown-item--completed">
              <i className="dot" /> Completed: {d.completed}
            </li>
            <li className="breakdown-item breakdown-item--cancelled">
              <i className="dot" /> Cancelled: {d.cancelled}
            </li>
            <li className="breakdown-item breakdown-item--pending">
              <i className="dot" /> Other: {d.orders - d.completed - d.cancelled}
            </li>
          </ul>
        </section>

        <section className="analytics__card analytics__card--items">
          <h2>Top Selling Items</h2>
          {d.topItems.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>No sales data yet for this period.</p>
          ) : (
            <ul className="top-items">
              {d.topItems.map((item, i) => (
                <li key={i} className="top-item">
                  <header className="top-item__info">
                    <b className="top-item__rank">#{i + 1}</b>
                    <strong className="top-item__name">{item.name}</strong>
                  </header>
                  <figure className="top-item__bar-wrap">
                    <b
                      className="top-item__bar"
                      style={{ width: `${(item.sold / maxSold) * 100}%` }}
                    />
                  </figure>
                  <footer className="top-item__meta">
                    <data value={item.sold}>{item.sold} sold</data>
                    <data value={item.revenue.toFixed(2)}>R {item.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</data>
                  </footer>
                </li>
              ))}
            </ul>
          )}
        </section>

      </section>
    </article>
  );
}

export default Analytics;
