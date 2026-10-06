/**
 * Lightweight native security middleware (Ponytail principles: zero external library overhead)
 */

export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

/**
 * In-memory sliding window rate limiter
 * @param {Object} options
 * @param {number} options.windowMs Window size in milliseconds
 * @param {number} options.maxRequests Maximum requests allowed per window
 * @param {string} options.message Error message returned on 429
 */
export function createRateLimiter({ windowMs = 15 * 60 * 1000, maxRequests = 10, message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }) {
  const store = new Map();

  // Periodic cleanup every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const record = store.get(ip);

    if (!record || now > record.resetTime) {
      store.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (record.count >= maxRequests) {
      const waitMinutes = Math.ceil((record.resetTime - now) / 60000);
      return res.status(429).json({
        success: false,
        message: `${message} Vui lòng chờ ${waitMinutes} phút.`
      });
    }

    record.count++;
    next();
  };
}
