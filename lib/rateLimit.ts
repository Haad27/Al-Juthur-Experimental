// Basic In-Memory Rate Limiter for Free Tier Apps
// Note: In a true multi-serverless environment (like Vercel), this memory is scoped per-instance.
// For strict global limiting, you would swap this Map out for a Redis instance (like Upstash).

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const rateLimitCache = new Map<string, RateLimitEntry>();

export function checkRateLimit(ip: string, maxRequests: number, windowMs: number): { success: boolean, remaining: number } {
  const now = Date.now();
  const entry = rateLimitCache.get(ip);

  // If entry exists and is within the time window
  if (entry && now < entry.resetTime) {
    if (entry.count >= maxRequests) {
      return { success: false, remaining: 0 };
    }
    
    // Increment count
    entry.count += 1;
    rateLimitCache.set(ip, entry);
    return { success: true, remaining: maxRequests - entry.count };
  }

  // Create new entry (or reset expired one)
  rateLimitCache.set(ip, {
    count: 1,
    resetTime: now + windowMs
  });

  return { success: true, remaining: maxRequests - 1 };
}
