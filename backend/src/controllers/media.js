const fs = require('fs');
const path = require('path');
const { del } = require('@vercel/blob');

const m = require('../models');
const { ROOT } = require('../config/upload');
const { wrap } = require('./crud');

const fileOf = (url) =>
  path.join(
    ROOT,
    path.basename(path.dirname(url)),
    path.basename(url)
  );

exports.list = wrap(async (req, res) => {
  const all = await m.media.list();

  res.json(
    req.query.kind
      ? all.filter((item) => item.kind === req.query.kind)
      : all
  );
});

// Legacy local-disk upload.
// Retained for compatibility, but the new Vercel Blob
// Media Library should use direct uploads instead.
exports.upload = wrap(async (req, res) => {
  const out = [];
  const skipped = [];

  for (const f of req.files || []) {
    const kind = f.mimetype.startsWith('video')
      ? 'video'
      : 'image';

    if (kind === 'image' && f.size > 10 * 1024 * 1024) {
      fs.unlink(f.path, () => {});
      skipped.push(f.originalname);
      continue;
    }

    out.push(
      await m.media.create({
        filename: f.filename,
        original_name: f.originalname.slice(0, 190),
        url: `/uploads/${kind}s/${f.filename}`,
        mimetype: f.mimetype,
        kind,
        size: f.size,
      })
    );
  }

  res.status(201).json({ files: out, skipped });
});

exports.remove = wrap(async (req, res) => {
  const item = await m.media.find(req.params.id);

  if (!item) {
    return res.status(404).json({
      message: 'Media not found',
    });
  }

  if (/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//i.test(item.url)) {
    // Delete the persistent Blob object.
    await del(item.url);
  } else if (item.url.startsWith('/uploads/')) {
    // Remove older files stored on local disk.
    await new Promise((resolve) => {
      fs.unlink(fileOf(item.url), (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Local media deletion error:', err);
        }

        resolve();
      });
    });
  }

  await m.media.remove(item.id);

  res.json({ ok: true });
});