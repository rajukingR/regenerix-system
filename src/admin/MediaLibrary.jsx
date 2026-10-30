import { useCallback, useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { api, fileUrl } from './api.js';
import { btn, btn2 } from './Fields.jsx';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

function validateFile(file) {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Unsupported file type';
  }

  if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
    return 'Images must be 10 MB or smaller';
  }

  if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
    return 'Videos must be 200 MB or smaller';
  }

  return '';
}

function safeFileName(name) {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');
}

export default function MediaLibrary() {
  const [items, setItems] = useState([]);
  const [kind, setKind] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const query = kind
        ? `?kind=${encodeURIComponent(kind)}`
        : '';

      const data = await api(`/admin/media${query}`);
      setItems(Array.isArray(data) ? data : data.files || []);
    } catch (e) {
      setError(e.message || 'Unable to load media');
    }
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const up = async (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    setBusy(true);
    setProgress(0);
    setMsg('');
    setError('');

    const uploaded = [];
    const failed = [];

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const validationError = validateFile(file);

        if (validationError) {
          failed.push(`${file.name}: ${validationError}`);
          continue;
        }

        setMsg(`Uploading ${index + 1} of ${files.length}: ${file.name}`);
        setProgress(0);

        try {
          const pathname =
            `regenerix/${file.type.startsWith('video/') ? 'videos' : 'images'}/` +
            `${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`;

          // Direct upload: the file does not pass through the Express API.
          const blob = await upload(pathname, file, {
            access: 'public',
            handleUploadUrl: '/api/admin/media/upload-token',
            clientPayload: JSON.stringify({
              originalName: file.name,
              contentType: file.type,
              size: file.size,
            }),
            onUploadProgress: ({ percentage }) => {
              setProgress(Math.round(percentage));
            },
          });

          // Register the completed upload in the application's media library.
          // The backend must validate the URL and save the media record.
          await api('/admin/media/register', {
            method: 'POST',
            body: {
              url: blob.url,
              pathname: blob.pathname,
              original_name: file.name,
              content_type: file.type,
              size: file.size,
              kind: file.type.startsWith('video/') ? 'video' : 'image',
            },
          });

          uploaded.push(file.name);
        } catch (err) {
          failed.push(`${file.name}: ${err.message || 'Upload failed'}`);
        }
      }

      if (uploaded.length) {
        setMsg(`${uploaded.length} file(s) uploaded successfully.`);
        await load();
      }

      if (failed.length) {
        setError(failed.join('\n'));
      }
    } finally {
      setBusy(false);
      setProgress(0);
      e.target.value = '';
    }
  };

  const del = async (m) => {
    if (!window.confirm('Delete this file? Pages using it may show a broken image.')) {
      return;
    }

    try {
      await api(`/admin/media/${m.id}`, {
        method: 'DELETE',
      });

      setMsg('File deleted.');
      setError('');
      await load();
    } catch (e) {
      setError(e.message || 'Unable to delete file');
    }
  };

  const copy = async (m) => {
    try {
      await navigator.clipboard.writeText(m.url);
      setMsg('URL copied to clipboard.');
      setError('');
    } catch {
      setError('Unable to copy URL.');
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Media library</h1>

        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-ink/20 px-2 py-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            aria-label="Filter media"
            disabled={busy}
          >
            <option value="">All</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>

          <label className={`${btn} cursor-pointer ${busy ? 'opacity-60' : ''}`}>
            {busy ? 'Uploading…' : 'Upload files'}

            <input
              type="file"
              hidden
              multiple
              disabled={busy}
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={up}
            />
          </label>
        </div>
      </div>

      <p className="mb-4 text-xs text-ink/50">
        Images: JPG, PNG, WebP, GIF up to 10 MB.
        Videos: MP4, WebM, MOV up to 200 MB.
        Files upload directly to Vercel Blob.
      </p>

      {busy && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-sm">
            <span>Uploading file…</span>
            <span>{progress}%</span>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-teal transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {msg && (
        <p role="status" className="mb-4 rounded bg-mist p-3 text-sm">
          {msg}
        </p>
      )}

      {error && (
        <pre
          role="alert"
          className="mb-4 whitespace-pre-wrap rounded bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </pre>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((m) => (
          <figure
            key={m.id}
            className="overflow-hidden rounded-xl bg-white shadow-sm"
          >
            {m.kind === 'video' ? (
              <video
                src={fileUrl(m.url)}
                controls
                preload="metadata"
                className="aspect-video w-full bg-black"
              />
            ) : (
              <img
                src={fileUrl(m.url)}
                alt={m.original_name}
                loading="lazy"
                className="aspect-video w-full object-cover"
              />
            )}

            <figcaption className="space-y-2 p-3 text-xs">
              <p className="truncate font-semibold">
                {m.original_name}
              </p>

              <p className="text-ink/50">
                {((m.size || 0) / 1024 / 1024).toFixed(2)} MB
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={btn2}
                  onClick={() => copy(m)}
                >
                  Copy URL
                </button>

                <button
                  type="button"
                  className={`${btn2} text-red-600`}
                  onClick={() => del(m)}
                >
                  Delete
                </button>
              </div>
            </figcaption>
          </figure>
        ))}

        {!items.length && (
          <p className="text-ink/50">No files yet.</p>
        )}
      </div>
    </div>
  );
}