const jwt = require('jsonwebtoken');
const secret = () => { if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set'); return process.env.JWT_SECRET; };
exports.sign = (a) => jwt.sign({ id: a.id, email: a.email, role: a.role }, secret(), { expiresIn: process.env.JWT_EXPIRES || '12h' });
exports.requireAuth = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ message: 'Login required' });
  try { req.admin = jwt.verify(h.slice(7), secret()); next(); } catch { res.status(401).json({ message: 'Session expired, please log in again' }); }
};
