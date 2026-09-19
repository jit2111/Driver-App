/* ===========================
   app.js — Shared logic
   Used by both index.html and admin.html.

   Storage strategy:
     • When running through the Node server (server.js) all reads/writes
       go to the REST API  →  db/bookings.json  /  db/drivers.json
     • When opened as a plain file (GitHub Pages / no server) it falls
       back to localStorage so the static demo still works.
=========================== */

/* ─────────────────────────────────────
   i18n — Language support (EN / BN)
───────────────────────────────────── */
const TRANSLATIONS = {
  en: {
    nav_book:       'Book a Driver',
    nav_admin:      'Admin',
    hero_badge:     '🚗 Fast & Reliable',
    hero_title:     'Your Personal Driver,<br/>On Demand',
    hero_sub:       'Book a professional driver in seconds. Safe, punctual, and always smiling.',
    feat_verified:  'Verified Drivers',
    feat_instant:   'Instant Booking',
    feat_sms:       'SMS Confirmation',
    book_title:     'Book Your Ride',
    book_sub:       "Fill in your details below and we'll get your driver ready.",
    perk_247:       '🕐 Available 24/7',
    perk_safe:      '🛡️ Safety guaranteed',
    perk_sms:       '💬 SMS updates',
    perk_rated:     '⭐ Top-rated drivers',
    lbl_name:       'Full Name',
    lbl_phone:      'Phone Number',
    lbl_date:       'Date',
    lbl_time:       'Time',
    lbl_trip_type:  'Trip Type',
    lbl_driver_choice: 'Driver Choice',
    trip_short:     '🏙️ Short Trip',
    trip_long:      '🛣️ Long Trip',
    driver_regular: '⭐ Regular',
    driver_any:     '🎲 Any',
    btn_confirm:    '🚗 Confirm Booking',
    modal_title:    'Booking Confirmed! 🎉',
    modal_btn:      'Book Another Ride',
    ph_name:        'e.g. Jane Doe',
    ph_phone:       'e.g. +1 555 000 1234',
  },
  bn: {
    nav_book:       'ড্রাইভার বুক করুন',
    nav_admin:      'অ্যাডমিন',
    hero_badge:     '🚗 দ্রুত ও নির্ভরযোগ্য',
    hero_title:     'আপনার ব্যক্তিগত ড্রাইভার,<br/>চাহিদামতো',
    hero_sub:       'মাত্র কয়েক সেকেন্ডে একজন পেশাদার ড্রাইভার বুক করুন। নিরাপদ, সময়মতো এবং সর্বদা হাসিমাখা।',
    feat_verified:  'যাচাইকৃত ড্রাইভার',
    feat_instant:   'তাৎক্ষণিক বুকিং',
    feat_sms:       'এসএমএস নিশ্চিতকরণ',
    book_title:     'আপনার যাত্রা বুক করুন',
    book_sub:       'নিচে আপনার তথ্য পূরণ করুন, আমরা আপনার ড্রাইভার প্রস্তুত করব।',
    perk_247:       '🕐 ২৪/৭ উপলব্ধ',
    perk_safe:      '🛡️ নিরাপত্তা নিশ্চিত',
    perk_sms:       '💬 এসএমএস আপডেট',
    perk_rated:     '⭐ শীর্ষ-রেটেড ড্রাইভার',
    lbl_name:       'পূর্ণ নাম',
    lbl_phone:      'ফোন নম্বর',
    lbl_date:       'তারিখ',
    lbl_time:       'সময়',
    lbl_trip_type:  'ট্রিপের ধরন',
    lbl_driver_choice: 'ড্রাইভার পছন্দ',
    trip_short:     '🏙️ ছোট ট্রিপ',
    trip_long:      '🛣️ লম্বা ট্রিপ',
    driver_regular: '⭐ নিয়মিত',
    driver_any:     '🎲 যেকোনো',
    btn_confirm:    '🚗 বুকিং নিশ্চিত করুন',
    modal_title:    'বুকিং নিশ্চিত হয়েছে! 🎉',
    modal_btn:      'আরেকটি যাত্রা বুক করুন',
    ph_name:        'যেমন: রাহেলা বেগম',
    ph_phone:       'যেমন: +880 1700 000000',
  },
};

let currentLang = localStorage.getItem('totahda_lang') || 'en';

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('totahda_lang', lang);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  /* text nodes */
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.innerHTML = t[key];
  });

  /* placeholder attributes */
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key] !== undefined) el.placeholder = t[key];
  });

  /* keep the select in sync */
  const sel = document.getElementById('langSelect');
  if (sel && sel.value !== lang) sel.value = lang;

  /* update html lang attribute */
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
}

/* Wire up the dropdown once DOM is ready */
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('langSelect');
  if (sel) {
    sel.value = currentLang;
    sel.addEventListener('change', () => applyLanguage(sel.value));
  }
  applyLanguage(currentLang);
});

const API_BASE    = '/api';
const STORAGE_KEY = 'totahda_bookings';

/* ─────────────────────────────────────
   API availability detection
───────────────────────────────────── */
let _apiAvailable = null;   // null = unknown, true/false after first probe

async function isApiAvailable() {
  if (_apiAvailable !== null) return _apiAvailable;
  try {
    const r = await fetch(API_BASE + '/bookings', { method: 'HEAD' });
    _apiAvailable = r.ok || r.status === 405;   // 405 HEAD not allowed still means server is up
  } catch {
    _apiAvailable = false;
  }
  return _apiAvailable;
}

/* ─────────────────────────────────────
   Booking helpers  (async, API-first)
───────────────────────────────────── */

async function getBookings() {
  if (await isApiAvailable()) {
    const r = await fetch(API_BASE + '/bookings');
    if (r.ok) return r.json();
  }
  /* localStorage fallback */
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

async function saveBookings(bookings) {
  /* localStorage-only path (used by legacy callers when API unavailable) */
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

async function addBooking(booking) {
  if (await isApiAvailable()) {
    const r = await fetch(API_BASE + '/bookings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(booking),
    });
    if (r.ok) return r.json();
  }
  /* localStorage fallback */
  const bookings    = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const saved       = { ...booking };
  saved.id          = 'BK-' + Date.now();
  saved.bookedAt    = new Date().toISOString();
  saved.status      = 'Confirmed';
  saved.driver      = '';
  bookings.unshift(saved);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  return saved;
}

async function deleteBooking(id) {
  if (await isApiAvailable()) {
    await fetch(API_BASE + '/bookings/' + id, { method: 'DELETE' });
    return;
  }
  const bookings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

async function updateBookingField(id, fields) {
  if (await isApiAvailable()) {
    const r = await fetch(API_BASE + '/bookings/' + id, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(fields),
    });
    if (r.ok) return r.json();
  }
  /* localStorage fallback */
  const bookings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').map(b =>
    b.id === id ? { ...b, ...fields } : b
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

/* Kept for backwards compat with existing callers */
async function updateBookingStatus(id, status) {
  return updateBookingField(id, { status });
}

/* ─────────────────────────────────────
   Booking Form  (index.html only)
───────────────────────────────────── */
const bookingForm = document.getElementById('bookingForm');

if (bookingForm) {
  const tripDateInput = document.getElementById('tripDate');
  const tripTimeInput = document.getElementById('tripTime');

  /* ── Default: tomorrow at 10:00 AM ── */
  function applyFormDefaults() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm   = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd   = String(tomorrow.getDate()).padStart(2, '0');
    tripDateInput.min   = new Date().toISOString().split('T')[0];
    tripDateInput.value = `${yyyy}-${mm}-${dd}`;
    tripTimeInput.value = '10:00';
    /* restore radio defaults */
    const shortTrip = document.querySelector('input[name="tripType"][value="Short Trip"]');
    const regular   = document.querySelector('input[name="driverChoice"][value="Regular"]');
    if (shortTrip) shortTrip.checked = true;
    if (regular)   regular.checked   = true;
  }

  applyFormDefaults();

  bookingForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    const submitBtn = bookingForm.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking…';

    const booking = {
      fullName:     document.getElementById('fullName').value.trim(),
      phone:        document.getElementById('phone').value.trim(),
      tripDate:     document.getElementById('tripDate').value,
      tripTime:     document.getElementById('tripTime').value,
      tripType:     document.querySelector('input[name="tripType"]:checked').value,
      driverChoice: document.querySelector('input[name="driverChoice"]:checked').value,
    };

    try {
      const saved = await addBooking(booking);
      showSuccessModal(saved);
      bookingForm.reset();
      applyFormDefaults();
    } catch (err) {
      alert('Could not save booking. Please try again.');
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '🚗 Confirm Booking';
    }
  });
}

function validateForm() {
  let valid = true;

  const fields = [
    { id: 'fullName',  msg: 'Please enter your full name.' },
    { id: 'phone',     msg: 'Please enter a phone number.' },
    { id: 'tripDate',  msg: 'Please select a date.' },
    { id: 'tripTime',  msg: 'Please select a time.' },
  ];

  fields.forEach(({ id, msg }) => {
    const input = document.getElementById(id);
    const err   = document.getElementById('err-' + id);
    if (!input || !err) return;
    if (!input.value.trim()) {
      input.classList.add('invalid');
      err.textContent = msg;
      valid = false;
    } else {
      input.classList.remove('invalid');
      err.textContent = '';
    }
  });

  const phone    = document.getElementById('phone');
  const phoneErr = document.getElementById('err-phone');
  if (phone && phone.value.trim() && !/^[\d\s\+\-\(\)]{6,20}$/.test(phone.value.trim())) {
    phone.classList.add('invalid');
    phoneErr.textContent = 'Enter a valid phone number.';
    valid = false;
  }

  return valid;
}

/* ─────────────────────────────────────
   Modal
───────────────────────────────────── */
function showSuccessModal(booking) {
  const modal = document.getElementById('successModal');
  const msg   = document.getElementById('modalMessage');
  const time  = formatTime(booking.tripTime);
  const date  = formatDate(booking.tripDate);
  msg.textContent =
    `Hi ${booking.fullName}, your booking (${booking.id}) is confirmed for ${date} at ${time}.`;
  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('successModal').classList.add('hidden');
}

/* ─────────────────────────────────────
   Utility
───────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, min] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr   = h % 12 || 12;
  return `${hr}:${String(min).padStart(2,'0')} ${ampm}`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}
