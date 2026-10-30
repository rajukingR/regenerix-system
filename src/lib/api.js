// API base URL.
// Production: /api
// Local development: http://localhost:5000
export const API = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '/api')
).replace(/\/+$/, '');

// Preserve the existing token key if your project already uses another value.
export const TOKEN = 'regenerix_token';

// Normalize paths to prevent duplicate /api/api/... URLs.
const normalizeApiPath = (path) => {
  let cleanPath = `/${String(path || '').replace(/^\/+/, '')}`;

  if (/\/api$/i.test(API)) {
    cleanPath = cleanPath.replace(/^\/api(?=\/|$)/i, '');
  }

  return cleanPath || '/';
};

// Build API URLs.
export const apiUrl = (path) => {
  const normalizedPath = normalizeApiPath(path);
  return `${API}${normalizedPath}`;
};

// Build URLs for uploaded images and videos.
export const mediaUrl = (path) => {
  if (!path) return '';

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (/^\/?uploads\//i.test(path)) {
    const mediaPath = `/${path.replace(/^\/+/, '')}`;

    // Production uses the same domain for uploaded media.
    if (API === '/api') {
      return mediaPath;
    }

    return `${API}${mediaPath}`;
  }

  return path;
};

// Shared request function.
async function request(path, options = {}) {
  const url = apiUrl(path);
  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData;

  const headers = {
    ...(options.body != null && !isFormData
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(options.headers || {}),
  };

  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(TOKEN)
      : null;

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body = options.body;

  if (body != null && !isFormData && typeof body !== 'string') {
    body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      body,
    });
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

// Generic API function used by Login.jsx.
export const api = (path, options = {}) =>
  request(path, options);

// GET
export const apiGet = (path, signal) =>
  request(path, { method: 'GET', signal });

// POST JSON
export const apiPost = (path, body) =>
  request(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });

// POST FormData
export const apiForm = (path, form) =>
  request(path, {
    method: 'POST',
    body: form,
  });
