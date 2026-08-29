import { AuthError } from './errors';

export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): Promise<boolean>;
}

type Bucket = { count: number; resetAt: number };

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  async consume(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (existing.count >= limit) return false;
    existing.count += 1;
    return true;
  }
}

let rateLimiter: RateLimiter = new MemoryRateLimiter();

export function setRateLimiter(nextRateLimiter: RateLimiter): void {
  rateLimiter = nextRateLimiter;
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  config: { limit: number; windowMs: number },
): Promise<void> {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'local';
  const allowed = await rateLimiter.consume(`${scope}:${clientIp}`, config.limit, config.windowMs);
  if (!allowed) {
    throw new AuthError(
      'RATE_LIMIT_EXCEEDED',
      'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      429,
    );
  }
}
