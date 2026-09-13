/* ===========================
   app.js — Shared logic
   Used by both index.html and admin.html
=========================== */

const STORAGE_KEY = 'drivebook_bookings';

/* ---------- Storage helpers ---------- */
function getBookings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function addBooking(booking) {
  const bookings = getBookings();
  booking.id = 'BK-' + Date.now();
  booking.bookedAt = new Date().toISOString();
  booking.status = 'Confirmed';
  bookings.unshift(booking);
  saveBookings(bookings);
  return booking;
}

function deleteBooking(id) {
  const bookings = getBookings().filter(b => b.id !== id);
  saveBookings(bookings);
}

function updateBookingStatus(id, status) {
  const bookings = getBookings().map(b => b.id === id ? { ...b, status } : b);
  saveBookings(bookings);
}

/* ---------- Booking Form (index.html only) ---------- */
const bookingForm = document.getElementById('bookingForm');

if (bookingForm) {
  // Set minimum date to today
  const tripDateInput = document.getElementById('tripDate');
  tripDateInput.min = new Date().toISOString().split('T')[0];

  bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    const booking = {
      fullName: document.getElementById('fullName').value.trim(),
      phone:    document.getElementById('phone').value.trim(),
      tripDate: document.getElementById('tripDate').value,
      tripTime: document.getElementById('tripTime').value,
      pickup:   document.getElementById('pickup').value.trim(),
      dropoff:  document.getElementById('dropoff').value.trim(),
    };

    const saved = addBooking(booking);
    showSuccessModal(saved);
    bookingForm.reset();
  });
}

function validateForm() {
  let valid = true;

  const fields = [
    { id: 'fullName',  msg: 'Please enter your full name.' },
    { id: 'phone',     msg: 'Please enter a phone number.' },
    { id: 'tripDate',  msg: 'Please select a date.' },
    { id: 'tripTime',  msg: 'Please select a time.' },
    { id: 'pickup',    msg: 'Please enter a pickup location.' },
    { id: 'dropoff',   msg: 'Please enter a drop-off location.' },
  ];

  fields.forEach(({ id, msg }) => {
    const input = document.getElementById(id);
    const err   = document.getElementById('err-' + id);
    if (!input.value.trim()) {
      input.classList.add('invalid');
      err.textContent = msg;
      valid = false;
    } else {
      input.classList.remove('invalid');
      err.textContent = '';
    }
  });

  // Basic phone pattern check
  const phone = document.getElementById('phone');
  const phoneErr = document.getElementById('err-phone');
  if (phone.value.trim() && !/^[\d\s\+\-\(\)]{6,20}$/.test(phone.value.trim())) {
    phone.classList.add('invalid');
    phoneErr.textContent = 'Enter a valid phone number.';
    valid = false;
  }

  return valid;
}

/* ---------- Modal ---------- */
function showSuccessModal(booking) {
  const modal = document.getElementById('successModal');
  const msg   = document.getElementById('modalMessage');
  const time  = formatTime(booking.tripTime);
  const date  = formatDate(booking.tripDate);
  msg.textContent =
    `Hi ${booking.fullName}, your booking (${booking.id}) is confirmed for ${date} at ${time}. ` +
    `Pickup: ${booking.pickup}.`;
  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('successModal').classList.add('hidden');
}

/* ---------- Utility ---------- */
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
  const hr = h % 12 || 12;
  return `${hr}:${String(min).padStart(2,'0')} ${ampm}`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}
