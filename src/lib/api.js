const API = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '/api')
).replace(/\/+$/, '');

export const TOKEN = 'regenerix_token';

/**
 * Normalize API paths.
 * /auth/login     -> /api/auth/login
 * /api/auth/login -> /api/auth/login
 */
const normalizeApiPath = (path) => {
  let cleanPath = `/${String(path || '').replace(/^\/+/, '')}`;

  if (/\/api$/i.test(API)) {
    cleanPath = cleanPath.replace(/^\/api(?=\/|$)/i, '');
  }

  return cleanPath || '/';
};

/**
 * Generate API URLs.
 */
export const apiUrl = (path) => `${API}${normalizeApiPath(path)}`;

/**
 * Generate media URLs.
 */
export const mediaUrl = (path) => {
  if (!path) return '';

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (/^\/?uploads\//i.test(path)) {
    return `/${path.replace(/^\/+/, '')}`;
  }

  return path;
};

/**
 * Common request handler.
 */
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

  if (
    token &&
    !headers.Authorization &&
    !headers.authorization
  ) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body = options.body;

  if (
    body != null &&
    !isFormData &&
    typeof body !== 'string'
  ) {
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
    throw new Error(
      'Unable to connect to the server. Please check your connection or server status.'
    );
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

/**
 * General API request.
 */
export const api = (path, options = {}) =>
  request(path, options);

/**
 * GET request.
 */
export const apiGet = (path, signal) =>
  request(path, {
    method: 'GET',
    signal,
  });

/**
 * POST JSON request.
 */
export const apiPost = (path, body) =>
  request(path, {
    method: 'POST',
    body,
  });

/**
 * POST FormData request.
 */
export const apiForm = (path, form) =>
  request(path, {
    method: 'POST',
    body: form,
  });