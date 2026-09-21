/* ===========================
   admin.js — Admin dashboard logic
=========================== */

const DRIVERS_KEY      = 'totahda_drivers';
const DEFAULT_DRIVERS  = ['Pradip', 'Swapan', 'Ujjal', 'Totah', 'Samir'];

/* ─────────────────────────────────────
   Driver storage  (API-first, localStorage fallback)
   Drivers are objects: { name, phone }
───────────────────────────────────── */

async function getDrivers() {
  if (await isApiAvailable()) {
    const r = await fetch('/api/drivers');
    if (r.ok) return r.json();   // [{name, phone}, …]
  }
  try {
    const stored = JSON.parse(localStorage.getItem(DRIVERS_KEY));
    const arr    = Array.isArray(stored) && stored.length ? stored : [...DEFAULT_DRIVERS];
    /* normalise legacy plain-string entries */
    return arr.map(d => typeof d === 'string' ? { name: d, phone: '' } : d);
  } catch { return DEFAULT_DRIVERS.map(name => ({ name, phone: '' })); }
}

async function _apiSaveDrivers(method, path, body) {
  const r = await fetch('/api/drivers' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return r.json();
}

/* ─────────────────────────────────────
   Driver chips UI
───────────────────────────────────── */
async function renderDriverChips() {
  const chips   = document.getElementById('driverChips');
  const drivers = await getDrivers();
  chips.innerHTML = drivers.map((d, i) => `
    <div class="driver-chip">
      <span class="chip-name">${escHtml(d.name)}</span>
      ${d.phone
        ? `<a class="chip-btn chip-call" href="tel:${escHtml(d.phone)}" title="Call ${escHtml(d.name)}">📞</a>`
        : `<button class="chip-btn chip-call chip-call-empty" title="No phone — click Edit to add" onclick="openEditDriverModal(${i})">📞</button>`
      }
      <button class="chip-btn chip-edit" title="Edit" onclick="openEditDriverModal(${i})">✏️</button>
      <button class="chip-btn chip-del"  title="Remove" onclick="removeDriver(${i})">✕</button>
    </div>
  `).join('');
}

/* ─────────────────────────────────────
   Driver modal
───────────────────────────────────── */
let _editingDriverIndex = null;

function openAddDriverModal() {
  _editingDriverIndex = null;
  document.getElementById('driverModalTitle').textContent  = 'Add Driver';
  document.getElementById('driverNameInput').value         = '';
  document.getElementById('driverPhoneInput').value        = '';
  document.getElementById('err-driverName').textContent    = '';
  document.getElementById('driverModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('driverNameInput').focus(), 50);
}

async function openEditDriverModal(index) {
  _editingDriverIndex = index;
  const drivers = await getDrivers();
  const d = drivers[index] || {};
  document.getElementById('driverModalTitle').textContent  = 'Edit Driver';
  document.getElementById('driverNameInput').value         = d.name  || '';
  document.getElementById('driverPhoneInput').value        = d.phone || '';
  document.getElementById('err-driverName').textContent    = '';
  document.getElementById('driverModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('driverNameInput').focus(), 50);
}

function closeDriverModal() {
  _editingDriverIndex = null;
  document.getElementById('driverModal').classList.add('hidden');
}

async function saveDriver() {
  const name  = document.getElementById('driverNameInput').value.trim();
  const phone = document.getElementById('driverPhoneInput').value.trim();
  const errEl = document.getElementById('err-driverName');
  if (!name) { errEl.textContent = 'Please enter a driver name.'; return; }

  try {
    if (await isApiAvailable()) {
      if (_editingDriverIndex === null) {
        await _apiSaveDrivers('POST', '', { name, phone });
      } else {
        await _apiSaveDrivers('PATCH', '/' + _editingDriverIndex, { name, phone });
      }
    } else {
      /* localStorage fallback */
      const drivers = await getDrivers();
      if (_editingDriverIndex === null) {
        if (drivers.some(d => d.name.toLowerCase() === name.toLowerCase())) {
          errEl.textContent = 'A driver with this name already exists.'; return;
        }
        drivers.push({ name, phone });
      } else {
        if (drivers.some((d, i) => i !== _editingDriverIndex && d.name.toLowerCase() === name.toLowerCase())) {
          errEl.textContent = 'A driver with this name already exists.'; return;
        }
        const oldName = drivers[_editingDriverIndex].name;
        drivers[_editingDriverIndex] = { name, phone };
        const bookings = (await getBookings()).map(b => b.driver === oldName ? { ...b, driver: name } : b);
        await saveBookings(bookings);
      }
      localStorage.setItem(DRIVERS_KEY, JSON.stringify(drivers));
    }
    writeLog(
      _editingDriverIndex === null ? 'Driver Added' : 'Driver Updated',
      `${name}${phone ? ' (' + phone + ')' : ''}`
    );
    closeDriverModal();
    await renderDriverChips();
    await renderBookings(document.getElementById('searchInput').value);
  } catch (err) {
    errEl.textContent = err.message || 'Could not save driver.';
  }
}

async function removeDriver(index) {
  const drivers = await getDrivers();
  const name    = drivers[index].name;
  if (!confirm(`Remove "${name}" from the driver list? Existing bookings will keep the name.`)) return;
  writeLog('Driver Removed', name);

  if (await isApiAvailable()) {
    await fetch('/api/drivers/' + index, { method: 'DELETE' });
  } else {
    drivers.splice(index, 1);
    localStorage.setItem(DRIVERS_KEY, JSON.stringify(drivers));
  }
  await renderDriverChips();
  await renderBookings(document.getElementById('searchInput').value);
}

/* Allow Enter key in driver name input */
document.addEventListener('DOMContentLoaded', function () {
  const inp = document.getElementById('driverNameInput');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') saveDriver(); });
});

/* ─────────────────────────────────────
   Today helper
───────────────────────────────────── */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

/* ─────────────────────────────────────
   Render bookings table
───────────────────────────────────── */
async function renderBookings(filter = '') {
  const all     = await getBookings();
  const term    = filter.toLowerCase();
  const list    = term
    ? all.filter(b =>
        b.fullName.toLowerCase().includes(term) ||
        b.phone.toLowerCase().includes(term)    ||
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

  /* clash detection */
  const slotCounts = {};
  all.forEach(b => {
    const key = `${b.tripDate}|${b.tripTime}`;
    slotCounts[key] = (slotCounts[key] || 0) + 1;
  });

  const drivers = await getDrivers();

  /* ── group by tripDate ── */
  const groupMap = {};
  list.forEach(b => {
    const d = b.tripDate || '';
    if (!groupMap[d]) groupMap[d] = [];
    groupMap[d].push(b);
  });

  /* ── sort groups: oldest → newest ── */
  const groups = Object.keys(groupMap)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map(d => ({ date: d, rows: groupMap[d] }));

  /* ── render one sub-table per date group ── */
  groups.forEach(group => {
    const isToday = group.date === today;
    const groupId = 'dg_' + (group.date || 'unknown');
    const dateLabel = isToday
      ? `<span class="today-badge">Today</span> ${formatDate(group.date)}`
      : formatDate(group.date);

    /* ── group header row: toggle arrow + date only ── */
    const headerTr = document.createElement('tr');
    headerTr.className = 'date-group-header' + (isToday ? ' date-group-today' : '');
    headerTr.innerHTML = `
      <td colspan="11" onclick="toggleDateGroup('${groupId}')">
        <span class="date-group-toggle" id="${groupId}_arrow">−</span>
        ${dateLabel}
      </td>
    `;
    tbody.appendChild(headerTr);

    /* ── data rows ── */
    group.rows.forEach((b, i) => {
      const isConfirmed = b.status === 'Confirmed';
      const isClash     = slotCounts[`${b.tripDate}|${b.tripTime}`] > 1;

      const driverCell = isConfirmed
        ? `<select class="status-select driver-select" onchange="assignDriver('${b.id}', this.value)">
             <option value="">— Assign Driver —</option>
             ${drivers.map(d =>
                 `<option value="${d.name}" ${b.driver === d.name ? 'selected' : ''}>${escHtml(d.name)}</option>`
               ).join('')}
           </select>
           ${b.driver
             ? `<button class="btn btn-sms btn-sm" onclick="sendSMS('${b.id}')">📱 SMS</button>`
             : ''
           }`
        : `<span style="color:#57606a;font-size:0.8rem">${escHtml(b.driver || '—')}</span>`;

      const carBadge = b.needCar === 'Yes'
        ? '<span class="car-size-badge car-size-' + (b.carSize||'').toLowerCase() + '" style="margin-left:5px;">&#x1F697; ' + escHtml(b.carSize||'Car') + '</span>'
        : '';

      const tr = document.createElement('tr');
      tr.dataset.group = groupId;
      if (isClash) tr.classList.add('row-clash');

      tr.innerHTML = `
        <td style="color:#57606a;font-size:0.8rem">${i + 1}</td>
        <td><strong>${escHtml(b.fullName)}</strong>${carBadge}</td>
        <td>${escHtml(b.phone)}</td>
        <td>
          ${formatDate(b.tripDate)}
          ${isClash ? '<span class="clash-badge">⚠ Clash</span>' : ''}
        </td>
        <td>${formatTime(b.tripTime)}</td>
        <td style="color:#57606a;font-size:0.85rem">${escHtml(b.tripType||'Short Trip')}</td>
        <td style="color:#57606a;font-size:0.85rem">${escHtml(b.driverChoice||'Regular')}</td>
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
  });
}

function toggleDateGroup(groupId) {
  const arrow = document.getElementById(groupId + '_arrow');
  const rows  = document.querySelectorAll(`tr[data-group="${groupId}"]`);
  const isOpen = arrow.textContent === '−';
  arrow.textContent = isOpen ? '+' : '−';
  rows.forEach(r => { r.style.display = isOpen ? 'none' : ''; });
}

/* ─────────────────────────────────────
   Stats bar
───────────────────────────────────── */
function renderStats(bookings) {
  const statsBar   = document.getElementById('statsBar');
  const total      = bookings.length;
  const confirmed  = bookings.filter(b => b.status === 'Confirmed').length;
  const pending    = bookings.filter(b => b.status === 'Pending').length;
  const cancelled  = bookings.filter(b => b.status === 'Cancelled').length;
  const today      = getTodayStr();
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

/* ─────────────────────────────────────
   Activity Logs
───────────────────────────────────── */
const LOGS_KEY = 'totahda_admin_logs';

function writeLog(action, detail) {
  const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
  logs.unshift({ ts: new Date().toISOString(), action, detail });
  if (logs.length > 500) logs.length = 500; // cap at 500 entries
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function openLogsModal() {
  const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
  const el = document.getElementById('logsContent');
  if (logs.length === 0) {
    el.innerHTML = '<p class="logs-empty">No activity logged yet.</p>';
  } else {
    el.innerHTML = logs.map(l => {
      const d = new Date(l.ts);
      const dateStr = d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
      const timeStr = d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit', second:'2-digit' });
      return `<div class="log-entry">
        <span class="log-ts">${dateStr}, ${timeStr}</span>
        <span class="log-action">${escHtml(l.action)}</span>
        <span class="log-detail">${escHtml(l.detail)}</span>
      </div>`;
    }).join('');
  }
  document.getElementById('logsModal').classList.remove('hidden');
}

function closeLogsModal() {
  document.getElementById('logsModal').classList.add('hidden');
}

function clearLogs() {
  document.getElementById('clearLogsPinInput').value = '';
  document.getElementById('err-clearLogsPin').textContent = '';
  document.getElementById('clearLogsPinModal').classList.remove('hidden');
}

function closeClearLogsPinModal() {
  document.getElementById('clearLogsPinModal').classList.add('hidden');
}

function confirmClearLogs() {
  const pin = document.getElementById('clearLogsPinInput').value.trim();
  const err = document.getElementById('err-clearLogsPin');
  if (pin !== '100') {
    err.textContent = 'Incorrect PIN. Please try again.';
    document.getElementById('clearLogsPinInput').classList.add('invalid');
    return;
  }
  closeClearLogsPinModal();
  localStorage.removeItem(LOGS_KEY);
  writeLog('Logs Cleared', 'Admin cleared all activity logs');
  openLogsModal();
}

/* ─────────────────────────────────────
   Search / Status / Driver assignment
───────────────────────────────────── */
function filterBookings() {
  renderBookings(document.getElementById('searchInput').value);
}

async function changeStatus(id, status) {
  const all = await getBookings();
  const b = all.find(x => x.id === id);
  writeLog('Status Changed', `${b ? b.fullName : id} → ${status}`);
  await updateBookingStatus(id, status);
  renderBookings(document.getElementById('searchInput').value);
}

async function assignDriver(id, driver) {
  const all = await getBookings();
  const b = all.find(x => x.id === id);
  writeLog('Driver Assigned', `${b ? b.fullName : id} → ${driver || 'Unassigned'}`);
  await updateBookingField(id, { driver });
  renderBookings(document.getElementById('searchInput').value);
}

async function updateTripField(id, field, value) {
  const all = await getBookings();
  const b = all.find(x => x.id === id);
  writeLog('Field Updated', `${b ? b.fullName : id} — ${field}: ${value}`);
  await updateBookingField(id, { [field]: value });
  renderBookings(document.getElementById('searchInput').value);
}

/* ─────────────────────────────────────
   SMS  (real-time via /api/sms)
───────────────────────────────────── */
async function sendSMS(id) {
  /* Show the modal immediately in "sending" state */
  openSmsModal({ state: 'sending', name: '' });

  try {
    const res  = await fetch('/api/sms', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ bookingId: id }),
    });
    const data = await res.json();

    if (data.status === 'sent') {
      openSmsModal({
        state:   'sent',
        name:    data.to,
        sid:     data.sid,
        message: `SMS delivered to ${data.to}`,
      });
      writeLog('SMS Sent', `To ${data.to} (SID: ${data.sid || 'n/a'})`);
      showToast(`✅ SMS sent to ${data.to}`);

    } else if (data.status === 'unconfigured') {
      /* Twilio not configured — show preview so admin can copy & send manually */
      openSmsModal({
        state:   'preview',
        name:    data.to,
        preview: data.preview,
        message: 'Twilio not configured. Copy the message below to send manually.',
      });

    } else {
      openSmsModal({
        state:   'error',
        message: data.error || 'Unknown error from server.',
      });
    }
  } catch (err) {
    openSmsModal({ state: 'error', message: err.message });
  }
}

/* ─────────────────────────────────────
   SMS modal
───────────────────────────────────── */
function openSmsModal({ state, name, sid, preview: previewText, message }) {
  const modal      = document.getElementById('smsModal');
  const iconEl     = document.getElementById('smsModalIcon');
  const titleEl    = document.getElementById('smsModalTitle');
  const bodyEl     = document.getElementById('smsModalBody');
  const previewEl  = document.getElementById('smsModalPreview');
  const previewBox = document.getElementById('smsModalPreviewBox');

  if (state === 'sending') {
    iconEl.textContent  = '⏳';
    titleEl.textContent = 'Sending SMS…';
    bodyEl.textContent  = 'Please wait while the message is being sent.';
    previewBox.classList.add('hidden');
  } else if (state === 'sent') {
    iconEl.textContent  = '✅';
    titleEl.textContent = 'SMS Sent!';
    bodyEl.textContent  = message + (sid ? `\nMessage SID: ${sid}` : '');
    previewBox.classList.add('hidden');
  } else if (state === 'preview') {
    iconEl.textContent    = '📋';
    titleEl.textContent   = 'SMS Preview (Not Sent)';
    bodyEl.textContent    = message;
    previewEl.textContent = previewText || '';
    previewBox.classList.remove('hidden');
  } else {
    iconEl.textContent  = '❌';
    titleEl.textContent = 'SMS Failed';
    bodyEl.textContent  = message;
    previewBox.classList.add('hidden');
  }

  modal.classList.remove('hidden');
}

function closeSmsModal() {
  document.getElementById('smsModal').classList.add('hidden');
}

/* ─────────────────────────────────────
   Toast
───────────────────────────────────── */
function showToast(msg) {
  const toast = document.getElementById('smsToast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

/* ─────────────────────────────────────
   Delete booking
───────────────────────────────────── */
let pendingDeleteId = null;

function openDeleteModal(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDelete() {
  if (pendingDeleteId) {
    const all = await getBookings();
    const b = all.find(x => x.id === pendingDeleteId);
    writeLog('Booking Deleted', b ? `${b.fullName} (${b.phone}) on ${b.tripDate}` : pendingDeleteId);
    await deleteBooking(pendingDeleteId);
    pendingDeleteId = null;
  }
  closeDeleteModal();
  renderBookings(document.getElementById('searchInput').value);
}

/* ─────────────────────────────────────
   Clear all
───────────────────────────────────── */
async function clearAllBookings() {
  if (!confirm('Are you sure you want to delete ALL bookings? This cannot be undone.')) return;
  writeLog('All Bookings Cleared', 'Admin cleared entire bookings list');
  if (await isApiAvailable()) {
    await fetch('/api/bookings', { method: 'DELETE' });
  } else {
    localStorage.removeItem('totahda_bookings');
  }
  renderBookings();
}

/* ─────────────────────────────────────
   REPORT
───────────────────────────────────── */
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

async function openReportModal() {
  const allBookings = await getBookings();
  const now         = new Date();
  const yearSel     = document.getElementById('reportYear');
  const monthSel    = document.getElementById('reportMonth');
  const drvSel      = document.getElementById('reportDriver');

  const years = new Set([now.getFullYear()]);
  allBookings.forEach(b => { if (b.tripDate) years.add(parseInt(b.tripDate.split('-')[0], 10)); });
  const sortedYears = [...years].sort((a, b) => b - a);
  yearSel.innerHTML  = sortedYears.map(y => `<option value="${y}">${y}</option>`).join('');
  yearSel.value      = now.getFullYear();

  monthSel.innerHTML = MONTH_NAMES.map((m, i) =>
    `<option value="${i + 1}">${m}</option>`
  ).join('');
  monthSel.value = now.getMonth() + 1;

  const drivers = await getDrivers();
  drvSel.innerHTML = '<option value="">All Drivers</option>' +
    drivers.map(d => `<option value="${d.name}">${escHtml(d.name)}</option>`).join('');

  document.getElementById('reportModal').classList.remove('hidden');
  generateReport();
}

function closeReportModal() {
  document.getElementById('reportModal').classList.add('hidden');
}

async function getReportBookings() {
  const month  = parseInt(document.getElementById('reportMonth').value, 10);
  const year   = parseInt(document.getElementById('reportYear').value,  10);
  const driver = document.getElementById('reportDriver').value;
  const all    = await getBookings();
  return all.filter(b => {
    if (!b.tripDate) return false;
    const [y, m] = b.tripDate.split('-').map(Number);
    if (y !== year || m !== month) return false;
    if (driver && b.driver !== driver) return false;
    return true;
  });
}

async function generateReport() {
  const month    = parseInt(document.getElementById('reportMonth').value, 10);
  const year     = parseInt(document.getElementById('reportYear').value,  10);
  const driver   = document.getElementById('reportDriver').value;
  const bookings = await getReportBookings();
  const container = document.getElementById('reportContent');

  if (bookings.length === 0) {
    container.innerHTML = `<p class="report-empty">No bookings found for ${MONTH_NAMES[month-1]} ${year}${driver ? ' – ' + escHtml(driver) : ''}.</p>`;
    return;
  }

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

async function sendReportEmail() {
  const month  = document.getElementById('reportMonth').value;
  const year   = document.getElementById('reportYear').value;
  const driver = document.getElementById('reportDriver').value;
  const btn    = document.getElementById('emailReportBtn');

  btn.disabled    = true;
  btn.textContent = '⏳ Sending…';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000); /* 15 s client timeout */

    const res  = await fetch('/api/email-report', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ month, year, driver }),
      signal:  controller.signal,
    });
    clearTimeout(timer);

    /* If SendGrid is not configured the server returns the PDF directly */
    if (res.headers.get('content-type')?.includes('application/pdf')) {
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const mn   = MONTH_NAMES[parseInt(month, 10) - 1];
      const lbl  = driver ? `_${driver.replace(/\s+/g, '_')}` : '';
      a.href     = url;
      a.download = `TotahDa_Report_${mn}_${year}${lbl}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📥 PDF downloaded (email not configured — add SENDGRID_API_KEY & ADMIN_EMAIL to .env)');
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

    const mn = MONTH_NAMES[parseInt(month, 10) - 1];
    showToast(`📧 Report emailed to ${data.to} (${data.count} booking${data.count !== 1 ? 's' : ''}) for ${mn} ${year}${driver ? ' – ' + driver : ''}`);
  } catch (err) {
    const msg = err.name === 'AbortError'
      ? 'Request timed out — check your SENDGRID_API_KEY and network connection.'
      : err.message;
    showToast(`❌ ${msg}`);
  } finally {
    btn.disabled    = false;
    btn.textContent = '📧 Email Report';
  }
}

async function downloadReport() {
  const month    = parseInt(document.getElementById('reportMonth').value, 10);
  const year     = parseInt(document.getElementById('reportYear').value,  10);
  const driver   = document.getElementById('reportDriver').value;
  const bookings = await getReportBookings();

  const rows = [['Booking ID','Name','Phone','Date','Time','Status','Driver','Booked At']];
  bookings.forEach(b => {
    rows.push([
      b.id       || '',
      b.fullName || '',
      b.phone    || '',
      b.tripDate || '',
      b.tripTime || '',
      b.status   || '',
      b.driver   || '',
      b.bookedAt ? new Date(b.bookedAt).toLocaleString() : '',
    ]);
  });

  const csv  = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const lbl  = driver ? `_${driver.replace(/\s+/g,'_')}` : '';
  a.href     = url;
  a.download = `TotahDa_Report_${MONTH_NAMES[month-1]}_${year}${lbl}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`📥 Downloaded report for ${MONTH_NAMES[month-1]} ${year}${driver ? ' – ' + driver : ''}`);
}

/* ─────────────────────────────────────
   Escape HTML
───────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────
   Init
───────────────────────────────────── */
renderDriverChips();
renderBookings();