// Simple in-memory rate limiter (works per serverless instance)
// For production at scale, use Redis or Upstash rate limiting
const attempts = new Map();

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of attempts) {
    if (now - data.firstAttempt > data.windowMs) {
      attempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * @param {string} key - Unique identifier (e.g., IP + endpoint)
 * @param {object} options
 * @param {number} options.maxAttempts - Max attempts in window
 * @param {number} options.windowMs - Time window in ms
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
function checkRateLimit(key, { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  const data = attempts.get(key);

  if (!data || now - data.firstAttempt > windowMs) {
    attempts.set(key, { count: 1, firstAttempt: now, windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetMs: windowMs };
  }

  data.count++;

  if (data.count > maxAttempts) {
    const resetMs = windowMs - (now - data.firstAttempt);
    return { allowed: false, remaining: 0, resetMs };
  }

  return { allowed: true, remaining: maxAttempts - data.count, resetMs: windowMs - (now - data.firstAttempt) };
}

module.exports = { checkRateLimit };
