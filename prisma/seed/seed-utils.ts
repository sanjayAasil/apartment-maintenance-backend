import { createHash } from 'node:crypto';

export const DAY = 86_400_000;
export const HOUR = DAY / 24;
export const PASSWORD = 'Password@123';

export function id(scope: string, index: number): string {
  const hex = createHash('sha256')
    .update(`apartment-dev-v2:${scope}:${index}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export class Random {
  constructor(private state = 20260916) {}
  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(values: readonly T[]): T {
    if (!values.length) throw new Error('Cannot select from an empty list');
    return values[this.int(0, values.length - 1)];
  }
  weighted<T>(values: readonly (readonly [T, number])[]): T {
    let point =
      this.next() * values.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [value, weight] of values) {
      point -= weight;
      if (point < 0) return value;
    }
    return values[values.length - 1][0];
  }
}

export const after = (date: Date, milliseconds: number): Date =>
  new Date(date.getTime() + milliseconds);
export function sixMonthsBefore(end: Date): Date {
  const start = new Date(end);
  const day = start.getUTCDate();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - 6);
  start.setUTCDate(
    Math.min(
      day,
      new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
      ).getUTCDate(),
    ),
  );
  return start;
}

export function assertLocalDatabase(
  connectionString: string,
  environment?: string,
): string {
  if (environment?.toLowerCase() === 'production')
    throw new Error('Seed is forbidden in production');
  const url = new URL(connectionString);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    decodeURIComponent(url.pathname) !== '/apartment_maintenance'
  ) {
    throw new Error(
      'Seed only supports local apartment_maintenance; remote/other databases are refused',
    );
  }
  return `${url.hostname}:${url.port || '5432'}/apartment_maintenance`;
}
