/* ===========================
   admin.js — Admin dashboard logic
=========================== */

const DRIVERS = ['Pradip', 'Swapan', 'Ujjal', 'Totah', 'Samir'];

let pendingDeleteId = null;

/* ---------- Render ---------- */
function renderBookings(filter = '') {
  const all   = getBookings();
  const term  = filter.toLowerCase();
  const list  = term
    ? all.filter(b =>
        b.fullName.toLowerCase().includes(term) ||
        b.phone.toLowerCase().includes(term) ||
        (b.id || '').toLowerCase().includes(term)
      )
    : all;

  const tbody      = document.getElementById('bookingsBody');
  const emptyState = document.getElementById('emptyState');
  const countEl    = document.getElementById('bookingCount');

  countEl.textContent = all.length === 0
    ? 'No bookings yet.'
    : `${all.length} booking${all.length !== 1 ? 's' : ''} total`;

  renderStats(all);
  tbody.innerHTML = '';

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
    document.getElementById('bookingsTable').style.display = 'none';
    return;
  }

  emptyState.classList.add('hidden');
  document.getElementById('bookingsTable').style.display = '';

  // Build a set of date+time keys that appear more than once across ALL bookings
  const slotCounts = {};
  all.forEach(b => {
    const key = `${b.tripDate}|${b.tripTime}`;
    slotCounts[key] = (slotCounts[key] || 0) + 1;
  });

  list.forEach((b, i) => {
    const isConfirmed = b.status === 'Confirmed';
    const isClash = slotCounts[`${b.tripDate}|${b.tripTime}`] > 1;

    // Driver cell — dropdown only when Confirmed
    const driverCell = isConfirmed
      ? `<select class="status-select driver-select" onchange="assignDriver('${b.id}', this.value)">
           <option value="">— Assign Driver —</option>
           ${DRIVERS.map(d =>
               `<option value="${d}" ${b.driver === d ? 'selected' : ''}>${d}</option>`
             ).join('')}
         </select>
         ${b.driver
           ? `<button class="btn btn-sms btn-sm" onclick="sendSMS('${b.id}')">📱 SMS</button>`
           : ''
         }`
      : `<span style="color:#57606a;font-size:0.8rem">${b.driver || '—'}</span>`;

    const tr = document.createElement('tr');
    if (isClash) tr.classList.add('row-clash');
    tr.innerHTML = `
      <td style="color:#57606a;font-size:0.8rem">${i + 1}</td>
      <td><strong>${escHtml(b.fullName)}</strong></td>
      <td>${escHtml(b.phone)}</td>
      <td>${formatDate(b.tripDate)} ${isClash ? '<span class="clash-badge">⚠ Clash</span>' : ''}</td>
      <td>${formatTime(b.tripTime)}</td>
      <td>
        <select class="status-select" onchange="changeStatus('${b.id}', this.value)">
          ${['Confirmed','Pending','Cancelled'].map(s =>
              `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
        </select>
      </td>
      <td class="driver-cell">${driverCell}</td>
      <td style="color:#57606a;font-size:0.8rem;white-space:nowrap">${formatDateTime(b.bookedAt)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${b.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ---------- Stats ---------- */
function renderStats(bookings) {
  const statsBar = document.getElementById('statsBar');
  const total     = bookings.length;
  const confirmed = bookings.filter(b => b.status === 'Confirmed').length;
  const pending   = bookings.filter(b => b.status === 'Pending').length;
  const cancelled = bookings.filter(b => b.status === 'Cancelled').length;

  const pills = [
    { label: 'Total Bookings', value: total },
    { label: 'Confirmed',      value: confirmed },
    { label: 'Pending',        value: pending },
    { label: 'Cancelled',      value: cancelled },
  ];

  statsBar.innerHTML = pills.map(p => `
    <div class="stat-pill">
      <span class="stat-value">${p.value}</span>
      <span class="stat-label">${p.label}</span>
    </div>
  `).join('');
}

/* ---------- Search ---------- */
function filterBookings() {
  const term = document.getElementById('searchInput').value;
  renderBookings(term);
}

/* ---------- Status change ---------- */
function changeStatus(id, status) {
  updateBookingStatus(id, status);
  renderBookings(document.getElementById('searchInput').value);
}

/* ---------- Assign Driver ---------- */
function assignDriver(id, driver) {
  const bookings = getBookings().map(b => b.id === id ? { ...b, driver } : b);
  saveBookings(bookings);
  renderBookings(document.getElementById('searchInput').value);
}

/* ---------- Send SMS ---------- */
function sendSMS(id) {
  const booking = getBookings().find(b => b.id === id);
  if (!booking || !booking.driver) return;

  const date    = formatDate(booking.tripDate);
  const time    = formatTime(booking.tripTime);
  const message =
    `Hi ${booking.fullName}, your TotahDa driver has been confirmed! ` +
    `Driver: ${booking.driver}. Date: ${date} at ${time}. ` +
    `Booking ID: ${booking.id}. Thank you for choosing TotahDa!`;

  // Open native SMS app with pre-filled message
  const phone = booking.phone.replace(/\s+/g, '');
  window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_self');

  showToast(`📱 SMS opened for ${booking.fullName} (Driver: ${booking.driver})`);
}

/* ---------- Toast ---------- */
function showToast(msg) {
  const toast = document.getElementById('smsToast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

/* ---------- Delete ---------- */
function openDeleteModal(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('deleteModal').classList.add('hidden');
}

function confirmDelete() {
  if (pendingDeleteId) {
    deleteBooking(pendingDeleteId);
    pendingDeleteId = null;
  }
  closeDeleteModal();
  renderBookings(document.getElementById('searchInput').value);
}

/* ---------- Clear all ---------- */
function clearAllBookings() {
  if (!confirm('Are you sure you want to delete ALL bookings? This cannot be undone.')) return;
  localStorage.removeItem('totahda_bookings');
  renderBookings();
}

/* ---------- Escape HTML ---------- */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- Init ---------- */
renderBookings();
