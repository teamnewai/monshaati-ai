/**
 * Rate Limiter — In-process store (upgradeable to Upstash Redis)
 * Suitable for Vercel Edge / serverless with short windows
 */

interface RateLimitEntry {
  count:     number;
  resetTime: number;
}

// In-process store (per serverless instance)
const store = new Map<string, RateLimitEntry>();

// Clean stale entries every 60 calls
let cleanCounter = 0;
function cleanStore() {
  if (++cleanCounter % 60 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed:    boolean;
  remaining:  number;
  resetIn:    number; // seconds
  limit:      number;
}

export function rateLimit(params: {
  key:        string;   // e.g. userId or IP
  limit:      number;   // max requests
  windowSecs: number;   // window in seconds
}): RateLimitResult {
  cleanStore();
  const { key, limit, windowSecs } = params;
  const now = Date.now();
  const windowMs = windowSecs * 1000;

  const entry = store.get(key);

  if (!entry || entry.resetTime < now) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowSecs, limit };
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const resetIn   = Math.ceil((entry.resetTime - now) / 1000);

  return {
    allowed:   entry.count <= limit,
    remaining,
    resetIn,
    limit,
  };
}

// Pre-configured limiters for each route type
export const LIMITS = {
  // Most critical — costs money
  AI_GENERATE:     { limit: 10,   windowSecs: 3600 },   // 10/hour per user
  AI_CONSULTANT:   { limit: 30,   windowSecs: 3600 },   // 30/hour
  // Auth — prevent brute force
  AUTH_LOGIN:      { limit: 10,   windowSecs: 900  },   // 10/15min per IP
  AUTH_SIGNUP:     { limit: 5,    windowSecs: 3600 },   // 5/hour per IP
  // Payment
  STRIPE_CHECKOUT: { limit: 20,   windowSecs: 3600 },   // 20/hour per user
  // General API
  API_GENERAL:     { limit: 200,  windowSecs: 60   },   // 200/min per user
  EXPORT:          { limit: 30,   windowSecs: 3600 },   // 30/hour per user
  EMAIL:           { limit: 10,   windowSecs: 3600 },   // 10/hour
};

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit':     String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(result.resetIn),
  };
}
