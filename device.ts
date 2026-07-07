const DEVICE_ID_KEY = "wholesale_device_id";

/**
 * Returns a stable per-browser/device identifier, creating one on first run.
 * This is intentionally simple (crypto.randomUUID persisted in localStorage)
 * rather than a full fingerprinting library — good enough to tell "this phone"
 * apart from "a different phone", which is all the device-lock feature needs.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Best-effort human-readable label for the admin's device list. */
export function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  const platform =
    /iPhone|iPad/.test(ua) ? "iOS" :
    /Android/.test(ua) ? "Android" :
    /Mac OS/.test(ua) ? "Mac" :
    /Windows/.test(ua) ? "Windows" : "Unknown device";
  const browser =
    /Chrome/.test(ua) && !/Edg/.test(ua) ? "Chrome" :
    /Safari/.test(ua) && !/Chrome/.test(ua) ? "Safari" :
    /Firefox/.test(ua) ? "Firefox" :
    /Edg/.test(ua) ? "Edge" : "Browser";
  return `${platform} · ${browser}`;
}
