import { DEFAULT_QUERY_RETRY, DEFAULT_QUERY_TIMEOUT_MS } from '../const';

/** Returns a promise that resolves after ms milliseconds */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns an array of numbers from start to end (inclusive) */
export function range(start: number, end: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) {
    arr.push(i);
  }
  return arr;
}

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
export function toHumanDate(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateFormatter.format(dateObj);
  } catch (e) {
    console.warn(e);
    return date.toString();
  }
}

export async function query<T>(
  accessorFn: () => T | null,
  options: { retry: number; timeout: number } = {
    retry: DEFAULT_QUERY_RETRY,
    timeout: DEFAULT_QUERY_TIMEOUT_MS,
  },
): Promise<T | null> {
  let retry = options.retry;
  while (retry > 0) {
    const result = accessorFn();
    if (result) return result;
    retry -= 1;
    await sleep(options.timeout);
  }
  return null;
}
