export const API = import.meta.env.VITE_API_URL || '/api';

// Uploaded files are stored as /uploads/... on the API server.
// In production, these paths are served through the same Vercel domain.
export const mediaUrl = (p) => {
  if (!p) return '';

  if (p.startsWith('/uploads')) {
    return `${API}${p}`;
  }

  return p;
};

async function request(path, opts = {}) {
  let res;

  try {
    // Avoid duplicate slashes when combining the API base URL and path.
    const url = `${API.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    res = await fetch(url, opts);
  } catch {
    const e = new Error(
      'Cannot reach the server. Check your connection and try again.'
    );
    e.status = 0;
    throw e;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const e = new Error(
      data.message || 'Something went wrong. Please try again.'
    );
    e.status = res.status;
    throw e;
  }

  return data;
}

export const apiGet = (path, signal) =>
  request(path, { signal });

export const apiPost = (path, body) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const apiForm = (path, form) =>
  request(path, {
    method: 'POST',
    body: form,
  });