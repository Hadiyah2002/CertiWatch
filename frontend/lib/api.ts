/**
 * Thin fetch wrapper around the Django backend.
 *
 * Auth is Django session cookies. In dev, next.config.js rewrites
 * /api/* to the Django server so the cookie is same-origin. In
 * production this app is expected to sit behind the same reverse proxy
 * as the backend, so /api/* just resolves normally.
 *
 * For unsafe methods (POST/PUT/PATCH/DELETE) Django's CSRF middleware
 * requires an X-CSRFToken header matching the `csrftoken` cookie. Call
 * ensureCsrfCookie() once (e.g. on the login page) before submitting
 * that first unsafe request.
 */

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export async function ensureCsrfCookie(): Promise<void> {
  await apiFetch('/auth/csrf', { method: 'GET' });
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (UNSAFE_METHODS.has(method)) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) headers.set('X-CSRFToken', csrfToken);
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
      // Never let the browser serve a cached response (or a cached
      // redirect) for an API call. Auth/session state must always come
      // from a live request.
      cache: 'no-store',
    });
  } catch (err) {
    throw new ApiError(
      'Could not reach the backend. Is it running (python manage.py runserver) on the expected port?',
      0,
      err
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    // Prefer DRF's {"detail": "..."} message. Otherwise surface enough of
    // the raw response that a real cause (e.g. a Django error page, a
    // proxy failure, a CSRF rejection) is visible instead of a generic
    // "something went wrong".
    let message: string;
    if (isJson && (data as any)?.detail) {
      message = (data as any).detail;
    } else if (isJson) {
      message = `Request failed (${response.status}): ${JSON.stringify(data).slice(0, 300)}`;
    } else {
      const snippet = typeof data === 'string' ? data.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
      message = `Request failed (${response.status})${snippet ? `: ${snippet}` : ''}`;
    }
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

/**
 * Triggers a browser download for an export endpoint (PDF/Excel report
 * exports). Uses fetch + blob rather than a plain <a href> navigation
 * so we get proper error handling if the export fails, and so it never
 * navigates the SPA away from the current page.
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { credentials: 'include', cache: 'no-store' });
  } catch (err) {
    throw new ApiError('Could not reach the backend to download this file.', 0, err);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(`Download failed (${response.status}). ${text.slice(0, 200)}`, response.status, text);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
