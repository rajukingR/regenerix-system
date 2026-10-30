const crypto = require('crypto');
const db = require('../config/db');
const m = require('../models');
const { notifyAdmins } = require('../models/notifications');
const { wrap } = require('./crud');
const { pad, clean, isEmail, phoneOk, today, nowHM, validDate, dateStr } = require('../config/util');

const STATUSES = ['pending', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show'];
const FREES_SLOT = ['cancelled', 'no_show'];
const isDup = (e) => e.code === 'ER_DUP_ENTRY' || /UNIQUE constraint/.test(e.message || '');
const bad = (res, msg, code = 400) => res.status(code).json({ success: false, message: msg });

// Opening hours come from the settings table (slot_start, slot_end, slot_minutes, slot_sunday_start, slot_sunday_end).
const toMin = (t) => { const [h, mi] = String(t || '').split(':').map(Number); return h * 60 + (mi || 0); };
function daySlots(date, st) {
  const [a, b] = new Date(`${date}T00:00:00`).getDay() === 0 ? [st.slot_sunday_start, st.slot_sunday_end] : [st.slot_start, st.slot_end];
  if (!a || !b) return [];
  const step = Math.max(10, Number(st.slot_minutes) || 30), out = [];
  for (let x = toMin(a); x + step <= toMin(b); x += step) out.push(`${pad(Math.floor(x / 60))}:${pad(x % 60)}`);
  return out;
}
const inWindow = (date, st) => { const max = new Date(); max.setDate(max.getDate() + (Number(st.booking_days_ahead) || 60)); return date >= today() && date <= dateStr(max); };
async function availability(date, st, exceptId) {
  const q = db('appointments').where({ appointment_date: date }).whereNotNull('slot_key'); if (exceptId) q.whereNot('id', exceptId);
  const taken = new Set((await q.select('appointment_time')).map((r) => r.appointment_time));
  const now = date === today() ? nowHM() : null;
  return daySlots(date, st).map((time) => ({ time, available: !taken.has(time) && !(now && time <= now) }));
}

// ---------- public ----------
exports.slots = wrap(async (req, res) => {
  const date = String(req.query.date || '');
  if (!validDate(date)) return bad(res, 'Choose a valid date');
  const st = await m.settings.all();
  res.json({ success: true, date, slots: inWindow(date, st) ? await availability(date, st) : [] });
});

exports.create = wrap(async (req, res) => {
  const b = req.body || {}, st = await m.settings.all();
  const name = clean(b.name, 120), email = clean(b.email, 190).toLowerCase(), phone = clean(b.phone, 30), date = clean(b.appointment_date, 10), time = clean(b.appointment_time, 5);
  if (!name || !isEmail(email) || !phoneOk(phone)) return bad(res, 'Enter your name, a valid email and a valid mobile number');
  if (!validDate(date) || !inWindow(date, st)) return bad(res, 'Choose a date within the booking window');
  const slot = (await availability(date, st)).find((s) => s.time === time);
  if (!slot) return bad(res, 'That time is outside our opening hours');
  if (!slot.available) return bad(res, 'That time slot is no longer available. Please choose another.', 409);
  let team = null;
  if (b.team_id) { team = await m.team.find(Number(b.team_id)); if (!team || !team.is_active) return bad(res, 'Selected specialist is not available'); }
  const reference = `RGX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  try {
    const id = await db.transaction(async (trx) => {
      const [id] = await trx('appointments').insert({ reference, name, email, phone, service: clean(b.service, 190) || null, team_id: team ? team.id : null, appointment_date: date, appointment_time: time,
        reason: clean(b.reason, 2000) || null, notes: clean(b.notes, 2000) || null, status: 'pending', slot_key: `${date}|${time}` });
      await trx('appointment_history').insert({ appointment_id: id, action: 'created', note: 'Booked from the website' });
      await notifyAdmins(trx, 'appointment_booking', 'A new appointment has been booked.', { appointment_id: id, reference, customer_name: name, appointment_date: date, appointment_time: time, service: clean(b.service, 190) || null });
      return id;
    });
    res.status(201).json({ success: true, id, reference, appointment_date: date, appointment_time: time });
  } catch (e) { if (isDup(e)) return bad(res, 'That time slot was just taken. Please choose another.', 409); throw e; }
});

// ---------- admin ----------
const one = async (id) => {
  const a = await db('appointments as a').leftJoin('team_members as t', 't.id', 'a.team_id').where('a.id', id).select('a.*', 't.name as team_name').first();
  if (!a) return null;
  a.history = await db('appointment_history').where({ appointment_id: id }).orderBy('id', 'desc'); return a;
};
exports.adminList = wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)), f = req.query;
  const base = () => {
    const q = db('appointments as a').leftJoin('team_members as t', 't.id', 'a.team_id');
    if (f.q) q.where((w) => ['a.name', 'a.email', 'a.phone', 'a.reference'].forEach((c) => w.orWhere(c, 'like', `%${f.q}%`)));
    if (f.status) q.where('a.status', f.status); if (f.service) q.where('a.service', f.service); if (f.team_id) q.where('a.team_id', f.team_id);
    if (f.date_from) q.where('a.appointment_date', '>=', f.date_from); if (f.date_to) q.where('a.appointment_date', '<=', f.date_to);
    return q;
  };
  const total = Number((await base().count({ c: 'a.id' }).first()).c);
  const data = await base().select('a.*', 't.name as team_name').orderBy([{ column: 'a.appointment_date', order: 'desc' }, { column: 'a.appointment_time', order: 'desc' }]).limit(limit).offset((page - 1) * limit);
  res.json({ success: true, data, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});
exports.adminGet = wrap(async (req, res) => { const a = await one(req.params.id); a ? res.json({ success: true, data: a }) : bad(res, 'Not found', 404); });
exports.adminUpdate = wrap(async (req, res) => {
  const id = Number(req.params.id), a = await db('appointments').where({ id }).first(), b = req.body || {};
  if (!a) return bad(res, 'Not found', 404);
  if (b.status && !STATUSES.includes(b.status)) return bad(res, 'Unknown status');
  const date = b.appointment_date || a.appointment_date, time = b.appointment_time || a.appointment_time;
  const moved = date !== a.appointment_date || time !== a.appointment_time;
  let status = b.status || a.status, note = clean(b.note, 500);
  if (moved) {
    const st = await m.settings.all();
    if (!validDate(date) || date < today()) return bad(res, 'Choose a valid future date');
    const slot = (await availability(date, st, id)).find((s) => s.time === time);
    if (!slot || !slot.available) return bad(res, 'That time slot is not available', 409);
    if (!b.status) status = 'rescheduled';
    note = note || `Moved from ${a.appointment_date} ${a.appointment_time} to ${date} ${time}`;
  }
  const upd = { appointment_date: date, appointment_time: time, status, slot_key: FREES_SLOT.includes(status) ? null : `${date}|${time}`, updated_at: db.fn.now() };
  if (b.notes !== undefined) upd.notes = clean(b.notes, 2000) || null;
  try {
    await db.transaction(async (trx) => {
      await trx('appointments').where({ id }).update(upd);
      if (moved || status !== a.status || note) await trx('appointment_history').insert({ appointment_id: id, action: moved ? 'rescheduled' : status, note: note || null, admin_id: req.admin.id });
    });
  } catch (e) { if (isDup(e)) return bad(res, 'That time slot is already booked', 409); throw e; }
  res.json({ success: true, data: await one(id) });
});
exports.adminRemove = wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await db('appointments').where({ id }).first())) return bad(res, 'Not found', 404);
  await db.transaction(async (trx) => { await trx('appointment_history').where({ appointment_id: id }).del(); await trx('appointments').where({ id }).del(); });
  res.json({ success: true });
});
