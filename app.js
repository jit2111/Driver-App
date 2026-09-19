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
    /* chat */
    chat_bubble_label: 'Book with AI',
    chat_title:        'AI Booking Assistant',
    chat_input_ph:     'Type a message…',
    chat_welcome:      "Hi! 👋 I'm your booking assistant. Tell me when and where you'd like a driver, and I'll fill in the form for you!",
    chat_form_filled:  '✅ Form filled! Scroll up and click "Confirm Booking".',
    /* admin */
    adm_login_title:       'Admin Portal',
    adm_login_sub:         'Enter your PIN to access the dashboard',
    adm_pin_lbl:           'Admin PIN',
    adm_login_btn:         '🔓 Login to Dashboard',
    adm_drv_mgmt_title:    '🚗 Driver Management',
    adm_drv_mgmt_sub:      'Add, rename or remove drivers available for assignment.',
    adm_add_driver:        '＋ Add Driver',
    adm_all_bookings:      'All Bookings',
    adm_search_ph:         'Search by name or phone…',
    adm_report_btn:        '📊 Report',
    adm_clear_btn:         'Clear All',
    adm_th_name:           'Name',
    adm_th_phone:          'Phone',
    adm_th_date:           'Date',
    adm_th_time:           'Time',
    adm_th_trip:           'Trip',
    adm_th_choice:         'Choice',
    adm_th_status:         'Status',
    adm_th_driver:         'Driver',
    adm_th_booked_at:      'Booked At',
    adm_th_action:         'Action',
    adm_empty:             'No bookings yet. Waiting for riders!',
    adm_sms_sending:       'Sending SMS…',
    adm_del_title:         'Delete Booking?',
    adm_del_body:          'This action cannot be undone.',
    adm_cancel:            'Cancel',
    adm_delete:            'Delete',
    adm_save:              'Save',
    adm_close:             'Close',
    adm_drv_modal_title:   'Add Driver',
    adm_drv_name_lbl:      'Driver Name',
    adm_drv_name_ph:       'e.g. Rajan',
    adm_drv_phone_lbl:     'Phone Number',
    adm_drv_phone_hint:    '(for direct call)',
    adm_drv_phone_ph:      'e.g. +91 98765 43210',
    adm_report_title:      '📊 Monthly Booking Report',
    adm_report_month:      'Month',
    adm_report_year:       'Year',
    adm_report_driver:     'Driver',
    adm_report_all_drivers:'All Drivers',
    adm_download_csv:      '⬇ Download CSV',
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
    /* chat */
    chat_bubble_label: 'AI দিয়ে বুক করুন',
    chat_title:        'AI বুকিং সহকারী',
    chat_input_ph:     'একটি বার্তা লিখুন…',
    chat_welcome:      'হ্যালো! 👋 আমি আপনার বুকিং সহকারী। কখন এবং কোথায় ড্রাইভার চান বলুন, আমি ফর্মটি পূরণ করে দেব!',
    chat_form_filled:  '✅ ফর্ম পূরণ হয়েছে! উপরে স্ক্রল করুন এবং "বুকিং নিশ্চিত করুন" ক্লিক করুন।',
    /* admin */
    adm_login_title:       'অ্যাডমিন পোর্টাল',
    adm_login_sub:         'ড্যাশবোর্ডে প্রবেশ করতে আপনার পিন দিন',
    adm_pin_lbl:           'অ্যাডমিন পিন',
    adm_login_btn:         '🔓 ড্যাশবোর্ডে লগইন করুন',
    adm_drv_mgmt_title:    '🚗 ড্রাইভার ব্যবস্থাপনা',
    adm_drv_mgmt_sub:      'নিয়োগের জন্য উপলব্ধ ড্রাইভার যোগ করুন, নাম পরিবর্তন করুন বা সরিয়ে দিন।',
    adm_add_driver:        '＋ ড্রাইভার যোগ করুন',
    adm_all_bookings:      'সমস্ত বুকিং',
    adm_search_ph:         'নাম বা ফোন দিয়ে খুঁজুন…',
    adm_report_btn:        '📊 রিপোর্ট',
    adm_clear_btn:         'সব মুছুন',
    adm_th_name:           'নাম',
    adm_th_phone:          'ফোন',
    adm_th_date:           'তারিখ',
    adm_th_time:           'সময়',
    adm_th_trip:           'ট্রিপ',
    adm_th_choice:         'পছন্দ',
    adm_th_status:         'অবস্থা',
    adm_th_driver:         'ড্রাইভার',
    adm_th_booked_at:      'বুকিং সময়',
    adm_th_action:         'অ্যাকশন',
    adm_empty:             'এখনো কোনো বুকিং নেই। রাইডারদের জন্য অপেক্ষা করছি!',
    adm_sms_sending:       'এসএমএস পাঠানো হচ্ছে…',
    adm_del_title:         'বুকিং মুছে ফেলবেন?',
    adm_del_body:          'এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।',
    adm_cancel:            'বাতিল',
    adm_delete:            'মুছুন',
    adm_save:              'সংরক্ষণ করুন',
    adm_close:             'বন্ধ করুন',
    adm_drv_modal_title:   'ড্রাইভার যোগ করুন',
    adm_drv_name_lbl:      'ড্রাইভারের নাম',
    adm_drv_name_ph:       'যেমন: রাজন',
    adm_drv_phone_lbl:     'ফোন নম্বর',
    adm_drv_phone_hint:    '(সরাসরি কলের জন্য)',
    adm_drv_phone_ph:      'যেমন: +880 1700 000000',
    adm_report_title:      '📊 মাসিক বুকিং রিপোর্ট',
    adm_report_month:      'মাস',
    adm_report_year:       'বছর',
    adm_report_driver:     'ড্রাইভার',
    adm_report_all_drivers:'সকল ড্রাইভার',
    adm_download_csv:      '⬇ CSV ডাউনলোড করুন',
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

/* ─────────────────────────────────────
   AI Chat  (index.html only)
───────────────────────────────────── */
(function initChat() {
  const bubble   = document.getElementById('chatBubble');
  const panel    = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const input    = document.getElementById('chatInput');
  const sendBtn  = document.getElementById('chatSend');
  const messagesEl = document.getElementById('chatMessages');

  if (!bubble || !panel) return;   /* not on index.html */

  /* conversation history sent to the API */
  let history = [];
  let opened  = false;

  /* ── open / close ── */
  function openChat() {
    panel.classList.remove('hidden');
    opened = true;
    if (history.length === 0) showWelcome();
    input.focus();
  }

  function closeChat() {
    panel.classList.add('hidden');
  }

  bubble.addEventListener('click', () => panel.classList.contains('hidden') ? openChat() : closeChat());
  closeBtn.addEventListener('click', closeChat);

  /* ── welcome message ── */
  function showWelcome() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    appendMsg('bot', t.chat_welcome);
  }

  /* ── append a message bubble ── */
  function appendMsg(role, text) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (role === 'bot' ? 'chat-msg-bot' : 'chat-msg-user');
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  /* ── typing indicator ── */
  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg-bot chat-msg-typing';
    div.id = 'chatTyping';
    div.innerHTML = '<span class="chat-dot"></span><span class="chat-dot"></span><span class="chat-dot"></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() {
    const el = document.getElementById('chatTyping');
    if (el) el.remove();
  }

  /* ── fill booking form from AI action ── */
  function fillForm(data) {
    if (data.fullName) {
      const el = document.getElementById('fullName');
      if (el) el.value = data.fullName;
    }
    if (data.phone) {
      const el = document.getElementById('phone');
      if (el) el.value = data.phone;
    }
    if (data.tripDate) {
      const el = document.getElementById('tripDate');
      if (el) el.value = data.tripDate;
    }
    if (data.tripTime) {
      const el = document.getElementById('tripTime');
      if (el) el.value = data.tripTime;
    }
    if (data.tripType) {
      const radio = document.querySelector(`input[name="tripType"][value="${data.tripType}"]`);
      if (radio) radio.checked = true;
    }
    if (data.driverChoice) {
      const radio = document.querySelector(`input[name="driverChoice"][value="${data.driverChoice}"]`);
      if (radio) radio.checked = true;
    }

    /* show green notice */
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    const notice = document.createElement('div');
    notice.className = 'chat-form-filled-notice';
    notice.textContent = t.chat_form_filled;
    messagesEl.appendChild(notice);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    /* scroll page to form */
    const form = document.getElementById('bookNow');
    if (form) setTimeout(() => form.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
  }

  /* ── send a message ── */
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    sendBtn.disabled = true;

    appendMsg('user', text);
    history.push({ role: 'user', content: text });

    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history, lang: currentLang }),
      });
      const data = await res.json();
      hideTyping();

      const reply = data.reply || '';
      if (reply) {
        appendMsg('bot', reply);
        history.push({ role: 'assistant', content: reply });
      }

      if (data.action?.type === 'fill_form') {
        fillForm(data.action.data);
      }
    } catch (err) {
      hideTyping();
      appendMsg('bot', '⚠️ Network error. Please try again.');
      console.error(err);
    }

    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  /* re-show welcome in correct language when language changes */
  const _origApplyLang = applyLanguage;
  applyLanguage = function(lang) {
    _origApplyLang(lang);
    /* if chat was never opened just leave it; welcome shown on first open */
  };
})();
