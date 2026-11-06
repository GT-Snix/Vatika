// The ONLY file that talks to the server. Components call api(...) and never fetch() directly.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'vatika.token';

// localStorage can throw (private mode, blocked storage), so every access is wrapped.
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable: the user stays logged in until the tab closes, nothing worse.
  }
}

// App registers a function here; api() calls it when the server rejects our token.
// (Alternative: a global event or a state library; one callback is the fewest concepts.)
let onLoggedOut = () => {};
export function setOnLoggedOut(fn) {
  onLoggedOut = fn;
}

// api('/garden') or api('/auth/login', { method: 'POST', body: {...} }) -> parsed JSON.
export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE_URL + path, { method, headers, body: body && JSON.stringify(body) });
  } catch {
    // fetch only throws when the server can't be reached at all.
    throw new Error('Cannot reach the server. Is it running?');
  }

  // Some error responses may not be JSON; fall back to an empty object.
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;

  // A 401 on a call made WITH a token means it expired or is invalid: log out.
  // (A 401 from /auth/login has no token attached; it just means a wrong password.)
  if (res.status === 401 && token) {
    setToken(null);
    onLoggedOut();
  }
  throw new Error(data.error || `Request failed (${res.status})`);
}
