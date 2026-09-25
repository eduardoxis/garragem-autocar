import { timingSafeEqual } from 'node:crypto';

const attempts = new Map();

export function secureResponse(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export function allowSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; }
  catch { return false; }
}

export function validJsonRequest(req, maxBytes = 32768) {
  const type = String(req.headers['content-type'] || '').split(';')[0].trim();
  const length = Number(req.headers['content-length'] || 0);
  return type === 'application/json' && length <= maxBytes;
}

export function rateLimit(req, { limit = 30, windowMs = 60000 } = {}) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = forwarded || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    attempts.set(key, { count: 1, startedAt: now });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export function safeSecretEqual(received, expected) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
