/* ===========================
   admin.js — Admin dashboard logic
=========================== */

/* ─── Driver storage ─── */
const DRIVERS_KEY = 'totahda_drivers';
const DEFAULT_DRIVERS = ['Pradip', 'Swapan', 'Ujjal', 'Totah', 'Samir'];

function getDrivers() {
  try {
    const stored = JSON.parse(localStorage.getItem(DRIVERS_KEY));
    return Array.isArray(stored) && stored.length ? stored : [...DEFAULT_DRIVERS];
  } catch {
    return [...DEFAULT_DRIVERS];
  }
}

function saveDrivers(list) {
  localStorage.setItem(DRIVERS_KEY, JSON.stringify(list));
}

/* ─── Driver chips UI ─── */
function renderDriverChips() {
  const chips = document.getElementById('driverChips');
  const drivers = getDrivers();
  chips.innerHTML = drivers.map((d, i) => `
    <div class="driver-chip">
      <span class="chip-name">${escHtml(d)}</span>
      <button class="chip-btn chip-edit" title="Rename" onclick="openEditDriverModal(${i})">✏️</button>
      <button class="chip-btn chip-del" title="Remove" onclick="removeDriver(${i})">✕</button>
    </div>
  `).join('');
}

/* ─── Driver modal ─── */
let _editingDriverIndex = null;

function openAddDriverModal() {
  _editingDriverIndex = null;
  document.getElementById('driverModalTitle').textContent = 'Add Driver';
  document.getElementById('driverNameInput').value = '';
  document.getElementById('err-driverName').textContent = '';
  document.getElementById('driverModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('driverNameInput').focus(), 50);
}

function openEditDriverModal(index) {
  _editingDriverIndex = index;
  const drivers = getDrivers();
  document.getElementById('driverModalTitle').textContent = 'Rename Driver';
  document.getElementById('driverNameInput').value = drivers[index] || '';
  document.getElementById('err-driverName').textContent = '';
  document.getElementById('driverModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('driverNameInput').focus(), 50);
}

function closeDriverModal() {
  _editingDriverIndex = null;
  document.getElementById('driverModal').classList.add('hidden');
}

function saveDriver() {
  const name = document.getElementById('driverNameInput').value.trim();
  const errEl = document.getElementById('err-driverName');
  if (!name) {
    errEl.textContent = 'Please enter a driver name.';
    return;
  }
  const drivers = getDrivers();
  if (_editingDriverIndex === null) {
    if (drivers.some(d => d.toLowerCase() === name.toLowerCase())) {
      errEl.textContent = 'A driver with this name already exists.';
      return;
    }
    drivers.push(name);
  } else {
    if (drivers.some((d, i) => i !== _editingDriverIndex && d.toLowerCase() === name.toLowerCase())) {
      errEl.textContent = 'A driver with this name already exists.';
      return;
    }
    const oldName = drivers[_editingDriverIndex];
    drivers[_editingDriverIndex] = name;
    // Update any bookings that referenced the old name
    const bookings = getBookings().map(b => b.driver === oldName ? { ...b, driver: name } : b);
    saveBookings(bookings);
  }
  saveDrivers(drivers);
  closeDriverModal();
  renderDriverChips();
  renderBookings(document.getElementById('searchInput').value);
}

function removeDriver(index) {
  const drivers = getDrivers();
  const name = drivers[index];
  if (!confirm(`Remove "${name}" from the driver list? Existing bookings will keep the name.`)) return;
  drivers.splice(index, 1);
  saveDrivers(drivers);
  renderDriverChips();
  renderBookings(document.getElementById('searchInput').value);
}

// Allow Enter key in driver name input
document.addEventListener('DOMContentLoaded', function () {
  const inp = document.getElementById('driverNameInput');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') saveDriver(); });
});

/* ─── Today highlight helper ─── */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

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
  const today      = getTodayStr();

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

  const drivers = getDrivers();

  list.forEach((b, i) => {
    const isConfirmed = b.status === 'Confirmed';
    const isClash     = slotCounts[`${b.tripDate}|${b.tripTime}`] > 1;
    const isToday     = b.tripDate === today;

    // Driver cell — dropdown only when Confirmed
    const driverCell = isConfirmed
      ? `<select class="status-select driver-select" onchange="assignDriver('${b.id}', this.value)">
           <option value="">— Assign Driver —</option>
           ${drivers.map(d =>
               `<option value="${d}" ${b.driver === d ? 'selected' : ''}>${escHtml(d)}</option>`
             ).join('')}
         </select>
         ${b.driver
           ? `<button class="btn btn-sms btn-sm" onclick="sendSMS('${b.id}')">📱 SMS</button>`
           : ''
         }`
      : `<span style="color:#57606a;font-size:0.8rem">${escHtml(b.driver || '—')}</span>`;

    const tr = document.createElement('tr');
    if (isClash) tr.classList.add('row-clash');
    if (isToday) tr.classList.add('row-today');

    tr.innerHTML = `
      <td style="color:#57606a;font-size:0.8rem">${i + 1}</td>
      <td><strong>${escHtml(b.fullName)}</strong></td>
      <td>${escHtml(b.phone)}</td>
      <td>
        ${isToday ? '<span class="today-badge">Today</span> ' : ''}
        ${formatDate(b.tripDate)}
        ${isClash ? '<span class="clash-badge">⚠ Clash</span>' : ''}
      </td>
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
  const today     = getTodayStr();
  const todayCount = bookings.filter(b => b.tripDate === today).length;

  const pills = [
    { label: 'Total Bookings', value: total },
    { label: 'Confirmed',      value: confirmed },
    { label: 'Pending',        value: pending },
    { label: 'Cancelled',      value: cancelled },
    { label: "Today's Rides",  value: todayCount, highlight: todayCount > 0 },
  ];

  statsBar.innerHTML = pills.map(p => `
    <div class="stat-pill${p.highlight ? ' stat-pill-today' : ''}">
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

/* ---------- Delete booking ---------- */
let pendingDeleteId = null;

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

/* ─────────────────────────────────────────
   REPORT
───────────────────────────────────────── */
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function openReportModal() {
  // Populate year/month selectors
  const allBookings = getBookings();
  const now = new Date();
  const yearSel  = document.getElementById('reportYear');
  const monthSel = document.getElementById('reportMonth');
  const drvSel   = document.getElementById('reportDriver');

  // Years: from earliest booking year or current year, up to current year
  const years = new Set([now.getFullYear()]);
  allBookings.forEach(b => { if (b.tripDate) years.add(parseInt(b.tripDate.split('-')[0], 10)); });
  const sortedYears = [...years].sort((a, b) => b - a);
  yearSel.innerHTML = sortedYears.map(y => `<option value="${y}">${y}</option>`).join('');
  yearSel.value = now.getFullYear();

  monthSel.innerHTML = MONTH_NAMES.map((m, i) =>
    `<option value="${i + 1}">${m}</option>`
  ).join('');
  monthSel.value = now.getMonth() + 1;

  // Populate driver dropdown
  const drivers = getDrivers();
  drvSel.innerHTML = '<option value="">All Drivers</option>' +
    drivers.map(d => `<option value="${d}">${escHtml(d)}</option>`).join('');

  document.getElementById('reportModal').classList.remove('hidden');
  generateReport();
}

function closeReportModal() {
  document.getElementById('reportModal').classList.add('hidden');
}

function getReportBookings() {
  const month  = parseInt(document.getElementById('reportMonth').value, 10);
  const year   = parseInt(document.getElementById('reportYear').value,  10);
  const driver = document.getElementById('reportDriver').value;
  const all    = getBookings();
  return all.filter(b => {
    if (!b.tripDate) return false;
    const [y, m] = b.tripDate.split('-').map(Number);
    if (y !== year || m !== month) return false;
    if (driver && b.driver !== driver) return false;
    return true;
  });
}

function generateReport() {
  const month   = parseInt(document.getElementById('reportMonth').value, 10);
  const year    = parseInt(document.getElementById('reportYear').value,  10);
  const driver  = document.getElementById('reportDriver').value;
  const bookings = getReportBookings();
  const container = document.getElementById('reportContent');

  if (bookings.length === 0) {
    container.innerHTML = `<p class="report-empty">No bookings found for ${MONTH_NAMES[month-1]} ${year}${driver ? ' – ' + escHtml(driver) : ''}.</p>`;
    return;
  }

  // Per-driver breakdown
  const driverMap = {};
  bookings.forEach(b => {
    const key = b.driver || '(Unassigned)';
    if (!driverMap[key]) driverMap[key] = [];
    driverMap[key].push(b);
  });

  const total     = bookings.length;
  const confirmed = bookings.filter(b => b.status === 'Confirmed').length;
  const pending   = bookings.filter(b => b.status === 'Pending').length;
  const cancelled = bookings.filter(b => b.status === 'Cancelled').length;

  let html = `
    <div class="report-summary">
      <div class="rsum-pill"><span class="rsum-val">${total}</span><span class="rsum-lbl">Total</span></div>
      <div class="rsum-pill rsum-confirmed"><span class="rsum-val">${confirmed}</span><span class="rsum-lbl">Confirmed</span></div>
      <div class="rsum-pill rsum-pending"><span class="rsum-val">${pending}</span><span class="rsum-lbl">Pending</span></div>
      <div class="rsum-pill rsum-cancelled"><span class="rsum-val">${cancelled}</span><span class="rsum-lbl">Cancelled</span></div>
    </div>`;

  // Table per driver (or single table if filtering by driver)
  Object.entries(driverMap).sort((a, b) => a[0].localeCompare(b[0])).forEach(([drvName, rows]) => {
    html += `
    <div class="report-driver-section">
      <div class="report-driver-heading">
        <span class="report-drv-name">🚗 ${escHtml(drvName)}</span>
        <span class="report-drv-count">${rows.length} booking${rows.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="report-table-wrap">
        <table class="report-table">
          <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.map((b, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${escHtml(b.fullName)}</td>
                <td>${escHtml(b.phone)}</td>
                <td>${formatDate(b.tripDate)}</td>
                <td>${formatTime(b.tripTime)}</td>
                <td><span class="badge badge-${b.status ? b.status.toLowerCase() : 'pending'}">${escHtml(b.status || 'Pending')}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  });

  container.innerHTML = html;
}

function downloadReport() {
  const month   = parseInt(document.getElementById('reportMonth').value, 10);
  const year    = parseInt(document.getElementById('reportYear').value,  10);
  const driver  = document.getElementById('reportDriver').value;
  const bookings = getReportBookings();

  const rows = [['Booking ID','Name','Phone','Date','Time','Status','Driver','Booked At']];
  bookings.forEach(b => {
    rows.push([
      b.id || '',
      b.fullName || '',
      b.phone || '',
      b.tripDate || '',
      b.tripTime || '',
      b.status || '',
      b.driver || '',
      b.bookedAt ? new Date(b.bookedAt).toLocaleString() : '',
    ]);
  });

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const label = driver ? `_${driver.replace(/\s+/g,'_')}` : '';
  a.href     = url;
  a.download = `TotahDa_Report_${MONTH_NAMES[month-1]}_${year}${label}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`📥 Downloaded report for ${MONTH_NAMES[month-1]} ${year}${driver ? ' – ' + driver : ''}`);
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
renderDriverChips();
renderBookings();
