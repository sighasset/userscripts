import { range } from './utils';

describe('range', () => {
  it('returns numbers from start to end inclusive', () => {
    expect(range(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns a single element when start equals end', () => {
    expect(range(3, 3)).toEqual([3]);
  });

  it('returns an empty array when start is greater than end', () => {
    expect(range(5, 3)).toEqual([]);
  });

  it('works with negative numbers', () => {
    expect(range(-2, 2)).toEqual([-2, -1, 0, 1, 2]);
  });
});
