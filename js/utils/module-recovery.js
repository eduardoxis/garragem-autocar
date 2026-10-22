// ES modules stay in a tab's module map even after a new deployment.
// A document reload clears that map; importing the route again does not.
export function isModuleVersionError(error) {
  return /does not provide an export named/i.test(String(error?.message || ''));
}

export function recoverModuleVersion(error, options = {}) {
  if (!isModuleVersionError(error)) return false;
  try {
    const storage = options.storage || globalThis.sessionStorage;
    const now = options.now ?? Date.now();
    const key = 'gac:module-reload-at';
    const previous = Number(storage.getItem(key));
    if (previous && now - previous >= 0 && now - previous < 120000) return false;
    storage.setItem(key, String(now));
    (options.reload || (() => globalThis.location.reload()))();
    return true;
  } catch {
    // Keep the ordinary error screen and manual retry if storage is unavailable.
    return false;
  }
}
