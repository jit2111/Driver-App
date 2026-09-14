/* ===========================
   app.js — Shared logic
   Used by both index.html and admin.html.

   Storage strategy:
     • When running through the Node server (server.js) all reads/writes
       go to the REST API  →  db/bookings.json  /  db/drivers.json
     • When opened as a plain file (GitHub Pages / no server) it falls
       back to localStorage so the static demo still works.
=========================== */

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
  /* Set minimum date to today */
  const tripDateInput = document.getElementById('tripDate');
  tripDateInput.min = new Date().toISOString().split('T')[0];

  bookingForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    const submitBtn = bookingForm.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking…';

    const booking = {
      fullName: document.getElementById('fullName').value.trim(),
      phone:    document.getElementById('phone').value.trim(),
      tripDate: document.getElementById('tripDate').value,
      tripTime: document.getElementById('tripTime').value,
    };

    try {
      const saved = await addBooking(booking);
      showSuccessModal(saved);
      bookingForm.reset();
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
