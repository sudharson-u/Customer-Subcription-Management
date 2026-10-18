/**
 * Utility to track recent local updates performed by this client
 * so that Supabase websocket broadcasts do not show false "from another device" alerts
 * when the user updates a record themselves.
 */

const LOCAL_UPDATES_KEY = 'local_customer_updates';

export function markLocalUpdate(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const raw = sessionStorage.getItem(LOCAL_UPDATES_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[id] = Date.now();
    sessionStorage.setItem(LOCAL_UPDATES_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

export function isRecentLocalUpdate(id: string): boolean {
  if (typeof window === 'undefined' || !id) return false;
  try {
    const raw = sessionStorage.getItem(LOCAL_UPDATES_KEY);
    if (!raw) return false;
    const map: Record<string, number> = JSON.parse(raw);
    const ts = map[id];
    if (!ts) return false;
    const elapsed = Date.now() - ts;
    if (elapsed < 10000) {
      return true;
    }
    delete map[id];
    sessionStorage.setItem(LOCAL_UPDATES_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
  return false;
}
