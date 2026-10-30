// API base URL.
// Production: /api
// Local development: http://localhost:5000
export const API = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '/api')
).replace(/\/+$/, '');

// Normalize API paths to prevent duplicate /api/api/... URLs.
const normalizeApiPath = (path) => {
  let cleanPath = `/${String(path || '').replace(/^\/+/, '')}`;

  // If the base URL already ends with /api, remove /api
  // from the request path to avoid duplication.
  if (/\/api$/i.test(API)) {
    cleanPath = cleanPath.replace(/^\/api(?=\/|$)/i, '');
  }

  return cleanPath || '/';
};

// Build URLs for uploaded images and videos.
export const mediaUrl = (path) => {
  if (!path) return '';

  // Already an absolute URL.
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Uploaded media is served by the backend at /uploads/...
  if (/^\/?uploads\//i.test(path)) {
    const mediaPath = `/${path.replace(/^\/+/, '')}`;

    // Production: uploads are served from the same domain.
    if (API === '/api') {
      return mediaPath;
    }

    // Custom API URL or local backend.
    return `${API}${mediaPath}`;
  }

  return path;
};

async function request(path, options = {}) {
  const normalizedPath = normalizeApiPath(path);
  const url = `${API}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;

  let response;

  try {
    response = await fetch(url, options);
  } catch {
    const error = new Error(
      'Cannot reach the server. Check your connection and try again.'
    );

    error.status = 0;
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed with status ${response.status}`
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

// GET
export const apiGet = (path, signal) =>
  request(path, { signal });

// POST JSON
export const apiPost = (path, body) =>
  request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

// POST FormData.
// Do not manually set Content-Type; the browser sets the multipart boundary.
export const apiForm = (path, form) =>
  request(path, {
    method: 'POST',
    body: form,
  });