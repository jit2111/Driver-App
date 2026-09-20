/* ============================================================
   server.js — TotahDa backend
   • With MONGODB_URI env var  →  MongoDB Atlas  (persistent)
   • Without MONGODB_URI       →  local db/ JSON files (dev)

   Start:  node server.js
   ============================================================ */

const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');
const https    = require('https');

/* ── Load .env file without dotenv package ── */
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    });
})();

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── middleware ── */
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/* ============================================================
   DATABASE LAYER  — swaps between MongoDB and JSON files
   ============================================================ */

const USE_MONGO = !!process.env.MONGODB_URI;

/* ── MongoDB setup ── */
let Booking, Driver;

if (USE_MONGO) {
  const mongoose = require('mongoose');

  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('  ✅ MongoDB connected'))
    .catch(err => { console.error('  ❌ MongoDB error:', err.message); process.exit(1); });

  const bookingSchema = new mongoose.Schema({
    id:           { type: String, required: true, unique: true },
    fullName:     String,
    phone:        String,
    tripDate:     String,
    tripTime:     String,
    status:       { type: String, default: 'Pending' },
    driver:       { type: String, default: '' },
    tripType:     { type: String, default: 'Short Trip' },
    driverChoice: { type: String, default: 'Regular' },
    needCar:      { type: String, default: 'No' },
    carSize:      { type: String, default: '' },
    bookedAt:     String,
  }, { versionKey: false });

  const driverSchema = new mongoose.Schema({
    name:  { type: String, required: true, unique: true },
    phone: { type: String, default: '' },
  }, { versionKey: false });

  Booking = mongoose.model('Booking', bookingSchema);
  Driver  = mongoose.model('Driver',  driverSchema);
}

/* ── JSON-file setup (local dev fallback) ── */
const DB_DIR        = path.join(__dirname, 'db');
const BOOKINGS_FILE = path.join(DB_DIR, 'bookings.json');
const DRIVERS_FILE  = path.join(DB_DIR, 'drivers.json');

if (!USE_MONGO) {
  if (!fs.existsSync(DB_DIR))        fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(BOOKINGS_FILE)) fs.writeFileSync(BOOKINGS_FILE, '[]', 'utf8');
  if (!fs.existsSync(DRIVERS_FILE))  fs.writeFileSync(DRIVERS_FILE,
    '["Pradip","Swapan","Ujjal","Totah","Samir"]', 'utf8');
}

function readJSON(filePath)      { try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return []; } }
function writeJSON(filePath, d)  { fs.writeFileSync(filePath, JSON.stringify(d, null, 2), 'utf8'); }

/* ── ID generator ── */
function newId() { return 'BK-' + Date.now() + '-' + Math.floor(Math.random() * 1000); }

/* ── Seed default drivers into Mongo if collection is empty ── */
async function seedDrivers() {
  if (!USE_MONGO) return;
  const count = await Driver.countDocuments();
  if (count === 0) {
    const defaults = ['Pradip', 'Swapan', 'Ujjal', 'Totah', 'Samir'];
    await Driver.insertMany(defaults.map(name => ({ name, phone: '' })));
    console.log('  Seeded default drivers into MongoDB');
  }
}

/* ============================================================
   HEALTH
   ============================================================ */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', storage: USE_MONGO ? 'mongodb' : 'json-file', uptime: process.uptime() });
});

/* ============================================================
   BOOKINGS  /api/bookings
   ============================================================ */

/* GET — list all, optional ?search= */
app.get('/api/bookings', async (req, res) => {
  try {
    const q = (req.query.search || '').toLowerCase().trim();
    if (USE_MONGO) {
      let docs = await Booking.find().sort({ bookedAt: -1 }).lean();
      if (q) docs = docs.filter(b =>
        (b.fullName || '').toLowerCase().includes(q) ||
        (b.phone    || '').toLowerCase().includes(q) ||
        (b.id       || '').toLowerCase().includes(q));
      return res.json(docs);
    }
    let all = readJSON(BOOKINGS_FILE);
    if (q) all = all.filter(b =>
      (b.fullName || '').toLowerCase().includes(q) ||
      (b.phone    || '').toLowerCase().includes(q) ||
      (b.id       || '').toLowerCase().includes(q));
    res.json(all);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* GET — single booking */
app.get('/api/bookings/:id', async (req, res) => {
  try {
    if (USE_MONGO) {
      const doc = await Booking.findOne({ id: req.params.id }).lean();
      return doc ? res.json(doc) : res.status(404).json({ error: 'Not found' });
    }
    const b = readJSON(BOOKINGS_FILE).find(b => b.id === req.params.id);
    b ? res.json(b) : res.status(404).json({ error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST — create */
app.post('/api/bookings', async (req, res) => {
  const { fullName, phone, tripDate, tripTime } = req.body;
  if (!fullName || !phone || !tripDate || !tripTime)
    return res.status(400).json({ error: 'fullName, phone, tripDate and tripTime are required' });

  const booking = {
    id:           newId(),
    fullName:     fullName.trim(),
    phone:        phone.trim(),
    tripDate,
    tripTime,
    status:       req.body.driver ? 'Confirmed' : 'Pending',
    driver:       req.body.driver       || '',
    tripType:     req.body.tripType     || 'Short Trip',
    driverChoice: req.body.driverChoice || 'Regular',
    needCar:      req.body.needCar      || 'No',
    carSize:      req.body.carSize      || '',
    bookedAt:     new Date().toISOString(),
  };
  try {
    if (USE_MONGO) {
      const doc = await Booking.create(booking);
      return res.status(201).json(doc.toObject());
    }
    const all = readJSON(BOOKINGS_FILE);
    all.unshift(booking);
    writeJSON(BOOKINGS_FILE, all);
    res.status(201).json(booking);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* PATCH — partial update */
app.patch('/api/bookings/:id', async (req, res) => {
  const allowed = ['fullName', 'phone', 'tripDate', 'tripTime', 'status', 'driver', 'tripType', 'driverChoice', 'needCar', 'carSize'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  try {
    if (USE_MONGO) {
      const doc = await Booking.findOneAndUpdate(
        { id: req.params.id }, { $set: updates }, { new: true, lean: true }
      );
      return doc ? res.json(doc) : res.status(404).json({ error: 'Not found' });
    }
    const all = readJSON(BOOKINGS_FILE);
    const idx = all.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    all[idx] = { ...all[idx], ...updates };
    writeJSON(BOOKINGS_FILE, all);
    res.json(all[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* DELETE — one */
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    if (USE_MONGO) {
      const r = await Booking.deleteOne({ id: req.params.id });
      return r.deletedCount ? res.json({ deleted: req.params.id }) : res.status(404).json({ error: 'Not found' });
    }
    const all = readJSON(BOOKINGS_FILE);
    const next = all.filter(b => b.id !== req.params.id);
    if (next.length === all.length) return res.status(404).json({ error: 'Not found' });
    writeJSON(BOOKINGS_FILE, next);
    res.json({ deleted: req.params.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* DELETE — clear all */
app.delete('/api/bookings', async (req, res) => {
  try {
    if (USE_MONGO) { await Booking.deleteMany({}); return res.json({ deleted: 'all' }); }
    writeJSON(BOOKINGS_FILE, []);
    res.json({ deleted: 'all' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ============================================================
   DRIVERS  /api/drivers
   ============================================================ */

/* GET — returns [{name, phone}, …] */
app.get('/api/drivers', async (req, res) => {
  try {
    if (USE_MONGO) {
      const docs = await Driver.find().lean();
      return res.json(docs.map(d => ({ name: d.name, phone: d.phone || '' })));
    }
    /* JSON file: may be plain strings (legacy) or objects */
    const raw = readJSON(DRIVERS_FILE);
    res.json(raw.map(d => typeof d === 'string' ? { name: d, phone: '' } : d));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* POST — add */
app.post('/api/drivers', async (req, res) => {
  const name  = (req.body.name  || '').trim();
  const phone = (req.body.phone || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    if (USE_MONGO) {
      const exists = await Driver.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (exists) return res.status(409).json({ error: 'Driver already exists' });
      await Driver.create({ name, phone });
      const all = await Driver.find().lean();
      return res.status(201).json(all.map(d => ({ name: d.name, phone: d.phone || '' })));
    }
    const drivers = readJSON(DRIVERS_FILE).map(d => typeof d === 'string' ? { name: d, phone: '' } : d);
    if (drivers.some(d => d.name.toLowerCase() === name.toLowerCase()))
      return res.status(409).json({ error: 'Driver already exists' });
    drivers.push({ name, phone });
    writeJSON(DRIVERS_FILE, drivers);
    res.status(201).json(drivers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* PATCH — update name/phone by index */
app.patch('/api/drivers/:index', async (req, res) => {
  const idx   = parseInt(req.params.index, 10);
  const name  = (req.body.name  || '').trim();
  const phone = req.body.phone !== undefined ? (req.body.phone || '').trim() : undefined;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    if (USE_MONGO) {
      const docs = await Driver.find().lean();
      if (isNaN(idx) || idx < 0 || idx >= docs.length)
        return res.status(404).json({ error: 'Driver index out of range' });
      const clash = await Driver.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: docs[idx]._id } });
      if (clash) return res.status(409).json({ error: 'Driver name already exists' });
      const oldName = docs[idx].name;
      const upd = { name };
      if (phone !== undefined) upd.phone = phone;
      await Driver.findByIdAndUpdate(docs[idx]._id, upd);
      await Booking.updateMany({ driver: oldName }, { $set: { driver: name } });
      const updated = await Driver.find().lean();
      return res.json(updated.map(d => ({ name: d.name, phone: d.phone || '' })));
    }
    const drivers = readJSON(DRIVERS_FILE).map(d => typeof d === 'string' ? { name: d, phone: '' } : d);
    if (isNaN(idx) || idx < 0 || idx >= drivers.length)
      return res.status(404).json({ error: 'Driver index out of range' });
    if (drivers.some((d, i) => i !== idx && d.name.toLowerCase() === name.toLowerCase()))
      return res.status(409).json({ error: 'Driver name already exists' });
    const oldName   = drivers[idx].name;
    drivers[idx].name = name;
    if (phone !== undefined) drivers[idx].phone = phone;
    writeJSON(DRIVERS_FILE, drivers);
    const bookings = readJSON(BOOKINGS_FILE).map(b => b.driver === oldName ? { ...b, driver: name } : b);
    writeJSON(BOOKINGS_FILE, bookings);
    res.json(drivers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* DELETE — remove by index */
app.delete('/api/drivers/:index', async (req, res) => {
  const idx = parseInt(req.params.index, 10);
  try {
    if (USE_MONGO) {
      const docs = await Driver.find().lean();
      if (isNaN(idx) || idx < 0 || idx >= docs.length)
        return res.status(404).json({ error: 'Driver index out of range' });
      await Driver.findByIdAndDelete(docs[idx]._id);
      const updated = await Driver.find().lean();
      return res.json(updated.map(d => ({ name: d.name, phone: d.phone || '' })));
    }
    const drivers = readJSON(DRIVERS_FILE).map(d => typeof d === 'string' ? { name: d, phone: '' } : d);
    if (isNaN(idx) || idx < 0 || idx >= drivers.length)
      return res.status(404).json({ error: 'Driver index out of range' });
    drivers.splice(idx, 1);
    writeJSON(DRIVERS_FILE, drivers);
    res.json(drivers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ============================================================
   SMS  /api/sms
   ============================================================ */

/**
 * POST /api/sms
 * Body: { bookingId }
 *
 * Sends a real SMS via Twilio Messaging REST API.
 * Requires env vars:
 *   TWILIO_ACCOUNT_SID  — your Twilio Account SID
 *   TWILIO_AUTH_TOKEN   — your Twilio Auth Token
 *   TWILIO_FROM         — your Twilio "From" phone number (e.g. +1415XXXXXXX)
 */
app.post('/api/sms', async (req, res) => {
  const { bookingId } = req.body || {};
  if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });

  /* ── Fetch the booking ── */
  let booking;
  try {
    if (USE_MONGO) {
      booking = await Booking.findOne({ id: bookingId }).lean();
    } else {
      booking = readJSON(BOOKINGS_FILE).find(b => b.id === bookingId);
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch booking: ' + e.message });
  }
  if (!booking)        return res.status(404).json({ error: 'Booking not found' });
  if (!booking.driver) return res.status(400).json({ error: 'No driver assigned to this booking' });

  /* ── Build message ── */
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, d] = (booking.tripDate || '').split('-');
  const dateStr = (y && m && d) ? `${d} ${months[parseInt(m,10)-1]} ${y}` : booking.tripDate;

  let timeStr = booking.tripTime || '';
  if (timeStr.includes(':')) {
    const [hh, mm] = timeStr.split(':');
    const h = parseInt(hh, 10);
    timeStr = `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
  }

  const msgBody =
    `Hi ${booking.fullName}, your TotahDa driver has been confirmed! ` +
    `Driver: ${booking.driver}. Date: ${dateStr} at ${timeStr}. ` +
    `Booking ID: ${booking.id}. Thank you for choosing TotahDa!`;

  /* ── Twilio credentials ── */
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    /* Return the composed message so the admin can send it manually */
    return res.json({
      status: 'unconfigured',
      message: 'Twilio env vars not set — SMS not sent.',
      preview: msgBody,
      to: booking.phone,
    });
  }

  /* ── Send via Twilio REST API ── */
  const to   = booking.phone.replace(/\s+/g, '');
  const body = new URLSearchParams({ To: to, From: from, Body: msgBody }).toString();

  const options = {
    hostname: 'api.twilio.com',
    path:     `/2010-04-01/Accounts/${sid}/Messages.json`,
    method:   'POST',
    headers:  {
      'Content-Type':   'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      'Authorization':  'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
    },
  };

  new Promise((resolve, reject) => {
    const req2 = https.request(options, r2 => {
      let raw = '';
      r2.on('data', chunk => { raw += chunk; });
      r2.on('end',  () => resolve({ statusCode: r2.statusCode, body: raw }));
    });
    req2.on('error', reject);
    req2.write(body);
    req2.end();
  })
  .then(({ statusCode, body: raw }) => {
    const data = JSON.parse(raw);
    if (statusCode >= 200 && statusCode < 300) {
      console.log(`  📱 SMS sent to ${to}  SID: ${data.sid}`);
      res.json({ status: 'sent', sid: data.sid, to });
    } else {
      console.error(`  ❌ Twilio error ${statusCode}:`, data.message);
      res.status(502).json({ error: data.message || 'Twilio error', code: data.code });
    }
  })
  .catch(err => {
    console.error('  ❌ SMS network error:', err.message);
    res.status(500).json({ error: err.message });
  });
});

/* ============================================================
   VOICE CALL  /api/call
   ============================================================ */

/**
 * POST /api/call
 * Body: (none required)
 *
 * Places an outbound call to TWILIO_TO (TotahDa's number) from TWILIO_FROM
 * using Twilio's Calls REST API.  When answered, reads a short TwiML message.
 *
 * Requires env vars:
 *   TWILIO_ACCOUNT_SID  — Twilio Account SID
 *   TWILIO_AUTH_TOKEN   — Twilio Auth Token
 *   TWILIO_FROM         — Twilio "From" phone number  (e.g. +1415XXXXXXX)
 *   TWILIO_TO           — TotahDa destination number  (e.g. +919432670586)
 */
app.post('/api/call', async (req, res) => {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM;
  const to    = process.env.TWILIO_TO || '+919432670586';

  if (!sid || !token || !from) {
    return res.json({
      status: 'unconfigured',
      message: 'Twilio env vars not set — call not placed.',
    });
  }

  /* TwiML: spoken when the call is answered */
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    Hello! This is an urgent call from a TotahDa customer who needs a driver immediately.
    Please call back or check the TotahDa dashboard as soon as possible. Thank you.
  </Say>
</Response>`;

  const body = new URLSearchParams({
    To:     to,
    From:   from,
    Twiml:  twiml,
  }).toString();

  try {
    const callRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        },
        body,
      }
    );

    const data = await callRes.json();

    if (callRes.ok) {
      console.log(`  📞 Call placed to ${to}  SID: ${data.sid}`);
      return res.json({ status: 'calling', sid: data.sid, to });
    } else {
      console.error(`  ❌ Twilio call error ${callRes.status}:`, data.message);
      return res.status(502).json({ error: data.message || 'Twilio error', code: data.code });
    }
  } catch (err) {
    console.error('  ❌ Call network error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   AI CHAT  /api/chat  (kept for future use — not used by UI)
   ============================================================ */
app.post('/api/chat', async (req, res) => {
  const { messages = [], lang = 'en' } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'messages array is required' });

  const apiKey = process.env.OPENAI_API_KEY;
  console.log('  💬 /api/chat called, lang:', lang, 'msgs:', messages.length, 'hasKey:', !!apiKey);

  if (!apiKey) {
    return res.json({
      reply: lang === 'bn'
        ? 'দুঃখিত, এআই চ্যাট এই মুহূর্তে সংযুক্ত নেই। অনুগ্রহ করে সরাসরি ফর্মটি পূরণ করুন।'
        : 'Sorry, AI chat is not configured right now. Please fill in the booking form directly.',
    });
  }

  const today = new Date().toISOString().split('T')[0];

  const systemPrompt = lang === 'bn'
    ? `আপনি TotahDa-র একজন বন্ধুত্বপূর্ণ বুকিং সহকারী। আপনার কাজ হলো ব্যবহারকারীকে একটি ড্রাইভার বুকিং সম্পূর্ণ করতে সাহায্য করা।
আজকের তারিখ: ${today}।
নিম্নলিখিত তথ্যগুলো সংগ্রহ করুন: পূর্ণ নাম, ফোন নম্বর, ট্রিপের তারিখ (YYYY-MM-DD), সময় (HH:MM), ট্রিপের ধরন (Short Trip বা Long Trip), ড্রাইভার পছন্দ (Regular বা Any)।
সব তথ্য পেলে এই ফরম্যাটে উত্তর দিন:
ACTION:{"type":"fill_form","data":{"fullName":"...","phone":"...","tripDate":"YYYY-MM-DD","tripTime":"HH:MM","tripType":"Short Trip","driverChoice":"Regular"}}
তারপর জানান যে ফর্ম পূরণ হয়েছে।`
    : `You are a friendly booking assistant for TotahDa (a driver booking service). Today is ${today}.
Collect from the user: full name, phone number, trip date (YYYY-MM-DD), trip time (HH:MM 24h), trip type (Short Trip or Long Trip), driver choice (Regular or Any). Ask for 1-2 missing fields at a time.
Once you have ALL six fields, output on its own line:
ACTION:{"type":"fill_form","data":{"fullName":"...","phone":"...","tripDate":"YYYY-MM-DD","tripTime":"HH:MM","tripType":"Short Trip","driverChoice":"Regular"}}
Then confirm the form is filled. Only discuss bookings.`;

  try {
    console.log('  💬 Calling OpenAI...');
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        messages:    [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens:  400,
        temperature: 0.4,
      }),
    });

    const data = await openaiRes.json();
    console.log('  💬 OpenAI status:', openaiRes.status);

    if (!openaiRes.ok) {
      console.error('  ❌ OpenAI error:', data.error?.message);
      return res.status(502).json({ error: data.error?.message || 'OpenAI error' });
    }

    let reply = data.choices?.[0]?.message?.content?.trim() || '';
    console.log('  💬 reply preview:', reply.slice(0, 80));

    /* Extract ACTION block — may appear on its own line anywhere in the reply */
    const actionMatch = reply.match(/ACTION:(\{[^}]+\}(?:,[^}]+\})*\})/);
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1]);
        reply = reply.replace(/ACTION:\{[\s\S]*?\}\s*/g, '').trim();
        console.log('  💬 action extracted:', action.type);
        return res.json({ reply, action });
      } catch (e) {
        console.warn('  ⚠️ ACTION parse failed:', e.message, actionMatch[1]);
      }
    }
    return res.json({ reply });

  } catch (err) {
    console.error('  ❌ /api/chat exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   EMAIL REPORT  /api/email-report
   Generates a PDF of filtered bookings and emails it via
   SendGrid HTTP API (no npm deps required).

   Required env vars:
     SENDGRID_API_KEY  — SendGrid API key (starts with SG.)
     ADMIN_EMAIL       — recipient address for the report
   ============================================================ */

/**
 * Build a minimal valid PDF from an array of booking rows.
 * Returns a Buffer containing the complete PDF binary.
 */
function buildReportPdf(bookings, month, year, driverFilter) {
  const MONTH_NAMES_SRV = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  /* strip non-latin1 chars so PDF content streams stay valid */
  const safe = s => String(s || '').replace(/[^\x00-\xFF]/g, '-');
  /* escape PDF string special chars after making safe */
  const esc  = s => safe(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const PDF_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDate = dateStr => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return PDF_MONTHS[parseInt(m, 10) - 1] + ' ' + parseInt(d, 10) + ', ' + y;
  };
  const fmtTime = timeStr => {
    if (!timeStr) return '';
    const [h, min] = timeStr.split(':').map(Number);
    return (h % 12 || 12) + ':' + String(min).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
  };

  const titleText = 'TotahDa Booking Report - ' + MONTH_NAMES_SRV[month - 1] + ' ' + year +
    (driverFilter ? ' - ' + safe(driverFilter) : '');

  /* A4 portrait in points */
  const W = 595, H = 842;
  const ML = 40, MR = 40, MT = 55, rowH = 18, fontSize = 9, headerFontSize = 12;
  const cols    = [22, 100, 80, 74, 44, 62, 80, 53]; /* sum = 515 = W-ML-MR */
  const headers = ['#', 'Name', 'Phone', 'Date', 'Time', 'Status', 'Driver', 'Booked At'];

  const objects = [];
  let oid = 1;
  const addObj = content => { const id = oid++; objects.push({ id, content }); return id; };
  const pages  = [];

  const allRows = bookings.map((b, i) => [
    String(i + 1),
    b.fullName || '',
    b.phone    || '',
    fmtDate(b.tripDate),
    fmtTime(b.tripTime),
    b.status   || 'Pending',
    b.driver   || '',
    b.bookedAt ? new Date(b.bookedAt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '',
  ]);

  const ROWS_PER_PAGE = 34;
  const totalPages    = Math.max(1, Math.ceil(allRows.length / ROWS_PER_PAGE));

  for (let p = 0; p < totalPages; p++) {
    const pageRows = allRows.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
    let y = H - MT;
    const lines = [];

    /* title block — first page only */
    if (p === 0) {
      lines.push('BT /F2 ' + headerFontSize + ' Tf ' + ML + ' ' + y + ' Td (' + esc(titleText) + ') Tj ET');
      y -= 18;
      const total = bookings.length;
      const conf  = bookings.filter(b => b.status === 'Confirmed').length;
      const pend  = bookings.filter(b => b.status === 'Pending').length;
      const canc  = bookings.filter(b => b.status === 'Cancelled').length;
      lines.push('BT /F1 ' + fontSize + ' Tf ' + ML + ' ' + y + ' Td (Total: ' + total + '   Confirmed: ' + conf + '   Pending: ' + pend + '   Cancelled: ' + canc + ') Tj ET');
      y -= 6;
      lines.push('0.4 0.4 0.4 RG 1 w ' + ML + ' ' + y + ' m ' + (W - MR) + ' ' + y + ' l S 0 0 0 RG 0.5 w');
      y -= 10;
    }

    /* table header row — blue background, white bold text */
    lines.push('0.22 0.40 0.67 rg');
    lines.push(ML + ' ' + (y - rowH) + ' ' + (W - ML - MR) + ' ' + rowH + ' re f');
    lines.push('1 1 1 rg');
    let hx = ML;
    headers.forEach((h, ci) => {
      lines.push('BT /F2 ' + fontSize + ' Tf ' + (hx + 3) + ' ' + (y - rowH + 5) + ' Td (' + esc(h) + ') Tj ET');
      hx += cols[ci];
    });
    lines.push('0 0 0 rg');
    y -= rowH;

    /* data rows */
    pageRows.forEach((row, ri) => {
      if (ri % 2 === 0) {
        lines.push('0.95 0.96 0.98 rg');
        lines.push(ML + ' ' + (y - rowH) + ' ' + (W - ML - MR) + ' ' + rowH + ' re f');
        lines.push('0 0 0 rg');
      }
      let rx = ML; /* reset x for every row */
      row.forEach((cell, ci) => {
        const maxChars = Math.floor((cols[ci] - 6) / 5.2);
        const txt = String(cell).slice(0, maxChars);
        lines.push('BT /F1 ' + fontSize + ' Tf ' + (rx + 3) + ' ' + (y - rowH + 5) + ' Td (' + esc(txt) + ') Tj ET');
        rx += cols[ci];
      });
      y -= rowH;
    });

    /* outer border */
    const tableH   = (pageRows.length + 1) * rowH;
    const tableTop = y + pageRows.length * rowH + rowH;
    lines.push('0.6 0.6 0.6 RG 0.5 w ' + ML + ' ' + y + ' ' + (W - ML - MR) + ' ' + tableH + ' re S 0 0 0 RG');

    /* vertical column dividers */
    lines.push('0.8 0.8 0.8 RG 0.3 w');
    let cx = ML;
    cols.slice(0, -1).forEach(cw => {
      cx += cw;
      lines.push(cx + ' ' + y + ' m ' + cx + ' ' + tableTop + ' l S');
    });
    lines.push('0 0 0 RG 0.5 w');

    /* page number footer */
    lines.push('BT /F1 ' + (fontSize - 1) + ' Tf ' + (W / 2 - 25) + ' 22 Td (Page ' + (p + 1) + ' of ' + totalPages + ') Tj ET');

    /* create stream object — measure byte length after latin1 encode */
    const stream    = lines.join('\n');
    const streamBuf = Buffer.from(stream, 'latin1');
    const streamId  = addObj('<< /Length ' + streamBuf.length + ' >>\nstream\n' + stream + '\nendstream');
    pages.push(streamId);
  }

  /* font objects: F1 = regular, F2 = bold */
  const fontId  = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  /* page objects */
  const pageIds = pages.map(streamId =>
    addObj(
      '<< /Type /Page /Parent 0 /MediaBox [0 0 ' + W + ' ' + H + '] ' +
      '/Resources << /Font << /F1 ' + fontId + ' 0 R /F2 ' + fontBId + ' 0 R >> >> ' +
      '/Contents ' + streamId + ' 0 R >>'
    )
  );

  /* pages tree */
  const pagesId = addObj(
    '<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] /Count ' + pageIds.length + ' >>'
  );

  /* patch /Parent placeholder now that pagesId is known */
  objects.forEach(o => {
    if (o.content.includes('/Type /Page ')) {
      o.content = o.content.replace('/Parent 0 ', '/Parent ' + pagesId + ' ');
    }
  });

  /* catalogue */
  const catId = addObj('<< /Type /Catalog /Pages ' + pagesId + ' 0 R >>');

  /* serialise to Buffer array (avoids encoding corruption) */
  const bufParts = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets  = [];

  objects.sort((a, b) => a.id - b.id).forEach(o => {
    offsets[o.id] = bufParts.reduce((s, b) => s + b.length, 0);
    bufParts.push(Buffer.from(o.id + ' 0 obj\n' + o.content + '\nendobj\n', 'latin1'));
  });

  const xrefOffset = bufParts.reduce((s, b) => s + b.length, 0);
  const xrefCount  = oid;
  let xref = 'xref\n0 ' + xrefCount + '\n0000000000 65535 f \n';
  for (let i = 1; i < xrefCount; i++) {
    xref += String(offsets[i] || 0).padStart(10, '0') + ' 00000 n \n';
  }
  bufParts.push(Buffer.from(xref, 'latin1'));
  bufParts.push(Buffer.from(
    'trailer\n<< /Size ' + xrefCount + ' /Root ' + catId + ' 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n',
    'latin1'
  ));

  return Buffer.concat(bufParts);
}

app.post('/api/email-report', async (req, res) => {
  const { month, year, driver } = req.body || {};
  if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

  const apiKey      = process.env.SENDGRID_API_KEY;
  const adminEmail  = process.env.ADMIN_EMAIL;
  /* SENDGRID_FROM must be a SendGrid-verified sender address.
     Falls back to ADMIN_EMAIL if not set separately. */
  const fromEmail   = process.env.SENDGRID_FROM || adminEmail;

  /* ── Fetch & filter bookings ── */
  let allBookings;
  try {
    if (USE_MONGO) {
      allBookings = await Booking.find({}).lean();
    } else {
      allBookings = readJSON(BOOKINGS_FILE);
    }
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch bookings: ' + e.message });
  }

  const m = parseInt(month, 10), y = parseInt(year, 10);
  const filtered = allBookings.filter(b => {
    if (!b.tripDate) return false;
    const [by, bm] = b.tripDate.split('-').map(Number);
    if (by !== y || bm !== m) return false;
    if (driver && b.driver !== driver) return false;
    return true;
  });

  /* ── Build PDF ── */
  const pdfBuf  = buildReportPdf(filtered, m, y, driver || '');
  const pdfB64  = pdfBuf.toString('base64');
  const MONTH_SRV = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const label   = MONTH_SRV[m - 1] + '_' + y + (driver ? '_' + driver.replace(/\s+/g, '_') : '');
  const subject = 'TotahDa Booking Report - ' + MONTH_SRV[m - 1] + ' ' + y + (driver ? ' - ' + driver : '');

  /* ── If SendGrid not configured, return the PDF as a download ── */
  if (!apiKey || !adminEmail) {
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': 'attachment; filename="TotahDa_Report_' + label + '.pdf"',
    });
    return res.send(pdfBuf);
  }

  /* ── Send via SendGrid ── */
  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: adminEmail }] }],
    from:    { email: fromEmail, name: 'TotahDa Admin' },
    subject,
    content: [{ type: 'text/plain', value:
      'Please find the TotahDa booking report for ' + MONTH_SRV[m - 1] + ' ' + y +
      (driver ? ' (' + driver + ')' : '') +
      ' attached.\n\nTotal bookings: ' + filtered.length }],
    attachments: [{
      content:     pdfB64,
      filename:    'TotahDa_Report_' + label + '.pdf',
      type:        'application/pdf',
      disposition: 'attachment',
    }],
  });

  const options = {
    hostname: 'api.sendgrid.com',
    path:     '/v3/mail/send',
    method:   'POST',
    timeout:  10000, /* 10 s — abort if SendGrid doesn't respond */
    headers:  {
      'Authorization':  'Bearer ' + apiKey,
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  try {
    const { statusCode, body: raw } = await new Promise((resolve, reject) => {
      const req2 = https.request(options, r2 => {
        let raw = '';
        r2.on('data', chunk => { raw += chunk; });
        r2.on('end',  () => resolve({ statusCode: r2.statusCode, body: raw }));
      });
      req2.on('timeout', () => { req2.destroy(new Error('SendGrid request timed out after 10 s')); });
      req2.on('error', reject);
      req2.write(payload);
      req2.end();
    });

    if (statusCode >= 200 && statusCode < 300) {
      console.log('  📧 Report emailed to ' + adminEmail + ' (' + filtered.length + ' bookings)');
      res.json({ status: 'sent', to: adminEmail, count: filtered.length });
    } else {
      console.error('  ❌ SendGrid error ' + statusCode + ':', raw);
      res.status(502).json({ error: 'SendGrid error ' + statusCode, detail: raw });
    }
  } catch (err) {
    console.error('  ❌ Email network error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   Start
   ============================================================ */
app.listen(PORT, async () => {
  console.log(`\n  TotahDa server  →  http://localhost:${PORT}`);
  console.log(`  Storage: ${USE_MONGO ? 'MongoDB Atlas' : 'JSON files (db/)'}\n`);
  await seedDrivers();
});
