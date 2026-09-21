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
    lbl_need_car:   'Need a Car?',
    need_car_no:    '🚶 No, driver only',
    need_car_yes:   '🚗 Yes, need a car',
    lbl_car_size:   'Car Size',
    car_small:      '🚗 Small',
    car_medium:     '🚙 Medium',
    car_large:      '🚐 Large',
    btn_confirm:    '🚗 Confirm Booking',
    btn_urgent:     '📞 Urgent? Call TotahDa Now',
    modal_title:    'Booking Confirmed! 🎉',
    modal_btn:      'Book Another Ride',
    ph_name:        'e.g. Jane Doe',
    ph_phone:       'e.g. +1 555 000 1234',
    /* chat wizard */
    chat_bubble_label:  '⚡ Fast Book',
    chat_title:         'Book a Driver',
    chat_input_ph:      'Type your answer…',
    chat_welcome:       "Hi! 👋 I'll help you book a driver in just a few steps. Let's get started!",
    chat_form_filled:   '✅ All set! Tap "Confirm Booking" to finalise.',
    cw_ask_name:        "What's your full name?",
    cw_ask_phone:       'What is your phone number?',
    cw_ask_date:        'What date do you need the driver? (e.g. tomorrow, 25/06/2025)',
    cw_ask_time:        'What time? (e.g. 10am, 2:30 PM)',
    cw_ask_trip_type:   'Is this a Short Trip or a Long Trip?',
    cw_ask_driver_choice: 'Do you want a Regular driver or Any available driver?',
    cw_err_name:        "Please enter your full name (at least 2 characters).",
    cw_err_phone:       'Please enter a valid phone number.',
    cw_err_date:        "I didn't catch that date. Try: tomorrow, 25/06/2025, or 2025-06-25.",
    cw_err_date_past:   "That date is in the past. Please choose today or a future date.",
    cw_err_time:        "I didn't catch that time. Try: 10am, 2:30 PM, or 14:00.",
    cw_err_trip_type:   'Please choose Short Trip or Long Trip.',
    cw_err_driver_choice: 'Please choose Regular or Any.',
    cw_short_trip:      'Short Trip',
    cw_long_trip:       'Long Trip',
    cw_regular:         'Regular',
    cw_any:             'Any',
    cw_today:           'Today',
    cw_tomorrow:        'Tomorrow',
    cw_summary_header:  "Here's your booking summary:",
    cw_restart:         '🔄 Start Over',
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
    adm_logs_btn:          '📋 Logs',
    adm_clear_btn:         'Clear All',
    adm_th_name:           'Name',
    adm_th_phone:          'Phone',
    adm_th_date:           'Date',
    adm_th_time:           'Time',
    adm_th_trip:           'Trip',
    adm_th_choice:         'Choice',
    adm_th_car:            'Car',
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
    adm_new_bk_btn_bar:    '＋ New Booking',
    adm_new_bk_title:      'New Booking',
    adm_new_bk_btn:        '📋 Create Booking',
    adm_edit_bk_title:     'Edit Booking',
    adm_edit_bk_btn:       '💾 Save Changes',
    adm_bk_lbl_name:       'Full Name',
    adm_bk_lbl_phone:      'Phone Number',
    adm_bk_lbl_date:       'Trip Date',
    adm_bk_lbl_time:       'Trip Time',
    adm_bk_lbl_trip_type:  'Trip Type',
    adm_bk_lbl_choice:     'Driver Choice',
    adm_bk_lbl_status:     'Status',
    adm_bk_lbl_need_car:   'Need a Car?',
    adm_bk_lbl_car_size:   'Car Size',
    adm_bk_ph_name:        'e.g. Rahela Begum',
    adm_bk_ph_phone:       'e.g. +880 1700 000000',
    adm_bk_opt_short:      'Short Trip',
    adm_bk_opt_long:       'Long Trip',
    adm_bk_opt_regular:    'Regular',
    adm_bk_opt_any:        'Any',
    adm_bk_opt_confirmed:  'Confirmed',
    adm_bk_opt_pending:    'Pending',
    adm_bk_opt_cancelled:  'Cancelled',
    adm_bk_opt_no_car:     'No — driver only',
    adm_bk_opt_yes_car:    'Yes — need a car',
    adm_bk_opt_small:      'Small',
    adm_bk_opt_medium:     'Medium',
    adm_bk_opt_large:      'Large',
    adm_download_csv:      '⬇ Download CSV',
    /* stats bar */
    adm_stat_total:        'Total Bookings',
    adm_stat_confirmed:    'Confirmed',
    adm_stat_pending:      'Pending',
    adm_stat_cancelled:    'Cancelled',
    adm_stat_today:        "Today's Rides",
    /* logs modal */
    adm_logs_title:        '📋 Admin Activity Logs',
    adm_logs_clear_btn:    '🗑 Clear Logs',
    adm_logs_empty:        'No activity logged yet.',
    adm_logs_close:        'Close',
    /* clear-logs PIN modal */
    adm_clrlogs_title:     'Confirm PIN',
    adm_clrlogs_body:      'Enter your Admin PIN to clear all logs.',
    adm_clrlogs_lbl:       'Admin PIN',
    adm_clrlogs_btn:       'Clear Logs',
    adm_clrlogs_err_pin:   'Incorrect PIN. Please try again.',
    /* SMS modal */
    adm_sms_sending_body:  'Please wait while the message is being sent.',
    adm_sms_sent_title:    'SMS Sent!',
    adm_sms_preview_title: 'SMS Preview (Not Sent)',
    adm_sms_preview_body:  'Twilio not configured. Copy the message below to send manually.',
    adm_sms_fail_title:    'SMS Failed',
    /* login PIN error */
    adm_login_err_pin:     'Incorrect PIN. Please try again.',
    /* log action labels */
    adm_log_status_changed:  'Status Changed',
    adm_log_driver_assigned: 'Driver Assigned',
    adm_log_unassigned:      'Unassigned',
    adm_log_field_updated:   'Field Updated',
    adm_log_sms_sent:        'SMS Sent',
    adm_log_booking_edited:  'Booking Edited',
    adm_log_booking_deleted: 'Booking Deleted',
    adm_log_booking_created: 'Booking Created (Admin)',
    adm_log_driver_added:    'Driver Added',
    adm_log_driver_updated:  'Driver Updated',
    adm_log_driver_removed:  'Driver Removed',
    adm_log_logs_cleared:    'Logs Cleared',
    adm_log_all_cleared:     'All Bookings Cleared',
    adm_log_all_cleared_detail: 'Admin cleared entire bookings list',
    adm_clear_confirm:       'Are you sure you want to delete ALL bookings? This cannot be undone.',
    adm_drv_save_err:        'Could not save driver.',
    adm_drv_remove_confirm:  'Remove "{name}" from the driver list? Existing bookings will keep the name.',
    /* driver modal titles & errors */
    adm_drv_modal_add:       'Add Driver',
    adm_drv_modal_edit:      'Edit Driver',
    adm_drv_err_name:        'Please enter a driver name.',
    adm_drv_err_exists:      'A driver with this name already exists.',
    adm_edit:                'Edit',
    /* booking count bar */
    adm_count_empty:         'No bookings yet.',
    adm_count_total:         '{n} bookings total',
    /* table badges */
    adm_today_badge:         'Today',
    adm_clash_badge:         'Clash',
    adm_on_leave:            'On Leave',
    /* booking form validation */
    adm_bk_err_name:         'Full name is required.',
    adm_bk_err_phone:        'Phone number is required.',
    adm_bk_err_date:         'Trip date is required.',
    adm_bk_err_time:         'Trip time is required.',
    /* report */
    adm_report_empty:        'No bookings found for {month} {year}{driver}.',
    adm_report_unassigned:   '(Unassigned)',
    adm_report_bk_count:     '{n} bookings',
    /* leave plans */
    adm_leave_title:         '🗓️ Leave Plans',
    adm_leave_sub:           'Track driver leave dates. Drivers on leave will be unavailable in the assignment dropdown.',
    adm_leave_add_btn:       '＋ Add Leave',
    adm_leave_th_driver:     'Driver',
    adm_leave_th_from:       'From',
    adm_leave_th_to:         'To',
    adm_leave_th_reason:     'Reason',
    adm_leave_th_action:     'Action',
    adm_leave_empty:         'No leave plans recorded. Drivers are all available.',
    adm_leave_lbl_driver:    'Driver',
    adm_leave_lbl_from:      'From Date',
    adm_leave_lbl_to:        'To Date',
    adm_leave_lbl_reason:    'Reason',
    adm_leave_modal_add:     'Add Leave Plan',
    adm_leave_modal_edit:    'Edit Leave Plan',
    adm_leave_select_driver: '— Select Driver —',
    adm_leave_remove:        'Remove',
    adm_leave_err_driver:    'Please select a driver.',
    adm_leave_err_from:      'Please set a start date.',
    adm_leave_err_to:        'Please set an end date.',
    adm_leave_err_date_order:'End date must be on or after start date.',
    adm_leave_remove_confirm:'Remove leave plan for "{driver}" ({from} → {to})?',
    adm_log_leave_added:     'Leave Added',
    adm_log_leave_updated:   'Leave Updated',
    adm_log_leave_removed:   'Leave Removed',
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
    lbl_need_car:   'গাড়ি দরকার?',
    need_car_no:    '🚶 না, শুধু ড্রাইভার',
    need_car_yes:   '🚗 হ্যাঁ, গাড়ি দরকার',
    lbl_car_size:   'গাড়ির আকার',
    car_small:      '🚗 ছোট',
    car_medium:     '🚙 মাঝারি',
    car_large:      '🚐 বড়',
    btn_confirm:    '🚗 বুকিং নিশ্চিত করুন',
    btn_urgent:     '📞 জরুরি? এখনই TotahDa-কে কল করুন',
    modal_title:    'বুকিং নিশ্চিত হয়েছে! 🎉',
    modal_btn:      'আরেকটি যাত্রা বুক করুন',
    ph_name:        'যেমন: রাহেলা বেগম',
    ph_phone:       'যেমন: +880 1700 000000',
    /* chat wizard */
    chat_bubble_label:  '⚡ ফাস্ট বুক',
    chat_title:         'ড্রাইভার বুক করুন',
    chat_input_ph:      'আপনার উত্তর লিখুন…',
    chat_welcome:       'হ্যালো! 👋 আমি কয়েকটি প্রশ্নের মাধ্যমে আপনাকে ড্রাইভার বুক করতে সাহায্য করব। শুরু করা যাক!',
    chat_form_filled:   '✅ সব ঠিক আছে! বুকিং নিশ্চিত করতে "বুকিং নিশ্চিত করুন" বাটনে ট্যাপ করুন।',
    cw_ask_name:        'আপনার পূর্ণ নাম কী?',
    cw_ask_phone:       'আপনার ফোন নম্বর কী?',
    cw_ask_date:        'কোন তারিখে ড্রাইভার দরকার? (যেমন: আগামীকাল, ২৫/০৬/২০২৫)',
    cw_ask_time:        'কোন সময়ে? (যেমন: সকাল ১০টা, বিকেল ২:৩০)',
    cw_ask_trip_type:   'এটি কি ছোট ট্রিপ না লম্বা ট্রিপ?',
    cw_ask_driver_choice: 'আপনি কি নিয়মিত ড্রাইভার চান নাকি যেকোনো ড্রাইভার?',
    cw_err_name:        'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন (কমপক্ষে ২ অক্ষর)।',
    cw_err_phone:       'অনুগ্রহ করে একটি সঠিক ফোন নম্বর দিন।',
    cw_err_date:        'তারিখটি বুঝতে পারিনি। এভাবে চেষ্টা করুন: আগামীকাল, ২৫/০৬/২০২৫, বা 2025-06-25।',
    cw_err_date_past:   'এই তারিখটি অতীতে। আজকের বা ভবিষ্যতের তারিখ বেছে নিন।',
    cw_err_time:        'সময়টি বুঝতে পারিনি। এভাবে চেষ্টা করুন: সকাল ১০টা, 2:30 PM, বা 14:00।',
    cw_err_trip_type:   'অনুগ্রহ করে ছোট ট্রিপ বা লম্বা ট্রিপ বেছে নিন।',
    cw_err_driver_choice: 'অনুগ্রহ করে নিয়মিত বা যেকোনো বেছে নিন।',
    cw_short_trip:      'ছোট ট্রিপ',
    cw_long_trip:       'লম্বা ট্রিপ',
    cw_regular:         'নিয়মিত',
    cw_any:             'যেকোনো',
    cw_today:           'আজ',
    cw_tomorrow:        'আগামীকাল',
    cw_summary_header:  'আপনার বুকিং সারসংক্ষেপ:',
    cw_restart:         '🔄 আবার শুরু করুন',
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
    adm_logs_btn:          '📋 লগ',
    adm_clear_btn:         'সব মুছুন',
    adm_th_name:           'নাম',
    adm_th_phone:          'ফোন',
    adm_th_date:           'তারিখ',
    adm_th_time:           'সময়',
    adm_th_trip:           'ট্রিপ',
    adm_th_choice:         'পছন্দ',
    adm_th_car:            'গাড়ি',
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
    adm_new_bk_btn_bar:    '＋ নতুন বুকিং',
    adm_new_bk_title:      'নতুন বুকিং',
    adm_new_bk_btn:        '📋 বুকিং তৈরি করুন',
    adm_edit_bk_title:     'বুকিং সম্পাদনা',
    adm_edit_bk_btn:       '💾 পরিবর্তন সংরক্ষণ করুন',
    adm_bk_lbl_name:       'পূর্ণ নাম',
    adm_bk_lbl_phone:      'ফোন নম্বর',
    adm_bk_lbl_date:       'যাত্রার তারিখ',
    adm_bk_lbl_time:       'যাত্রার সময়',
    adm_bk_lbl_trip_type:  'ট্রিপের ধরন',
    adm_bk_lbl_choice:     'ড্রাইভার পছন্দ',
    adm_bk_lbl_status:     'অবস্থা',
    adm_bk_lbl_need_car:   'গাড়ি দরকার?',
    adm_bk_lbl_car_size:   'গাড়ির আকার',
    adm_bk_ph_name:        'যেমন: রাহেলা বেগম',
    adm_bk_ph_phone:       'যেমন: +880 1700 000000',
    adm_bk_opt_short:      'ছোট ট্রিপ',
    adm_bk_opt_long:       'লম্বা ট্রিপ',
    adm_bk_opt_regular:    'নিয়মিত',
    adm_bk_opt_any:        'যেকোনো',
    adm_bk_opt_confirmed:  'নিশ্চিত',
    adm_bk_opt_pending:    'অপেক্ষমাণ',
    adm_bk_opt_cancelled:  'বাতিল',
    adm_bk_opt_no_car:     'না — শুধু ড্রাইভার',
    adm_bk_opt_yes_car:    'হ্যাঁ — গাড়ি দরকার',
    adm_bk_opt_small:      'ছোট',
    adm_bk_opt_medium:     'মাঝারি',
    adm_bk_opt_large:      'বড়',
    /* stats bar */
    adm_stat_total:        'মোট বুকিং',
    adm_stat_confirmed:    'নিশ্চিত',
    adm_stat_pending:      'অপেক্ষমাণ',
    adm_stat_cancelled:    'বাতিল',
    adm_stat_today:        'আজকের যাত্রা',
    /* logs modal */
    adm_logs_title:        '📋 অ্যাডমিন কার্যক্রম লগ',
    adm_logs_clear_btn:    '🗑 লগ মুছুন',
    adm_logs_empty:        'এখনো কোনো কার্যক্রম লগ হয়নি।',
    adm_logs_close:        'বন্ধ করুন',
    /* clear-logs PIN modal */
    adm_clrlogs_title:     'পিন নিশ্চিত করুন',
    adm_clrlogs_body:      'সমস্ত লগ মুছতে আপনার অ্যাডমিন পিন দিন।',
    adm_clrlogs_lbl:       'অ্যাডমিন পিন',
    adm_clrlogs_btn:       'লগ মুছুন',
    adm_clrlogs_err_pin:   'ভুল পিন। আবার চেষ্টা করুন।',
    /* SMS modal */
    adm_sms_sending_body:  'বার্তা পাঠানো হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন।',
    adm_sms_sent_title:    'এসএমএস পাঠানো হয়েছে!',
    adm_sms_preview_title: 'এসএমএস প্রিভিউ (পাঠানো হয়নি)',
    adm_sms_preview_body:  'Twilio কনফিগার করা নেই। নিচের বার্তাটি কপি করে ম্যানুয়ালি পাঠান।',
    adm_sms_fail_title:    'এসএমএস ব্যর্থ হয়েছে',
    /* login PIN error */
    adm_login_err_pin:     'ভুল পিন। আবার চেষ্টা করুন।',
    /* log action labels */
    adm_log_status_changed:  'স্ট্যাটাস পরিবর্তন',
    adm_log_driver_assigned: 'ড্রাইভার নির্ধারিত',
    adm_log_unassigned:      'অনির্ধারিত',
    adm_log_field_updated:   'তথ্য আপডেট',
    adm_log_sms_sent:        'এসএমএস পাঠানো হয়েছে',
    adm_log_booking_edited:  'বুকিং সম্পাদিত',
    adm_log_booking_deleted: 'বুকিং মুছে ফেলা হয়েছে',
    adm_log_booking_created: 'বুকিং তৈরি হয়েছে (অ্যাডমিন)',
    adm_log_driver_added:    'ড্রাইভার যোগ করা হয়েছে',
    adm_log_driver_updated:  'ড্রাইভার আপডেট হয়েছে',
    adm_log_driver_removed:  'ড্রাইভার সরানো হয়েছে',
    adm_log_logs_cleared:    'লগ মুছে ফেলা হয়েছে',
    adm_log_cleared_detail:  'অ্যাডমিন সমস্ত কার্যক্রম লগ মুছে ফেলেছেন',
    adm_log_all_cleared:     'সব বুকিং মুছে ফেলা হয়েছে',
    adm_log_all_cleared_detail: 'অ্যাডমিন সম্পূর্ণ বুকিং তালিকা মুছে ফেলেছেন',
    adm_clear_confirm:       'আপনি কি নিশ্চিত যে সমস্ত বুকিং মুছে ফেলবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।',
    adm_drv_save_err:        'ড্রাইভার সংরক্ষণ করা যায়নি।',
    adm_drv_remove_confirm:  '"{name}" কে ড্রাইভার তালিকা থেকে সরাবেন? বিদ্যমান বুকিংয়ে নামটি থাকবে।',
    /* driver modal titles & errors */
    adm_drv_modal_add:       'ড্রাইভার যোগ করুন',
    adm_drv_modal_edit:      'ড্রাইভার সম্পাদনা',
    adm_drv_err_name:        'অনুগ্রহ করে ড্রাইভারের নাম লিখুন।',
    adm_drv_err_exists:      'এই নামে একজন ড্রাইভার ইতিমধ্যে আছে।',
    adm_edit:                'সম্পাদনা',
    /* booking count bar */
    adm_count_empty:         'এখনো কোনো বুকিং নেই।',
    adm_count_total:         'মোট {n}টি বুকিং',
    /* table badges */
    adm_today_badge:         'আজ',
    adm_clash_badge:         'সংঘর্ষ',
    adm_on_leave:            'ছুটিতে',
    /* booking form validation */
    adm_bk_err_name:         'পূর্ণ নাম আবশ্যক।',
    adm_bk_err_phone:        'ফোন নম্বর আবশ্যক।',
    adm_bk_err_date:         'যাত্রার তারিখ আবশ্যক।',
    adm_bk_err_time:         'যাত্রার সময় আবশ্যক।',
    /* report */
    adm_report_empty:        '{month} {year}{driver} এর জন্য কোনো বুকিং পাওয়া যায়নি।',
    adm_report_unassigned:   '(অনির্ধারিত)',
    adm_report_bk_count:     '{n}টি বুকিং',
    /* leave plans */
    adm_leave_title:         '🗓️ ছুটির পরিকল্পনা',
    adm_leave_sub:           'ড্রাইভারের ছুটির তারিখ ট্র্যাক করুন। ছুটিতে থাকা ড্রাইভার নিয়োগ ড্রপডাউনে উপলব্ধ থাকবে না।',
    adm_leave_add_btn:       '＋ ছুটি যোগ করুন',
    adm_leave_th_driver:     'ড্রাইভার',
    adm_leave_th_from:       'শুরু',
    adm_leave_th_to:         'শেষ',
    adm_leave_th_reason:     'কারণ',
    adm_leave_th_action:     'অ্যাকশন',
    adm_leave_empty:         'কোনো ছুটির পরিকল্পনা নেই। সব ড্রাইভার উপলব্ধ।',
    adm_leave_lbl_driver:    'ড্রাইভার',
    adm_leave_lbl_from:      'শুরুর তারিখ',
    adm_leave_lbl_to:        'শেষ তারিখ',
    adm_leave_lbl_reason:    'কারণ',
    adm_leave_modal_add:     'ছুটির পরিকল্পনা যোগ করুন',
    adm_leave_modal_edit:    'ছুটির পরিকল্পনা সম্পাদনা',
    adm_leave_select_driver: '— ড্রাইভার বেছে নিন —',
    adm_leave_remove:        'সরান',
    adm_leave_err_driver:    'অনুগ্রহ করে একজন ড্রাইভার বেছে নিন।',
    adm_leave_err_from:      'শুরুর তারিখ দিন।',
    adm_leave_err_to:        'শেষ তারিখ দিন।',
    adm_leave_err_date_order:'শেষ তারিখ শুরুর তারিখের পরে বা সমান হতে হবে।',
    adm_leave_remove_confirm:'"{driver}" এর ছুটির পরিকল্পনা সরাবেন ({from} → {to})?',
    adm_log_leave_added:     'ছুটি যোগ করা হয়েছে',
    adm_log_leave_updated:   'ছুটি আপডেট হয়েছে',
    adm_log_leave_removed:   'ছুটি সরানো হয়েছে',
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
   Need-a-Car toggle  (index.html only)
───────────────────────────────────── */
function toggleCarSize(radio) {
  const group = document.getElementById('carSizeGroup');
  if (!group) return;
  if (radio.value === 'Yes') {
    group.classList.remove('hidden');
  } else {
    group.classList.add('hidden');
  }
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
    const noCar     = document.querySelector('input[name="needCar"][value="No"]');
    const smallCar  = document.querySelector('input[name="carSize"][value="Small"]');
    if (shortTrip) shortTrip.checked = true;
    if (regular)   regular.checked   = true;
    if (noCar)     noCar.checked     = true;
    if (smallCar)  smallCar.checked  = true;
    const carSizeGroup = document.getElementById('carSizeGroup');
    if (carSizeGroup) carSizeGroup.classList.add('hidden');
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
      needCar:      document.querySelector('input[name="needCar"]:checked').value,
      carSize:      document.querySelector('input[name="needCar"]:checked').value === 'Yes'
                      ? document.querySelector('input[name="carSize"]:checked').value
                      : '',
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
   Urgent Call  (index.html only)
───────────────────────────────────── */
(function initUrgentCall() {
  const btn = document.getElementById('urgentCallBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const origHtml = btn.innerHTML;
    btn.innerHTML = '📞 Calling…';

    try {
      const res  = await fetch('/api/call', { method: 'POST' });
      const data = await res.json();

      if (data.status === 'calling') {
        showCallToast('📞 Call placed! TotahDa will answer shortly.', 'success');
      } else if (data.status === 'unconfigured') {
        /* Twilio not set up — fall back to device dialer */
        window.location.href = 'tel:+919432670586';
        showCallToast('📞 Opening your dialler…', 'info');
      } else {
        showCallToast('⚠️ ' + (data.error || 'Could not place call. Try again.'), 'error');
      }
    } catch (err) {
      /* Network failure — fall back to device dialler */
      window.location.href = 'tel:+919432670586';
      showCallToast('📞 Opening your dialler…', 'info');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  });

  function showCallToast(msg, type) {
    /* reuse existing sms-toast element if on same page, else create one */
    let toast = document.getElementById('callToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'callToast';
      toast.className = 'sms-toast hidden';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background =
      type === 'success' ? 'linear-gradient(135deg,#166534,#16a34a)'  :
      type === 'error'   ? 'linear-gradient(135deg,#991b1b,#dc2626)'  :
                           'linear-gradient(135deg,#0f1c3f,#1a3a8f)';
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add('hidden'), 4000);
  }
})();


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
   Booking Chat Wizard  (index.html only)
   No API key required — fully scripted.
───────────────────────────────────── */
(function initChat() {
  const bubble     = document.getElementById('chatBubble');
  const panel      = document.getElementById('chatPanel');
  const closeBtn   = document.getElementById('chatClose');
  const input      = document.getElementById('chatInput');
  const sendBtn    = document.getElementById('chatSend');
  const messagesEl = document.getElementById('chatMessages');

  if (!bubble || !panel) return; /* not on index.html */

  /* ── collected answers ── */
  const answers = {};

  /* ── step definitions ── */
  /* Each step: { key, ask(t), validate(val,t), parse(val), chips(t)? } */
  function getSteps(t) {
    const todayStr = new Date().toISOString().split('T')[0];
    return [
      {
        key: 'fullName',
        ask: () => t.cw_ask_name,
        validate: (v) => v.trim().length >= 2 ? null : t.cw_err_name,
        parse: (v) => v.trim(),
      },
      {
        key: 'phone',
        ask: () => t.cw_ask_phone,
        validate: (v) => /^[\d\s+\-()\[\]]{6,20}$/.test(v.trim()) ? null : t.cw_err_phone,
        parse: (v) => v.trim(),
      },
      {
        key: 'tripDate',
        ask: () => t.cw_ask_date,
        validate: (v) => {
          const d = parseDate(v.trim());
          if (!d) return t.cw_err_date;
          if (d < todayStr) return t.cw_err_date_past;
          return null;
        },
        parse: (v) => parseDate(v.trim()),
        chips: () => quickDateChips(t),
      },
      {
        key: 'tripTime',
        ask: () => t.cw_ask_time,
        validate: (v) => parseTime(v.trim()) ? null : t.cw_err_time,
        parse: (v) => parseTime(v.trim()),
        chips: () => [
          { label: '🌅 8:00 AM',  value: '08:00' },
          { label: '☀️ 10:00 AM', value: '10:00' },
          { label: '🌇 2:00 PM',  value: '14:00' },
          { label: '🌆 6:00 PM',  value: '18:00' },
        ],
      },
      {
        key: 'tripType',
        ask: () => t.cw_ask_trip_type,
        validate: (v) => {
          const s = v.toLowerCase().trim();
          const isLong  = s.includes('long') || s === t.cw_long_trip.toLowerCase();
          const isShort = s.includes('short') || s === t.cw_short_trip.toLowerCase();
          return (isLong || isShort) ? null : t.cw_err_trip_type;
        },
        parse: (v) => {
          const s = v.toLowerCase().trim();
          return (s.includes('long') || s === t.cw_long_trip.toLowerCase()) ? 'Long Trip' : 'Short Trip';
        },
        chips: () => [
          { label: '🏙️ ' + t.cw_short_trip, value: t.cw_short_trip },
          { label: '🛣️ ' + t.cw_long_trip,  value: t.cw_long_trip  },
        ],
      },
      {
        key: 'driverChoice',
        ask: () => t.cw_ask_driver_choice,
        validate: (v) => {
          const s = v.toLowerCase().trim();
          const isAny     = s === 'any' || s === t.cw_any.toLowerCase();
          const isRegular = s === 'regular' || s === t.cw_regular.toLowerCase();
          return (isAny || isRegular) ? null : t.cw_err_driver_choice;
        },
        parse: (v) => {
          const s = v.toLowerCase().trim();
          return (s === 'any' || s === t.cw_any.toLowerCase()) ? 'Any' : 'Regular';
        },
        chips: () => [
          { label: '⭐ ' + t.cw_regular, value: t.cw_regular },
          { label: '🎲 ' + t.cw_any,     value: t.cw_any     },
        ],
      },
    ];
  }

  /* ── date helpers ── */
  function parseDate(str) {
    /* Accept: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, "tomorrow", "today" */
    const today = new Date(); today.setHours(0,0,0,0);
    const s = str.toLowerCase().trim();
    if (s === 'today' || s === 'আজ') {
      return today.toISOString().split('T')[0];
    }
    if (s === 'tomorrow' || s === 'আগামীকাল') {
      const t = new Date(today); t.setDate(t.getDate() + 1);
      return t.toISOString().split('T')[0];
    }
    /* ISO */
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    /* DD/MM/YYYY or DD-MM-YYYY */
    const dm = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dm) {
      const [, d, m, y] = dm;
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    return null;
  }

  function parseTime(str) {
    /* Accept: HH:MM, H:MM, "10am", "2pm", "10:30 AM" */
    const s = str.toLowerCase().replace(/\s/g,'');
    const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
      if (ampm[3] === 'pm' && h !== 12) h += 12;
      if (ampm[3] === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }
    const hm = str.match(/^(\d{1,2}):(\d{2})$/);
    if (hm) {
      const h = parseInt(hm[1],10), m = parseInt(hm[2],10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }
    return null;
  }

  function quickDateChips(t) {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const d2 = new Date(today); d2.setDate(today.getDate() + 2);
    const fmt = d => d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
    return [
      { label: '📅 ' + t.cw_today,    value: today.toISOString().split('T')[0] },
      { label: '📅 ' + t.cw_tomorrow, value: tomorrow.toISOString().split('T')[0] },
      { label: '📅 ' + fmt(d2),       value: d2.toISOString().split('T')[0] },
    ];
  }

  /* ── state ── */
  let stepIndex = 0;
  let started   = false;

  /* ── DOM helpers ── */
  function appendMsg(role, html, isHtml = false) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (role === 'bot' ? 'chat-msg-bot' : 'chat-msg-user');
    if (isHtml) div.innerHTML = html; else div.textContent = html;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function appendChips(chips) {
    /* remove any existing chip row */
    const old = messagesEl.querySelector('.chat-chips');
    if (old) old.remove();

    const row = document.createElement('div');
    row.className = 'chat-chips';
    chips.forEach(({ label, value }) => {
      const btn = document.createElement('button');
      btn.className = 'chat-chip-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        row.remove();
        submitAnswer(value);
      });
      row.appendChild(btn);
    });
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeChips() {
    const el = messagesEl.querySelector('.chat-chips');
    if (el) el.remove();
  }

  function showTypingThen(ms, cb) {
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg-bot chat-msg-typing';
    div.innerHTML = '<span class="chat-dot"></span><span class="chat-dot"></span><span class="chat-dot"></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    setTimeout(() => { div.remove(); cb(); }, ms);
  }

  /* ── ask a step ── */
  function askStep() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    const steps = getSteps(t);
    if (stepIndex >= steps.length) { finishBooking(); return; }
    const step = steps[stepIndex];
    showTypingThen(420, () => {
      appendMsg('bot', step.ask());
      const chips = step.chips ? step.chips() : null;
      if (chips) appendChips(chips);
      setInputEnabled(true);
    });
  }

  /* ── submit an answer (from text input or chip) ── */
  function submitAnswer(raw) {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    const steps = getSteps(t);
    const step  = steps[stepIndex];

    removeChips();
    appendMsg('user', raw);
    setInputEnabled(false);

    const err = step.validate(raw, t);
    if (err) {
      showTypingThen(320, () => {
        appendMsg('bot', err);
        const chips = step.chips ? step.chips() : null;
        if (chips) appendChips(chips);
        setInputEnabled(true);
      });
      return;
    }

    answers[step.key] = step.parse(raw);
    stepIndex++;
    askStep();
  }

  /* ── finish: fill the form ── */
  function finishBooking() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

    /* summary card */
    showTypingThen(500, () => {
      const date = formatDate(answers.tripDate);
      const time = formatTime(answers.tripTime);
      const summary = `${t.cw_summary_header}\n\n` +
        `👤 ${answers.fullName}\n` +
        `📞 ${answers.phone}\n` +
        `📅 ${date}  🕐 ${time}\n` +
        `🚗 ${answers.tripType}  ·  ${answers.driverChoice}`;

      const div = document.createElement('div');
      div.className = 'chat-msg chat-msg-bot chat-summary';
      div.textContent = summary;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      /* fill the real form */
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
      set('fullName', answers.fullName);
      set('phone',    answers.phone);
      set('tripDate', answers.tripDate);
      set('tripTime', answers.tripTime);
      const tripRadio = document.querySelector(`input[name="tripType"][value="${answers.tripType}"]`);
      if (tripRadio) tripRadio.checked = true;
      const drvRadio = document.querySelector(`input[name="driverChoice"][value="${answers.driverChoice}"]`);
      if (drvRadio) drvRadio.checked = true;

      /* confirm button inside chat */
      setTimeout(() => {
        const notice = document.createElement('div');
        notice.className = 'chat-form-filled-notice';
        notice.textContent = t.chat_form_filled;
        messagesEl.appendChild(notice);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        const btnRow = document.createElement('div');
        btnRow.className = 'chat-chips';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'chat-chip-btn chat-chip-confirm';
        confirmBtn.textContent = t.btn_confirm;
        confirmBtn.addEventListener('click', () => {
          closeChat();
          const form = document.getElementById('bookNow');
          if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            const submitBtn = document.querySelector('#bookingForm [type="submit"]');
            if (submitBtn) submitBtn.click();
          }, 600);
        });

        const restartBtn = document.createElement('button');
        restartBtn.className = 'chat-chip-btn';
        restartBtn.textContent = t.cw_restart;
        restartBtn.addEventListener('click', () => restartChat());

        btnRow.appendChild(confirmBtn);
        btnRow.appendChild(restartBtn);
        messagesEl.appendChild(btnRow);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        input.style.display = 'none';
        sendBtn.style.display = 'none';
      }, 300);
    });
  }

  /* ── restart ── */
  function restartChat() {
    Object.keys(answers).forEach(k => delete answers[k]);
    stepIndex = 0;
    messagesEl.innerHTML = '';
    input.style.display  = '';
    sendBtn.style.display = '';
    setInputEnabled(false);
    start();
  }

  /* ── enable / disable text input ── */
  function setInputEnabled(on) {
    input.disabled    = !on;
    sendBtn.disabled  = !on;
    if (on) input.focus();
  }

  /* ── start the conversation ── */
  function start() {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    setInputEnabled(false);
    showTypingThen(500, () => {
      appendMsg('bot', t.chat_welcome);
      setTimeout(askStep, 300);
    });
  }

  /* ── open / close ── */
  function openChat() {
    panel.classList.remove('hidden');
    if (!started) { started = true; start(); }
    input.focus();
  }

  function closeChat() {
    panel.classList.add('hidden');
  }

  bubble.addEventListener('click', () => panel.classList.contains('hidden') ? openChat() : closeChat());
  closeBtn.addEventListener('click', closeChat);

  /* ── handle typed input ── */
  function handleSend() {
    const text = input.value.trim();
    if (!text || input.disabled) return;
    input.value = '';
    submitAnswer(text);
  }

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
})();
