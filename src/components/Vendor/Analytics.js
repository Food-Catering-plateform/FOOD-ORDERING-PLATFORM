import React, { useState, useEffect, useRef } from 'react';
import './Analytics.css';
import { db } from '../../Firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../Services/AuthContext';

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
// Today → one bar per hour (8am–5pm)
// This Week → one bar per day (Mon–Sun)
// This Month → one bar per week (Wk 1–4)
function buildBarChart(orders, period) {
  if (period === 'Today') {
    const labels = ['8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm'];
    const counts = new Array(10).fill(0);
    orders.forEach(o => {
      const h = new Date(o.createdAt || o.time).getHours();
      if (h >= 8 && h <= 17) counts[h - 8]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  if (period === 'This Week') {
    const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const counts = new Array(7).fill(0);
    orders.forEach(o => {
      const day = new Date(o.createdAt || o.time).getDay(); // 0=Sun
      // shift so Mon=0, Sun=6
      counts[day === 0 ? 6 : day - 1]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  if (period === 'This Month') {
    const labels = ['Wk 1','Wk 2','Wk 3','Wk 4'];
    const counts = new Array(4).fill(0);
    orders.forEach(o => {
      const date = new Date(o.createdAt || o.time).getDate();
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

/* ── CSV export ─────────────────────────────────────────────── */

function escapeCSV(val) {
  const str = String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function buildCSV(period, d) {
  const completionRate = d.orders > 0 ? Math.round((d.completed / d.orders) * 100) : 0;
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

/* ── PDF export ─────────────────────────────────────────────── */

async function downloadPDF(period, d) {
  const completionRate = d.orders > 0 ? Math.round((d.completed / d.orders) * 100) : 0;
  const maxBar = Math.max(...d.hourly.map(h => h.value), 1);

  // Dynamically load jsPDF from CDN if not already loaded
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ORANGE = [249, 115, 22];
  const DARK   = [26, 26, 46];
  const GRAY   = [136, 136, 136];
  const LIGHT  = [245, 246, 250];
  const WHITE  = [255, 255, 255];

  // ── Header bar ──
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 56, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text('Analytics Report', margin, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 200);
  doc.text(`Period: ${period}   ·   Generated ${new Date().toLocaleString('en-ZA')}`, margin, 50);

  y = 80;

  // ── Section heading helper ──
  function sectionHeading(label) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...ORANGE);
    doc.text(label.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentW, y);
    y += 12;
  }

  // ── Summary stat cards ──
  sectionHeading('Summary');

  const cardW = (contentW - 12) / 4;
  const cardH = 52;
  const cards = [
    { label: 'Revenue',          value: `R ${d.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` },
    { label: 'Total Orders',     value: String(d.orders) },
    { label: 'Completion Rate',  value: `${completionRate}%` },
    { label: 'Customers Served', value: String(d.customers) },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 4);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, cardW, cardH, 4, 4, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(card.label, x + 10, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...DARK);
    doc.text(card.value, x + 10, y + 38);
  });

  y += cardH + 24;

  // ── Order breakdown table ──
  sectionHeading('Order Breakdown');

  const rowH = 24;
  const bdColW = [contentW * 0.5, contentW * 0.25, contentW * 0.25];
  const breakdownRows = [
    ['Completed', String(d.completed), `${d.orders > 0 ? Math.round((d.completed / d.orders) * 100) : 0}%`],
    ['Cancelled',  String(d.cancelled), `${d.orders > 0 ? Math.round((d.cancelled / d.orders) * 100) : 0}%`],
    ['Other', String(d.orders - d.completed - d.cancelled),
      `${d.orders > 0 ? Math.round(((d.orders - d.completed - d.cancelled) / d.orders) * 100) : 0}%`],
  ];

  doc.setFillColor(...DARK);
  doc.rect(margin, y, contentW, rowH, 'F');
  ['Status', 'Count', 'Share'].forEach((h, i) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text(h, margin + bdColW.slice(0, i).reduce((a, b) => a + b, 0) + 10, y + 16);
  });
  y += rowH;

  breakdownRows.forEach((row, ri) => {
    doc.setFillColor(ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255);
    doc.rect(margin, y, contentW, rowH, 'F');
    row.forEach((cell, ci) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(cell, margin + bdColW.slice(0, ci).reduce((a, b) => a + b, 0) + 10, y + 16);
    });
    y += rowH;
  });

  y += 24;

  // ── Orders overview bar chart ──
  sectionHeading('Orders Overview');

  const chartH = 90;
  const barCount = d.hourly.length;
  const barGap = 6;
  const barW = (contentW - barGap * (barCount - 1)) / barCount;

  d.hourly.forEach((h, i) => {
    const bx = margin + i * (barW + barGap);
    const fillH = Math.max(4, (h.value / maxBar) * (chartH - 20));
    const by = y + chartH - fillH - 14;

    doc.setFillColor(...LIGHT);
    doc.roundedRect(bx, y + 2, barW, chartH - 16, 2, 2, 'F');
    doc.setFillColor(...ORANGE);
    doc.roundedRect(bx, by, barW, fillH, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    const labelX = bx + barW / 2 - doc.getTextWidth(h.label) / 2;
    doc.text(h.label, labelX, y + chartH - 2);
  });

  y += chartH + 24;

  // ── Top selling items ──
  sectionHeading('Top Selling Items');

  const itemColW = [contentW * 0.05, contentW * 0.42, contentW * 0.15, contentW * 0.18, contentW * 0.20];
  const itemHeaders = ['#', 'Item', 'Units Sold', 'Revenue', 'Share'];

  doc.setFillColor(...DARK);
  doc.rect(margin, y, contentW, rowH, 'F');
  itemHeaders.forEach((h, i) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text(h, margin + itemColW.slice(0, i).reduce((a, b) => a + b, 0) + 8, y + 16);
  });
  y += rowH;

  const maxSold = d.topItems[0]?.sold || 1;

  if (d.topItems.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('No sales data yet for this period.', margin + 8, y + 16);
    y += rowH;
  } else {
    d.topItems.forEach((item, ri) => {
      const itemRowH = 28;
      doc.setFillColor(ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255);
      doc.rect(margin, y, contentW, itemRowH, 'F');

      [
        `#${ri + 1}`,
        item.name,
        String(item.sold),
        `R ${item.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      ].forEach((cell, ci) => {
        const cx = margin + itemColW.slice(0, ci).reduce((a, b) => a + b, 0) + 8;
        doc.setFont('helvetica', ci === 0 ? 'bold' : 'normal');
        doc.setTextColor(...(ci === 0 ? ORANGE : DARK));
        doc.setFontSize(9);
        doc.text(cell, cx, y + 18);
      });

      // Mini progress bar in last column
      const barColX  = margin + itemColW.slice(0, 4).reduce((a, b) => a + b, 0) + 8;
      const barColW2 = itemColW[4] - 16;
      doc.setFillColor(...LIGHT);
      doc.roundedRect(barColX, y + 10, barColW2, 6, 2, 2, 'F');
      doc.setFillColor(...ORANGE);
      doc.roundedRect(barColX, y + 10, (item.sold / maxSold) * barColW2, 6, 2, 2, 'F');

      y += itemRowH;
    });
  }

  // ── Footer ──
  doc.setFillColor(...DARK);
  doc.rect(0, pageH - 28, pageW, 28, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 180);
  doc.text('UniEats Vendor Analytics  ·  Confidential', margin, pageH - 10);
  doc.text('Page 1 of 1', pageW - margin - 40, pageH - 10);

  doc.save(`analytics_${period.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

/* ── ExportButton ───────────────────────────────────────────── */

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

/* ── Analytics ──────────────────────────────────────────────── */

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
        const periodOrders = allOrders.filter(o => new Date(o.createdAt || o.time) >= start);

        const completed = periodOrders.filter(o => o.status === 'completed');
        const cancelled = periodOrders.filter(o => o.status === 'cancelled').length;
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