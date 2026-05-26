import { expect } from 'vitest';

expect.extend({
  toExist(received: unknown) {
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () =>
        pass ? `expected ${String(received)} not to exist` : `expected value to exist, got ${String(received)}`,
    };
  },
  toHaveKeys(received: unknown, ...keys: Array<string | string[]>) {
    const expected = keys.flat().slice().sort();
    const actual =
      received && typeof received === 'object'
        ? Object.keys(received as object)
            .slice()
            .sort()
        : [];
    const pass = expected.length === actual.length && expected.every((k, i) => k === actual[i]);
    return {
      pass,
      message: () =>
        `expected keys ${JSON.stringify(actual)} ${pass ? 'not ' : ''}to equal ${JSON.stringify(expected)}`,
    };
  },
  toBeType(received: unknown, type: string) {
    const actual = typeof received;
    const pass = actual === type;
    return {
      pass,
      message: () => `expected typeof value to ${pass ? 'not ' : ''}be ${type}, got ${actual}`,
    };
  },
});

interface CustomMatchers<R = unknown> {
  toExist(): R;
  toHaveKeys(...keys: Array<string | string[]>): R;
  toBeType(type: string): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
