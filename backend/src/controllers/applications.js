const fs = require('fs'), path = require('path');
const db = require('../config/db');
const { ROOT } = require('../config/upload');
const { wrap } = require('./crud');
const STATUSES = ['new', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected'];
const bad = (res, msg, code = 400) => res.status(code).json({ success: false, message: msg });
const withJob = () => db('career_applications as c').leftJoin('jobs as j', 'j.id', 'c.job_id');
const shape = (r) => { r.has_resume = !!r.resume_url; return r; };

exports.list = wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)), f = req.query;
  const base = () => {
    const q = withJob();
    if (f.q) q.where((w) => w.where('c.name', 'like', `%${f.q}%`).orWhere('c.email', 'like', `%${f.q}%`));
    if (f.job_id) q.where('c.job_id', f.job_id); if (f.status) q.where('c.status', f.status);
    if (f.date_from) q.where('c.created_at', '>=', `${f.date_from} 00:00:00`); if (f.date_to) q.where('c.created_at', '<=', `${f.date_to} 23:59:59`);
    return q;
  };
  const total = Number((await base().count({ c: 'c.id' }).first()).c);
  const data = (await base().select('c.*', 'j.title as job_title').orderBy('c.id', 'desc').limit(limit).offset((page - 1) * limit)).map(shape);
  res.json({ success: true, data, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});
exports.get = wrap(async (req, res) => { const r = await withJob().where('c.id', req.params.id).select('c.*', 'j.title as job_title').first(); r ? res.json({ success: true, data: shape(r) }) : bad(res, 'Not found', 404); });
exports.update = wrap(async (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return bad(res, 'Unknown status');
  const n = await db('career_applications').where({ id: req.params.id }).update({ status, updated_at: db.fn.now() });
  n ? res.json({ success: true }) : bad(res, 'Not found', 404);
});
exports.remove = wrap(async (req, res) => {
  const r = await db('career_applications').where({ id: req.params.id }).first(); if (!r) return bad(res, 'Not found', 404);
  if (r.resume_url) fs.unlink(path.join(ROOT, 'resumes', path.basename(r.resume_url)), () => {});
  await db('career_applications').where({ id: r.id }).del(); res.json({ success: true });
});
