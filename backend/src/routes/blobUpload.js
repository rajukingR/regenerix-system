const router = require('express').Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const { handleUpload } = require('@vercel/blob/client');

const m = require('../models');

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

const ALL_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

const IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const VIDEO_MAX_SIZE = 200 * 1024 * 1024;

function verifyAdminToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  if (!token || typeof token !== 'string') {
    throw new Error('Login required');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (!decoded.id) {
    throw new Error('Invalid admin session');
  }

  return decoded;
}

function parseClientPayload(clientPayload) {
  let payload;

  try {
    payload = JSON.parse(clientPayload || '{}');
  } catch {
    throw new Error('Invalid upload information');
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid upload information');
  }

  const {
    token,
    originalName,
    contentType,
    size,
  } = payload;

  // Authenticate the person requesting the upload.
  const admin = verifyAdminToken(token);

  if (!ALL_TYPES.includes(contentType)) {
    throw new Error('Unsupported file type');
  }

  if (
    typeof originalName !== 'string' ||
    !originalName.trim()
  ) {
    throw new Error('Original filename is required');
  }

  const maxSize = IMAGE_TYPES.includes(contentType)
    ? IMAGE_MAX_SIZE
    : VIDEO_MAX_SIZE;

  if (
    !Number.isFinite(size) ||
    size <= 0 ||
    size > maxSize
  ) {
    throw new Error(
      IMAGE_TYPES.includes(contentType)
        ? 'Images must be 10 MB or smaller'
        : 'Videos must be 200 MB or smaller'
    );
  }

  return {
    adminId: admin.id,
    originalName: path.basename(originalName).slice(0, 190),
    contentType,
    size,
  };
}

router.post('/', async (req, res) => {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        message: 'Vercel Blob storage is not configured',
      });
    }

    const result = await handleUpload({
      request: req,
      body: req.body,

      onBeforeGenerateToken: async (
        pathname,
        clientPayload
      ) => {
        const details = parseClientPayload(clientPayload);

        // Never trust the browser-provided path.
        // Use a controlled directory and a unique Blob pathname.
        const kind = IMAGE_TYPES.includes(details.contentType)
          ? 'images'
          : 'videos';

        const extension = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/webp': '.webp',
          'image/gif': '.gif',
          'video/mp4': '.mp4',
          'video/webm': '.webm',
          'video/quicktime': '.mov',
        }[details.contentType];

        return {
          pathname: `${kind}/${Date.now()}-${require('crypto')
            .randomBytes(12)
            .toString('hex')}${extension}`,

          allowedContentTypes: [details.contentType],

          maximumSizeInBytes: IMAGE_TYPES.includes(
            details.contentType
          )
            ? IMAGE_MAX_SIZE
            : VIDEO_MAX_SIZE,

          addRandomSuffix: true,

          tokenPayload: JSON.stringify(details),
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const details = JSON.parse(tokenPayload || '{}');

        if (
          !blob ||
          !blob.url ||
          !ALL_TYPES.includes(blob.contentType)
        ) {
          throw new Error('Invalid completed upload');
        }

        // Make the completion handler safe to retry.
        const existing = await m.media.list();

        if (existing.some((item) => item.url === blob.url)) {
          return;
        }

        const kind = IMAGE_TYPES.includes(blob.contentType)
          ? 'image'
          : 'video';

        await m.media.create({
          filename: path.basename(blob.pathname),
          original_name: details.originalName,
          url: blob.url,
          mimetype: blob.contentType,
          kind,
          size: details.size,
        });
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Blob upload handler error:', error.message);

    return res.status(400).json({
      message: error.message || 'Upload authorization failed',
    });
  }
});

module.exports = router;