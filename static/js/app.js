// Basic app logic for static dashboard
function qs(sel) { return document.querySelector(sel) }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)) }

// Global reference so the Gantt chart can be re-rendered when the page is shown
let _forecastRender = null;

function showPage(name) {
  qsa('.page').forEach(p => p.classList.add('d-none'));
  const el = qs(`#${CSS.escape(name)}`);
  if (el) el.classList.remove('d-none');
  // Update header to show active section
  const header = qs('#header-title') || qs('.header-title');
  if (header) header.textContent = name;
  // If showing Forecast, re-render Gantt chart now that the container is visible
  if (name === 'Forecast' && _forecastRender) {
    setTimeout(() => { _forecastRender(); }, 60);
  }
}

// Navigation links
qsa('a[data-page]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    qsa('a[data-page]').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    showPage(a.dataset.page);
  });
});

// Dropdown toggle behavior for right-nav
const navToggle = qs('#nav-dropdown-toggle');
const navMenu = qs('#nav-dropdown-menu');
if (navToggle && navMenu) {
  navToggle.addEventListener('click', e => {
    e.stopPropagation();
    navMenu.classList.toggle('show');
    navToggle.classList.toggle('open');
  });
  // Close when clicking outside
  document.addEventListener('click', () => { navMenu.classList.remove('show'); navToggle.classList.remove('open'); });
  // Close on menu item click
  navMenu.addEventListener('click', e => {
    const target = e.target.closest('a[data-page]');
    if (target) { navMenu.classList.remove('show'); navToggle.classList.remove('open'); }
  });
}

// Initialize overview metrics and charts
function initOverview() {
  const total = machines.length;
  const critical = machines.filter(m => m.status === 'Critical').length;
  const highRisk = machines.filter(m => m.failure_probability > 0.5).length;
  const netSavings = '$47,000';
  qs('#total-machines-val').innerText = total;
  qs('#critical-machines-val').innerText = critical;
  qs('#net-savings-val').innerText = netSavings;
  qs('#high-risk-val').innerText = highRisk;

  // Critical machines table
  const criticalMachines = machines.filter(m => m.status === 'Critical');
  const tbody = qs('#critical-machines-tbody');
  const badge = qs('#critical-count-badge');
  const emptyMsg = qs('#critical-empty-msg');
  const tableEl = qs('#critical-machines-table');

  if (badge) badge.textContent = criticalMachines.length;

  if (criticalMachines.length === 0) {
    if (tableEl) tableEl.classList.add('d-none');
    if (emptyMsg) emptyMsg.classList.remove('d-none');
  } else {
    if (tableEl) tableEl.classList.remove('d-none');
    if (emptyMsg) emptyMsg.classList.add('d-none');
    tbody.innerHTML = '';
    criticalMachines.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${m.machine_id}</strong></td>
        <td>Line ${m.assembly_line}</td>
        <td>${m.asset_type}</td>
        <td><span class="health-badge health-critical">${m.health_score}</span></td>
        <td><span class="prob-badge">${(m.failure_probability * 100).toFixed(1)}%</span></td>
        <td>${m.downtime_hours}</td>
        <td>${m.last_maintenance}</td>
        <td><button class="btn btn-sm btn-schedule" data-line="${m.assembly_line}">🔧 Schedule Maintenance</button></td>
      `;
      // Button click → go to Forecast page with assembly line pre‑selected
      tr.querySelector('.btn-schedule').addEventListener('click', () => {
        const sel = qs('#forecast-assembly-select');
        if (sel) sel.value = String(m.assembly_line);
        showPage('Forecast');
        // update nav active state
        qsa('a[data-page]').forEach(x => x.classList.remove('active'));
        const forecastLink = qs('a[data-page="Forecast"]');
        if (forecastLink) forecastLink.classList.add('active');
      });
      tbody.appendChild(tr);
    });
  }

  // Histogram
  const trace = { x: machines.map(m => m.health_score), type: 'histogram', marker: { color: '#009ADD' } };
  const histLayout = { paper_bgcolor: '#FFFFFF', plot_bgcolor: '#FFFFFF', margin: { l: 40, r: 20, t: 20, b: 40 }, height: 400 };
  Plotly.newPlot('histogram', [trace], histLayout, { responsive: true });

  // Status pie
  const statusCounts = machines.reduce((acc, m) => { acc[m.status] = (acc[m.status] || 0) + 1; return acc; }, {})
  const pie = { values: Object.values(statusCounts), labels: Object.keys(statusCounts), type: 'pie' };
  const pieLayout = { paper_bgcolor: '#FFFFFF', margin: { l: 20, r: 20, t: 20, b: 20 }, height: 400 };
  Plotly.newPlot('status-pie', [pie], pieLayout, { responsive: true });
}

// Machine page
function initMachinePage() {
  const assemblyLineSel = qs('#assembly-line-select');

  // Populate assembly line dropdown
  for (let i = 1; i <= 5; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Assembly Line ${i}`;
    assemblyLineSel.appendChild(opt);
  }

  // Handle assembly line change
  assemblyLineSel.addEventListener('change', () => {
    const selectedLine = parseInt(assemblyLineSel.value);
    const lineMachines = machines.filter(m => m.assembly_line === selectedLine);
    renderMachineList(lineMachines);
    qs('#machine-details').classList.add('d-none');
  });

  // Initialize with first assembly line
  assemblyLineSel.dispatchEvent(new Event('change'));
}

function renderMachineList(lineMachines) {
  const listContainer = qs('#machine-list');
  listContainer.innerHTML = '';
  lineMachines.forEach(m => {
    const card = document.createElement('div');
    card.className = 'machine-card';
    card.innerHTML = `
      <div class="machine-card-id">${m.machine_id}</div>
      <div class="machine-card-status ${m.status}">${m.status}</div>
      <div style="font-size:12px; margin-top:8px; color:#666;">Health: ${m.health_score}</div>
    `;
    card.addEventListener('click', (e) => selectMachine(m.machine_id, e));
    listContainer.appendChild(card);
  });
}

function selectMachine(id, evt) {
  // Highlight selected card
  qsa('.machine-card').forEach(c => c.classList.remove('active'));
  if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
  // Open modal
  openMachineModal(id);
}

function openMachineModal(machineId) {
  const m = machines.find(x => x.machine_id === machineId);
  qs('#modal-machine-id').textContent = `${m.machine_id} - Assembly Line ${m.assembly_line}`;

  // Machine info
  qs('#modal-machine-info').innerHTML = `
    <div class="modal-info-card">
      <h5>Machine Information</h5>
      <div class="info-row"><span>Machine ID:</span><strong>${m.machine_id}</strong></div>
      <div class="info-row"><span>Assembly Line:</span><strong>${m.assembly_line}</strong></div>
      <div class="info-row"><span>Asset Type:</span><strong>${m.asset_type}</strong></div>
      <div class="info-row"><span>Status:</span><strong class="status-${m.status.toLowerCase()}">${m.status}</strong></div>
      <div class="info-row"><span>Health Score:</span><strong>${m.health_score}</strong></div>
      <div class="info-row"><span>Failure Probability:</span><strong>${(m.failure_probability * 100).toFixed(2)}%</strong></div>
      <div class="info-row"><span>Last Maintenance:</span><strong>${m.last_maintenance}</strong></div>
      <div class="info-row"><span>Downtime Hours:</span><strong>${m.downtime_hours}</strong></div>
    </div>
  `;

  // Machine trend chart
  // Show modal first so Plotly can measure the visible container
  qs('#machineModal').classList.remove('d-none');
  // Render chart after a short delay to allow layout; ensures Plotly doesn't miscalculate width
  setTimeout(() => {
    renderMachineTrend(machineId);
    // also trigger a resize in case Plotly needs it
    try { Plotly.Plots.resize(qs('#modal-machine-chart')) } catch (e) { }
  }, 60);
}

function closeMachineModal() {
  qs('#machineModal').classList.add('d-none');
}

function renderMachineTrend(machineId) {
  const m = machines.find(x => x.machine_id === machineId);
  // Generate synthetic trend data for the machine
  const dates = [];
  const healthTrend = [];
  const baseHealth = m.health_score;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]); // Full date format: YYYY-MM-DD
    // Create realistic trend
    const variance = Math.sin(i / 5) * 15 + (Math.random() - 0.5) * 10;
    healthTrend.push(Math.max(20, Math.min(100, baseHealth + variance)));
  }

  const trace = { x: dates, y: healthTrend, mode: 'lines+markers', name: 'Health Score', fill: 'tozeroy', line: { color: '#009ADD', width: 3 }, fillcolor: 'rgba(0,154,221,0.2)', marker: { size: 6 } };
  const layout = {
    title: '30-Day Health Trend',
    paper_bgcolor: '#FFFFFF',
    plot_bgcolor: '#FFFFFF',
    // reduced right margin to avoid large whitespace while keeping room for rotated ticks
    margin: { l: 50, r: 40, t: 40, b: 80 },
    height: 350,
    xaxis: {
      title: 'Date',
      tickangle: -45,
      automargin: true,
      autorange: true
    },
    yaxis: { title: 'Health Score', range: [0, 100] },
    showlegend: false
  };
  Plotly.newPlot('modal-machine-chart', [trace], layout, { responsive: true });
}

function renderMachine(id) {
  const m = machines.find(x => x.machine_id === id);
  qs('#machine-metrics').innerHTML = `<div class="d-flex gap-3 w-100"><div class="metric card"><div class="metric-label">Health Score</div><div class="metric-value">${m.health_score}</div></div><div class="metric card"><div class="metric-label">Failure Probability</div><div class="metric-value">${(m.failure_probability * 100).toFixed(2)}%</div></div><div class="metric card"><div class="metric-label">Status</div><div class="metric-value">${m.status}</div></div><div class="metric card"><div class="metric-label">Asset Type</div><div class="metric-value">${m.asset_type}</div></div></div>`;
  // Gauge using Plotly indicator
  const gauge = [{ type: 'indicator', mode: 'gauge+number', value: m.health_score, gauge: { axis: { range: [0, 100] }, bar: { color: '#82BC00' } } }];
  const gaugeLayout = { height: 300, paper_bgcolor: '#FFFFFF' };
  Plotly.newPlot('gauge', gauge, gaugeLayout, { responsive: true });

  const rec = qs('#recommendations');
  if (m.status === 'Critical') rec.innerHTML = `<div class="alert alert-danger">⚠️ <strong>IMMEDIATE ACTION REQUIRED</strong>: Schedule maintenance within 24 hours.</div>`;
  else if (m.status === 'Warning') rec.innerHTML = `<div class="alert alert-warning">⚠️ <strong>PREVENTIVE ACTION RECOMMENDED</strong>: Monitor closely and schedule maintenance within 7 days.</div>`;
  else rec.innerHTML = `<div class="alert alert-success">✅ <strong>HEALTHY</strong>: Continue normal operations with regular monitoring.</div>`;
}

// Forecast (Maintenance Gantt - Historical + Upcoming)
function initForecastPage() {
  const container = qs('#maintenance-gantt');
  container.innerHTML = '';

  // Combine historical maintenance events with upcoming slots
  let allEvents = [];

  // Add historical maintenance events
  if (typeof maintenanceEvents !== 'undefined' && maintenanceEvents.length > 0) {
    allEvents = maintenanceEvents.slice();
  }

  // Add upcoming maintenance slots for the next 90 days (3 months)
  const today = new Date();
  const upcoming = [];
  machines.forEach(m => {
    // Create 2-3 upcoming slots per machine spread across next 90 days
    const slotCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < slotCount; i++) {
      const daysOffset = 10 + Math.floor(Math.random() * 80); // spread over next 90 days
      const start = new Date(today);
      start.setDate(today.getDate() + daysOffset);
      const isScheduled = Math.random() > 0.4; // 60% scheduled, 40% available
      const durDays = isScheduled ? (2 + Math.floor(Math.random() * 2)) : 3;
      const end = new Date(start);
      end.setDate(start.getDate() + durDays);
      upcoming.push({
        machine_id: m.machine_id,
        assembly_line: m.assembly_line,
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        durationDays: durDays,
        durationMs: (end.getTime() - start.getTime()),
        type: isScheduled ? 'Scheduled' : 'Available',
        isScheduled: isScheduled
      });
    }
  });

  allEvents = allEvents.concat(upcoming);
  allEvents.sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
  console.log('initForecastPage: total events=', allEvents.length);

  if (allEvents.length === 0) {
    container.innerHTML = '<div class="alert alert-info">No maintenance events available</div>';
    return;
  }

  const sel = qs('#forecast-assembly-select');
  // populate select with assembly lines 1-5 only (no "All Lines")
  if (sel) {
    sel.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `Assembly Line ${i}`;
      sel.appendChild(o);
    }
    sel.value = '1'; // default to line 1
  }

  // render helper
  function renderFor(line) {
    const events = line ? allEvents.filter(e => String(e.assembly_line) === String(line)) : allEvents.slice();
    events.sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

    const y = events.map(e => e.machine_id + ' (L' + e.assembly_line + ')');
    const x = events.map(e => e.durationMs);
    const base = events.map(e => e.startISO);
    // Color: historical=blue/red, upcoming: green=scheduled, light gray=available
    const colors = events.map(e => {
      const isHistorical = !upcoming.some(u => u.startISO === e.startISO);
      if (isHistorical) {
        return e.type === 'Corrective' ? '#d9534f' : '#5bc0de';
      } else {
        return e.isScheduled ? '#82BC00' : '#d3d3d3';
      }
    });
    const text = events.map(e => `${e.machine_id} — ${e.type}: ${e.start} → ${e.end}`);

    const trace = {
      type: 'bar', orientation: 'h', x: x, y: y, base: base,
      marker: { color: colors }, hoverinfo: 'text', text: text
    };

    // sizing logic
    const viewportPadding = 200;
    const perRow = 18;
    const desiredByRows = events.length * perRow;
    const maxByViewport = Math.max(300, window.innerHeight - viewportPadding);
    const chartHeight = Math.min(900, Math.max(350, Math.min(desiredByRows, maxByViewport)));
    container.style.height = chartHeight + 'px';

    const layout = {
      title: 'Maintenance Forecast (Historical + Upcoming)',
      barmode: 'stack',
      bargap: 0.16,
      bargroupgap: 0.06,
      xaxis: { type: 'date', title: 'Date' },
      margin: { l: 90, r: 20, t: 40, b: 80 },
      height: chartHeight,
      yaxis: { automargin: true, tickfont: { size: 10 } }
    };

    try {
      Plotly.react('maintenance-gantt', [trace], layout, { responsive: true });
      console.log('Plotly.react called for', events.length, 'events');
    } catch (err) {
      console.error('Plotly.react error:', err);
      container.innerHTML = '<div class="alert alert-danger">Error rendering chart. See console for details.</div>';
    }
  }

  // Expose the render function so showPage can call it when the page becomes visible
  _forecastRender = function () { renderFor(sel ? sel.value : '1'); };
  if (sel) sel.addEventListener('change', () => renderFor(sel.value));

  // Only render immediately if the Forecast page is currently visible
  const forecastSection = qs('#Forecast');
  if (forecastSection && !forecastSection.classList.contains('d-none')) {
    _forecastRender();
  }

  // resize handler
  window.addEventListener('resize', () => {
    const current = sel ? sel.value : '1';
    renderFor(current);
  });
}

// Remove old separate functions (commented out for reference)
// function initUpcomingPage(){...} - now merged into initForecastPage()

// Cost page
function initCostPage() {
  const inputs = ['maintenance-cost', 'false-alarm-cost', 'system-cost', 'avoided-downtime', 'avoided-repair', 'production-saved'];
  inputs.forEach(id => qs('#' + id).addEventListener('input', renderCostChart));
  renderCostChart();
}

function renderCostChart() {
  const maintenance = +qs('#maintenance-cost').value;
  const falseAlarm = +qs('#false-alarm-cost').value;
  const system = +qs('#system-cost').value;
  const avoidedDowntime = +qs('#avoided-downtime').value;
  const avoidedRepair = +qs('#avoided-repair').value;
  const productionSaved = +qs('#production-saved').value;
  const categories = ['Maintenance', 'False Alarms', 'System Cost', 'Downtime Avoided', 'Repair Avoided', 'Production Saved'];
  const amounts = [maintenance, falseAlarm, system, -avoidedDowntime, -avoidedRepair, -productionSaved];
  const costLayout = { title: 'Cost-Benefit Breakdown', paper_bgcolor: '#FFFFFF', plot_bgcolor: '#FFFFFF', margin: { l: 40, r: 20, t: 40, b: 40 }, height: 400 };
  Plotly.newPlot('cost-chart', [{ x: categories, y: amounts, type: 'bar' }], costLayout, { responsive: true });
}

// Historical
function initHistorical() {
  const dates = histData.map(d => d.date);
  const trendsLayout = { title: 'Machine Status Trends', paper_bgcolor: '#FFFFFF', plot_bgcolor: '#FFFFFF', margin: { l: 40, r: 20, t: 40, b: 40 }, height: 400 };
  Plotly.newPlot('trends-chart', [
    { x: dates, y: histData.map(d => d.critical_count), name: 'Critical', mode: 'lines+markers' },
    { x: dates, y: histData.map(d => d.warning_count), name: 'Warning', mode: 'lines+markers' },
    { x: dates, y: histData.map(d => d.healthy_count), name: 'Healthy', mode: 'lines+markers' }
  ], trendsLayout, { responsive: true });

  const predLayout = { title: 'Predicted vs Actual Failures', paper_bgcolor: '#FFFFFF', plot_bgcolor: '#FFFFFF', margin: { l: 40, r: 20, t: 40, b: 40 }, height: 400 };
  Plotly.newPlot('pred-vs-actual', [
    { x: dates, y: histData.map(d => d.predicted_failures), name: 'Predicted', mode: 'lines+markers' },
    { x: dates, y: histData.map(d => d.actual_failures), name: 'Actual', mode: 'lines+markers' }
  ], predLayout, { responsive: true });
}

// Init all
function initializeApp() {
  if (!dataReady) {
    setTimeout(initializeApp, 100); // Wait for data to load
    return;
  }
  showPage('Overview');
  initOverview();
  initMachinePage();
  initForecastPage();
  initCostPage();
  initHistorical();
}

window.initializeApp = initializeApp;

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});
