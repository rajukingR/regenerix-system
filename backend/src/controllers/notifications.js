const N = require('../models/notifications');
const { wrap } = require('./crud');
exports.list = wrap(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  res.json({ success: true, notifications: await N.listFor(req.admin.id, limit), unread_count: await N.unread(req.admin.id) });
});
exports.unread = wrap(async (req, res) => res.json({ success: true, unread_count: await N.unread(req.admin.id) }));
exports.read = wrap(async (req, res) => {
  const n = await N.markRead(Number(req.params.id), req.admin.id);
  n ? res.json({ success: true, notification: n, unread_count: await N.unread(req.admin.id) }) : res.status(404).json({ success: false, message: 'Notification not found' });
});
exports.readAll = wrap(async (req, res) => { await N.markAllRead(req.admin.id); res.json({ success: true, unread_count: 0 }); });
