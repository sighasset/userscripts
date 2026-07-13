import { API_RATELIMIT_MS } from '../const';

class SharedRateLimiter {
  private queue: (() => void)[] = [];
  private running = 0;

  constructor(
    private readonly minTime: number,
    private readonly maxConcurrent = 1,
  ) {}

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        this.running++;

        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }

        setTimeout(() => {
          this.running--;
          this.next();
        }, this.minTime);
      });

      this.next();
    });
  }

  private next() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.queue.shift()!();
  }
}

export const limiter = new SharedRateLimiter(API_RATELIMIT_MS, 1);
