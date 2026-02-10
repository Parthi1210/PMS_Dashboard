// Load machine data from CSV file
let machines = [];
let histData = [];
let maintenanceEvents = [];
let dataReady = false;

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const currentLine = lines[i].split(',');
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j].trim();
      let val = currentLine[j] ? currentLine[j].trim() : '';
      // Convert numeric fields
      if (key === 'assembly_line') obj[key] = parseInt(val);
      else if (['health_score', 'failure_probability', 'downtime_hours'].includes(key)) obj[key] = parseFloat(val);
      else obj[key] = val;
    }
    data.push(obj);
  }
  return data;
}

function generateHistoricalData(){
  // Generate a 30-day historical series with per-assembly-line variation
  histData = [];
  const days = 30;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    // Simulate counts by sampling each machine with small noise so lines vary
    let criticalCount = 0, warningCount = 0, healthyCount = 0;
    machines.forEach(m => {
      // Add assembly-line-based noise so lines 2-5 differ
      const lineNoise = (m.assembly_line - 1) * 0.06; // increasing variability on higher lines
      const p = Math.max(0, Math.min(1, m.failure_probability + (Math.random() - 0.5) * 0.25 + (Math.random() - 0.5) * lineNoise));
      if (p > 0.6) criticalCount++;
      else if (p > 0.3) warningCount++;
      else healthyCount++;
    });

    histData.push({
      date: d.toISOString().slice(0,10),
      critical_count: Math.max(0, criticalCount + Math.floor(Math.random() * 2 - 1)),
      warning_count: Math.max(0, warningCount + Math.floor(Math.random() * 3 - 1)),
      healthy_count: Math.max(0, healthyCount + Math.floor(Math.random() * 2 - 1)),
      predicted_failures: Math.floor(criticalCount * 0.6 + Math.random() * 2),
      actual_failures: Math.floor(criticalCount * 0.5 + Math.random() * 1.5)
    });
  }
}

function generateMaintenanceEvents(){
  maintenanceEvents = [];
  const today = new Date();
  machines.forEach(m => {
    // number of past maintenance events (1-6)
    const count = 3 + Math.floor(Math.random()*4);
    // base date: use last_maintenance if present, else today
    let base = m.last_maintenance ? new Date(m.last_maintenance) : new Date(today);
    for(let i=0;i<count;i++){
      // Spread events backwards in ~30-120 day steps
      const gap = 20 + Math.floor(Math.random()*120);
      const end = new Date(base);
      end.setDate(end.getDate() - i*gap);
      const durDays = 1 + Math.floor(Math.random()*4); // 1-4 days maintenance
      const start = new Date(end);
      start.setDate(end.getDate() - durDays);
      const type = (Math.random() < 0.25) ? 'Corrective' : 'Preventive';
      const durationMs = (end.getTime() - start.getTime());
      maintenanceEvents.push({
        machine_id: m.machine_id,
        assembly_line: m.assembly_line,
        start: start.toISOString().slice(0,10),
        end: end.toISOString().slice(0,10),
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        durationDays: Math.max(1, Math.round(durationMs / (1000*60*60*24))),
        durationMs: durationMs,
        type: type
      });
    }
  });
  // sort by start date
  maintenanceEvents.sort((a,b)=> new Date(a.startISO) - new Date(b.startISO));
}

// Fetch CSV and parse
fetch('data/machines.csv')
  .then(response => response.text())
  .then(csv => {
    machines = parseCSV(csv);
    generateHistoricalData();
    generateMaintenanceEvents();
    dataReady = true;
    console.log('Loaded ' + machines.length + ' machines from CSV');
    // Trigger app initialization after data is ready
    if (window.initializeApp) {
      window.initializeApp();
    }
  })
  .catch(err => console.error('Error loading CSV:', err));
