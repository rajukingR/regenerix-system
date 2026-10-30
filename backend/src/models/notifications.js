const db = require('../config/db');
const shape = (r) => {
  if (!r) return r;
  if (typeof r.detail === 'string') { try { r.detail = JSON.parse(r.detail); } catch { r.detail = null; } }
  r.is_read = r.is_read ? 1 : 0; return r;
};
// Called INSIDE the same transaction that saves the appointment / application, so a notification exists if and only if the record was saved.
exports.notifyAdmins = async (trx, type, message, detail, photo = null) => {
  const admins = await trx('admins').where({ role: 'admin' }).select('id'); // every admin account; nothing is hard-coded
  if (admins.length) await trx('notifications').insert(admins.map((a) => ({ user_id: a.id, message, message_type: type, is_read: 0, detail: JSON.stringify(detail || {}), photo })));
};
exports.listFor = async (userId, limit) => (await db('notifications').where({ user_id: userId }).orderBy('id', 'desc').limit(limit)).map(shape);
exports.unread = async (userId) => Number((await db('notifications').where({ user_id: userId, is_read: 0 }).count({ c: '*' }).first()).c);
exports.markRead = async (id, userId) => { // only the owner's row is touched; anyone else's id looks like "not found"
  const row = await db('notifications').where({ id, user_id: userId }).first(); if (!row) return null;
  if (!row.is_read) await db('notifications').where({ id }).update({ is_read: 1 }); return shape({ ...row, is_read: 1 });
};
exports.markAllRead = (userId) => db('notifications').where({ user_id: userId, is_read: 0 }).update({ is_read: 1 });
