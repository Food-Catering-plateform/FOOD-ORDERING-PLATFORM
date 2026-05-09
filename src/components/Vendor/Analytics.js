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
    document.head.appendChild(s);
  });
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
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

// Analytics

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