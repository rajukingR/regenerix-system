export const TOKEN = 'rgx_token';

export const BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5000'
    : '')
).replace(/\/+$/, '');

/**
 * Build API URLs without duplicating /api.
 *
 * BASE=/api + /auth/login     => /api/auth/login
 * BASE=/api + /api/auth/login => /api/auth/login
 * BASE=http://localhost:5000  => http://localhost:5000/api/auth/login
 */
export const apiUrl = (path) => {
  const cleanPath = `/${String(path || '').replace(/^\/+/, '')}`;

  if (/\/api$/i.test(BASE)) {
    return `${BASE}${cleanPath.replace(/^\/api(?=\/|$)/i, '')}`;
  }

  return `${BASE}/api${cleanPath}`;
};

// Uploaded files come back as /uploads/...
export const fileUrl = (p) => {
  if (!p) return '';

  if (/^https?:\/\//i.test(p)) return p;

  if (p.startsWith('/uploads')) {
    // Use the current domain when BASE is empty or a relative path.
    if (!BASE || BASE.startsWith('/')) {
      return p;
    }

    return `${BASE}${p}`;
  }

  return p;
};

/**
 * Common API request handler.
 */
export async function api(
  path,
  { method = 'GET', body, form } = {}
) {
  const headers = {};
  const token = localStorage.getItem(TOKEN);

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body: form || (
      body !== undefined && body !== null
        ? JSON.stringify(body)
        : undefined
    ),
  });

  const data = await res.json().catch(() => ({}));

  if (
    res.status === 401 &&
    !path.startsWith('/auth/login')
  ) {
    localStorage.removeItem(TOKEN);
    window.location.href = '/admin/login';
  }

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

/**
 * Open an application resume.
 */
export async function openResume(id) {
  const res = await fetch(
    apiUrl(`/admin/applications/${id}/resume`),
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(TOKEN)}`,
      },
    }
  );

  if (!res.ok) {
    alert('Could not open the resume');
    return;
  }

  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

/**
 * Upload files with progress reporting.
 */
export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();

    x.open('POST', apiUrl('/admin/media'));

    x.setRequestHeader(
      'Authorization',
      `Bearer ${localStorage.getItem(TOKEN)}`
    );

    x.timeout = 15 * 60 * 1000;

    x.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(
          Math.round((e.loaded / e.total) * 100)
        );
      }
    };

    x.onload = () => {
      let data = {};

      try {
        data = JSON.parse(x.responseText);
      } catch {
        // Response was not JSON.
      }

      if (x.status === 401) {
        localStorage.removeItem(TOKEN);
        window.location.href = '/admin/login';
      }

      if (x.status >= 200 && x.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.message || 'Upload failed'));
      }
    };

    x.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    x.ontimeout = () => {
      reject(new Error('The upload timed out'));
    };

    const fd = new FormData();
    fd.append('files', file);

    x.send(fd);
  });
}