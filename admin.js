/* ===========================
   admin.js — Admin dashboard logic
=========================== */

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

  // Update count text
  countEl.textContent = all.length === 0
    ? 'No bookings yet.'
    : `${all.length} booking${all.length !== 1 ? 's' : ''} total`;

  // Render stats
  renderStats(all);

  // Clear table
  tbody.innerHTML = '';

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
    document.getElementById('bookingsTable').style.display = 'none';
    return;
  }

  emptyState.classList.add('hidden');
  document.getElementById('bookingsTable').style.display = '';

  list.forEach((b, i) => {
    const statusClass = {
      'Confirmed':  'badge-confirmed',
      'Pending':    'badge-pending',
      'Cancelled':  'badge-cancelled',
    }[b.status] || 'badge-pending';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:#57606a;font-size:0.8rem">${i + 1}</td>
      <td><strong>${escHtml(b.fullName)}</strong></td>
      <td>${escHtml(b.phone)}</td>
      <td>${formatDate(b.tripDate)}</td>
      <td>${formatTime(b.tripTime)}</td>
      <td>${escHtml(b.pickup)}</td>
      <td>${escHtml(b.dropoff)}</td>
      <td>
        <select class="status-select" onchange="changeStatus('${b.id}', this.value)">
          ${['Confirmed','Pending','Cancelled'].map(s =>
              `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
        </select>
      </td>
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
  const total      = bookings.length;
  const confirmed  = bookings.filter(b => b.status === 'Confirmed').length;
  const pending    = bookings.filter(b => b.status === 'Pending').length;
  const cancelled  = bookings.filter(b => b.status === 'Cancelled').length;

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
  localStorage.removeItem('drivebook_bookings');
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
