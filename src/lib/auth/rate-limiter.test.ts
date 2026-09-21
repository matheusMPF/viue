import { afterEach, describe, expect, it, vi } from 'vitest';

import { hashToken } from './crypto';
import {
  enforceRateLimit,
  MemoryRateLimiter,
  setRateLimiter,
  type RateLimiter,
} from './rate-limiter';

afterEach(() => {
  setRateLimiter(new MemoryRateLimiter());
});

describe('rate limiter', () => {
  it('limita por IP e por identificador sem guardar o identificador em texto puro', async () => {
    const consume = vi.fn<RateLimiter['consume']>().mockResolvedValue(true);
    setRateLimiter({ consume });
    const request = new Request('http://localhost/api/auth/login', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });

    await enforceRateLimit(
      request,
      'auth:login',
      { limit: 10, windowMs: 60_000 },
      'User@Email.com',
    );

    expect(consume).toHaveBeenNthCalledWith(1, 'auth:login:ip:203.0.113.10', 10, 60_000);
    expect(consume).toHaveBeenNthCalledWith(
      2,
      `auth:login:identity:${hashToken('user@email.com')}`,
      10,
      60_000,
    );
  });

  it('bloqueia quando qualquer um dos limites é excedido', async () => {
    const consume = vi
      .fn<RateLimiter['consume']>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    setRateLimiter({ consume });

    await expect(
      enforceRateLimit(
        new Request('http://localhost/api/auth/login'),
        'auth:login',
        { limit: 10, windowMs: 60_000 },
        'user@email.com',
      ),
    ).rejects.toMatchObject({ code: 'RATE_LIMIT_EXCEEDED', status: 429 });
  });
});
