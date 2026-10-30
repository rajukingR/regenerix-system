const bcrypt = require('bcryptjs');
const m = require('../models');
const { sign } = require('../config/auth');
const { wrap } = require('./crud');
const safe = (a) => ({ id: a.id, name: a.name, email: a.email, role: a.role });
exports.login = wrap(async (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const a = await m.admins.findBy('email', String(email).trim().toLowerCase());
  // same message for unknown email and wrong password
  if (!a || !(await bcrypt.compare(String(password), a.password))) return res.status(401).json({ message: 'Invalid email or password' });
  res.json({ token: sign(a), admin: safe(a) });
});
exports.me = wrap(async (req, res) => { const a = await m.admins.find(req.admin.id); a ? res.json(safe(a)) : res.status(401).json({ message: 'Account not found' }); });
exports.changePassword = wrap(async (req, res) => {
  const { current = '', next = '' } = req.body || {};
  const a = await m.admins.find(req.admin.id);
  if (!(await bcrypt.compare(String(current), a.password))) return res.status(400).json({ message: 'Current password is incorrect' });
  if (String(next).length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
  await m.admins.update(a.id, { password: await bcrypt.hash(String(next), 12) });
  res.json({ ok: true });
});
