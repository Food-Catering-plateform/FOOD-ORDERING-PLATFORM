import React, { useState, useRef, useEffect } from 'react';
import './Analytics.css';

const PERIODS = ['Today', 'This Week', 'This Month'];

const DATA = {
  'Today': {
    revenue: 1284.50,
    orders: 18,
    completed: 14,
    cancelled: 2,
    customers: 16,
    hourly: [
      { label: '8am',  value: 3 },
      { label: '9am',  value: 5 },
      { label: '10am', value: 2 },
      { label: '11am', value: 4 },
      { label: '12pm', value: 8 },
      { label: '1pm',  value: 7 },
      { label: '2pm',  value: 4 },
      { label: '3pm',  value: 3 },
      { label: '4pm',  value: 5 },
      { label: '5pm',  value: 6 },
    ],
    topItems: [
      { name: 'Grilled Chicken Burger', sold: 24, revenue: 2159.76 },
      { name: 'Beef Stew & Rice',       sold: 18, revenue: 1799.82 },
      { name: 'Cheese Fries',           sold: 15, revenue:  524.85 },
      { name: 'Veggie Wrap',            sold: 11, revenue:  769.89 },
      { name: 'Fresh Orange Juice',     sold: 9,  revenue:  269.91 },
    ],
  },
  'This Week': {
    revenue: 8942.00,
    orders: 126,
    completed: 109,
    cancelled: 10,
    customers: 98,
    hourly: [
      { label: 'Mon', value: 14 },
      { label: 'Tue', value: 18 },
      { label: 'Wed', value: 22 },
      { label: 'Thu', value: 19 },
      { label: 'Fri', value: 28 },
      { label: 'Sat', value: 35 },
      { label: 'Sun', value: 30 },
    ],
    topItems: [
      { name: 'Grilled Chicken Burger', sold: 98,  revenue: 8819.02 },
      { name: 'Beef Stew & Rice',       sold: 74,  revenue: 7399.26 },
      { name: 'Cheese Fries',           sold: 63,  revenue: 2204.37 },
      { name: 'Veggie Wrap',            sold: 51,  revenue: 3569.49 },
      { name: 'Fresh Orange Juice',     sold: 44,  revenue: 1319.56 },
    ],
  },
  'This Month': {
    revenue: 34210.75,
    orders: 512,
    completed: 468,
    cancelled: 28,
    customers: 389,
    hourly: [
      { label: 'Wk 1', value: 110 },
      { label: 'Wk 2', value: 128 },
      { label: 'Wk 3', value: 142 },
      { label: 'Wk 4', value: 132 },
    ],
    topItems: [
      { name: 'Grilled Chicken Burger', sold: 380, revenue: 34199.20 },
      { name: 'Beef Stew & Rice',       sold: 294, revenue: 29394.06 },
      { name: 'Cheese Fries',           sold: 241, revenue:  8430.59 },
      { name: 'Veggie Wrap',            sold: 198, revenue: 13860.02 },
      { name: 'Fresh Orange Juice',     sold: 167, revenue:  5006.33 },
    ],
  },
};

/* ── helpers ────────────────────────────────────────────────── */

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

async function downloadPDF(period, d) {
  const completionRate = Math.round((d.completed / d.orders) * 100);
  const maxBar = Math.max(...d.hourly.map(h => h.value));

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
  doc.text(
    `Period: ${period}   ·   Generated ${new Date().toLocaleString('en-ZA')}`,
    margin,
    50
  );

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
    { label: 'Revenue', value: `R ${d.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` },
    { label: 'Total Orders', value: String(d.orders) },
    { label: 'Completion Rate', value: `${completionRate}%` },
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

  const breakdownRows = [
    ['Completed', String(d.completed), `${Math.round((d.completed / d.orders) * 100)}%`],
    ['Cancelled',  String(d.cancelled), `${Math.round((d.cancelled / d.orders) * 100)}%`],
    ['Other', String(d.orders - d.completed - d.cancelled),
      `${Math.round(((d.orders - d.completed - d.cancelled) / d.orders) * 100)}%`],
  ];
  const bdColW = [contentW * 0.5, contentW * 0.25, contentW * 0.25];
  const rowH = 24;

  // Header row
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
  const barAreaW = contentW;
  const barCount = d.hourly.length;
  const barGap = 6;
  const barW = (barAreaW - barGap * (barCount - 1)) / barCount;

  d.hourly.forEach((h, i) => {
    const bx = margin + i * (barW + barGap);
    const fillH = Math.max(4, (h.value / maxBar) * (chartH - 20));
    const by = y + chartH - fillH - 14;

    // Track (background)
    doc.setFillColor(...LIGHT);
    doc.roundedRect(bx, y + 2, barW, chartH - 16, 2, 2, 'F');

    // Fill
    doc.setFillColor(...ORANGE);
    doc.roundedRect(bx, by, barW, fillH, 2, 2, 'F');

    // Label
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

  // Header
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

  d.topItems.forEach((item, ri) => {
    const itemRowH = 28;
    doc.setFillColor(ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255);
    doc.rect(margin, y, contentW, itemRowH, 'F');

    const cells = [
      `#${ri + 1}`,
      item.name,
      String(item.sold),
      `R ${item.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
    ];

    cells.forEach((cell, ci) => {
      const cx = margin + itemColW.slice(0, ci).reduce((a, b) => a + b, 0) + 8;
      if (ci === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ORANGE);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
      }
      doc.setFontSize(9);
      doc.text(cell, cx, y + 18);
    });

    // Mini bar in last column
    const barColX = margin + itemColW.slice(0, 4).reduce((a, b) => a + b, 0) + 8;
    const barColW2 = itemColW[4] - 16;
    const barFillW = (item.sold / maxSold) * barColW2;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(barColX, y + 10, barColW2, 6, 2, 2, 'F');
    doc.setFillColor(...ORANGE);
    doc.roundedRect(barColX, y + 10, barFillW, 6, 2, 2, 'F');

    y += itemRowH;
  });

  y += 28;

  // ── Footer ──
  doc.setFillColor(...DARK);
  doc.rect(0, pageH - 28, pageW, 28, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 180);
  doc.text('UniEats Vendor Analytics  ·  Confidential', margin, pageH - 10);
  doc.text(`Page 1 of 1`, pageW - margin - 40, pageH - 10);

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
  const [period, setPeriod] = useState('Today');
  const d = DATA[period];

  const maxBar = Math.max(...d.hourly.map(h => h.value));
  const maxSold = d.topItems[0]?.sold || 1;
  const completionRate = Math.round((d.completed / d.orders) * 100);

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
        </section>

      </section>
    </article>
  );
}

export default Analytics;