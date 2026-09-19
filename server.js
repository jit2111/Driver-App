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
    status:       { type: String, default: 'Confirmed' },
    driver:       { type: String, default: '' },
    tripType:     { type: String, default: 'Short Trip' },
    driverChoice: { type: String, default: 'Regular' },
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
    status:       'Confirmed',
    driver:       req.body.driver       || '',
    tripType:     req.body.tripType     || 'Short Trip',
    driverChoice: req.body.driverChoice || 'Regular',
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
  const allowed = ['fullName', 'phone', 'tripDate', 'tripTime', 'status', 'driver', 'tripType', 'driverChoice'];
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
   Start
   ============================================================ */
app.listen(PORT, async () => {
  console.log(`\n  TotahDa server  →  http://localhost:${PORT}`);
  console.log(`  Storage: ${USE_MONGO ? 'MongoDB Atlas' : 'JSON files (db/)'}\n`);
  await seedDrivers();
});
