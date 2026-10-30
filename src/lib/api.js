// API base URL.
// Production: /api
// Local development: http://localhost:5000
export const API = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '/api')
).replace(/\/+$/, '');

// Build URLs for uploaded images and videos.
export const mediaUrl = (path) => {
  if (!path) return '';

  // Already an absolute URL.
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Uploaded media is served by the backend at /uploads/...
  if (path.startsWith('/uploads/')) {
    if (API === '/api') {
      return path;
    }

    return `${API}${path}`;
  }

  return path;
};

// Normalize API paths to prevent /api/api/... duplication.
const normalizeApiPath = (path) => {
  const cleanPath = `/${String(path || '').replace(/^\/+/, '')}`;

  if (API === '/api') {
    return cleanPath.replace(/^\/api(?=\/|$)/, '') || '/';
  }

  return cleanPath;
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
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

// POST FormData.
// Do not manually set Content-Type; the browser sets the multipart boundary.
export const apiForm = (path, form) =>
  request(path, {
    method: 'POST',
    body: form
  });