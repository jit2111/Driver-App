/* ============================================================
   server.js — TotahDa JSON-database backend
   Serves static files + REST API for bookings and drivers.

   Start:  node server.js   (default port 3000)
   ============================================================ */

const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── paths ── */
const DB_DIR       = path.join(__dirname, 'db');
const BOOKINGS_FILE = path.join(DB_DIR, 'bookings.json');
const DRIVERS_FILE  = path.join(DB_DIR, 'drivers.json');

/* ── ensure db dir + files exist (needed on fresh cloud deploy) ── */
if (!fs.existsSync(DB_DIR))       fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(BOOKINGS_FILE)) fs.writeFileSync(BOOKINGS_FILE, '[]', 'utf8');
if (!fs.existsSync(DRIVERS_FILE))  fs.writeFileSync(DRIVERS_FILE, '["Pradip","Swapan","Ujjal","Totah","Samir"]', 'utf8');

/* ── middleware ── */
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));   // serve index.html, admin.html, etc.

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function newId() {
  return 'BK-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

/* ─────────────────────────────────────────────────────────
   Health check
───────────────────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/* ─────────────────────────────────────────────────────────
   BOOKINGS  /api/bookings
───────────────────────────────────────────────────────── */

/* GET /api/bookings — list all, optional ?search= filter */
app.get('/api/bookings', (req, res) => {
  const bookings = readJSON(BOOKINGS_FILE);
  const q = (req.query.search || '').toLowerCase().trim();
  const result = q
    ? bookings.filter(b =>
        (b.fullName || '').toLowerCase().includes(q) ||
        (b.phone    || '').toLowerCase().includes(q) ||
        (b.id       || '').toLowerCase().includes(q)
      )
    : bookings;
  res.json(result);
});

/* GET /api/bookings/:id — single booking */
app.get('/api/bookings/:id', (req, res) => {
  const booking = readJSON(BOOKINGS_FILE).find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

/* POST /api/bookings — create */
app.post('/api/bookings', (req, res) => {
  const { fullName, phone, tripDate, tripTime } = req.body;
  if (!fullName || !phone || !tripDate || !tripTime) {
    return res.status(400).json({ error: 'fullName, phone, tripDate and tripTime are required' });
  }
  const bookings = readJSON(BOOKINGS_FILE);
  const booking = {
    id:        newId(),
    fullName:  fullName.trim(),
    phone:     phone.trim(),
    tripDate,
    tripTime,
    status:    'Confirmed',
    driver:    req.body.driver || '',
    bookedAt:  new Date().toISOString(),
  };
  bookings.unshift(booking);
  writeJSON(BOOKINGS_FILE, bookings);
  res.status(201).json(booking);
});

/* PATCH /api/bookings/:id — partial update (status, driver, any field) */
app.patch('/api/bookings/:id', (req, res) => {
  const bookings = readJSON(BOOKINGS_FILE);
  const idx = bookings.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Booking not found' });

  /* Only allow safe fields to be updated */
  const allowed = ['fullName', 'phone', 'tripDate', 'tripTime', 'status', 'driver'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  bookings[idx] = { ...bookings[idx], ...updates };
  writeJSON(BOOKINGS_FILE, bookings);
  res.json(bookings[idx]);
});

/* DELETE /api/bookings/:id — remove one */
app.delete('/api/bookings/:id', (req, res) => {
  const bookings = readJSON(BOOKINGS_FILE);
  const filtered = bookings.filter(b => b.id !== req.params.id);
  if (filtered.length === bookings.length) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  writeJSON(BOOKINGS_FILE, filtered);
  res.json({ deleted: req.params.id });
});

/* DELETE /api/bookings — clear ALL */
app.delete('/api/bookings', (req, res) => {
  writeJSON(BOOKINGS_FILE, []);
  res.json({ deleted: 'all' });
});

/* ─────────────────────────────────────────────────────────
   DRIVERS  /api/drivers
───────────────────────────────────────────────────────── */

/* GET /api/drivers */
app.get('/api/drivers', (req, res) => {
  res.json(readJSON(DRIVERS_FILE));
});

/* POST /api/drivers — add a driver */
app.post('/api/drivers', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  const drivers = readJSON(DRIVERS_FILE);
  if (drivers.some(d => d.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'Driver already exists' });
  }
  drivers.push(name);
  writeJSON(DRIVERS_FILE, drivers);
  res.status(201).json(drivers);
});

/* PATCH /api/drivers/:index — rename by list index */
app.patch('/api/drivers/:index', (req, res) => {
  const idx  = parseInt(req.params.index, 10);
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  const drivers = readJSON(DRIVERS_FILE);
  if (isNaN(idx) || idx < 0 || idx >= drivers.length) {
    return res.status(404).json({ error: 'Driver index out of range' });
  }
  if (drivers.some((d, i) => i !== idx && d.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'Driver name already exists' });
  }
  const oldName   = drivers[idx];
  drivers[idx]    = name;
  writeJSON(DRIVERS_FILE, drivers);

  /* Cascade rename to bookings */
  const bookings = readJSON(BOOKINGS_FILE).map(b =>
    b.driver === oldName ? { ...b, driver: name } : b
  );
  writeJSON(BOOKINGS_FILE, bookings);

  res.json(drivers);
});

/* DELETE /api/drivers/:index — remove by list index */
app.delete('/api/drivers/:index', (req, res) => {
  const idx = parseInt(req.params.index, 10);
  const drivers = readJSON(DRIVERS_FILE);
  if (isNaN(idx) || idx < 0 || idx >= drivers.length) {
    return res.status(404).json({ error: 'Driver index out of range' });
  }
  drivers.splice(idx, 1);
  writeJSON(DRIVERS_FILE, drivers);
  res.json(drivers);
});

/* ─────────────────────────────────────────────────────────
   Start
───────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n  TotahDa server running at http://localhost:${PORT}`);
  console.log(`  API base:  http://localhost:${PORT}/api`);
  console.log(`  Database:  ${DB_DIR}\n`);
});
