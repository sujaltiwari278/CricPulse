// src/lib/serverWake.js  -  drop into your React/Vite frontend.
// Render's free tier sleeps after ~15 min idle and needs 30-60 s to wake.
// This warms the server as soon as the app loads and retries calls that
// hit the cold start, so users never see a failed sign-up.

const API_BASE = import.meta.env.VITE_API_URL; // e.g. https://cricpulse-api.onrender.com

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll /health until the API answers. Resolves true when awake. */
export async function wakeServer({ maxWaitMs = 90_000, intervalMs = 3_000, onWaiting } = {}) {
  const start = Date.now();
  let notified = false;
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
      if (res.ok) return true;
    } catch (_) {
      /* still asleep / network error - keep polling */
    }
    if (!notified) { notified = true; onWaiting?.(); }
    await sleep(intervalMs);
  }
  return false;
}

/**
 * fetch() that retries cold-start failures (network error, 502/503/504).
 * Real answers (200, 201, 400, 401, 409, 422 ...) are returned untouched,
 * so "username already exists" is never retried or hidden.
 */
export async function apiFetch(path, options = {}, { retries = 6, onWaiting } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, options);
      if (![502, 503, 504].includes(res.status)) return res;
      lastError = new Error(`Server not ready (${res.status})`);
    } catch (err) {
      lastError = err; // network error: server asleep or CORS-masked crash
    }
    if (attempt === 0) onWaiting?.();
    await sleep(Math.min(2_000 * (attempt + 1), 10_000));
  }
  throw lastError;
}

// Usage:
//   // main.jsx - warm the API the moment the site opens
//   import { wakeServer } from "./lib/serverWake";
//   wakeServer();
//
//   // register page
//   const res = await apiFetch("/api/auth/register", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(form),
//   }, { onWaiting: () => setNotice("Waking the server, hang tight (up to a minute)...") });