import { GalleryTag } from '../types';
import {
  equalsNamespace,
  equalsTag,
  getGalleryId,
  includesTag,
  includesTagString,
  isEqualGalleryId,
  isTagString,
  parseTagFromString,
  parseTagString,
  removeDuplicateIds,
} from './gallery-utils';

describe('getGalleryId', () => {
  it('parses gallery id from valid href', () => {
    expect(getGalleryId('https://e-hentai.org/g/123/abc')).toEqual([
      123,
      'abc',
    ]);
    expect(getGalleryId('https://e-hentai.org/g/123/abc/')).toEqual([
      123,
      'abc',
    ]);
  });

  it('throws for invalid href', () => {
    expect(() => getGalleryId('')).toThrow();
    expect(() => getGalleryId('invalid')).toThrow();
    expect(() =>
      getGalleryId('https://e-hentai.org/g/not-a-number/abc'),
    ).toThrow();
    expect(() => getGalleryId('https://e-hentai.org/g/123/')).toThrow();
  });
});

describe('isEqualGalleryId', () => {
  it('returns true for equal gallery ids', () => {
    expect(isEqualGalleryId([123, 'abc'], [123, 'abc'])).toBe(true);
  });

  it('returns false when ids differ', () => {
    expect(isEqualGalleryId([123, 'abc'], [456, 'abc'])).toBe(false);
  });

  it('returns false when tokens differ', () => {
    expect(isEqualGalleryId([123, 'abc'], [123, 'def'])).toBe(false);
  });
});

describe('removeDuplicateIds', () => {
  it('removes duplicate gallery ids by value', () => {
    const ids = [
      [1, 'a'],
      [1, 'a'],
      [2, 'b'],
      [2, 'b'],
      [3, 'c'],
    ] as const;

    expect(removeDuplicateIds(ids.map((id) => [...id]))).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
    ]);
  });

  it('keeps unique gallery ids', () => {
    expect(
      removeDuplicateIds([
        [1, 'a'],
        [2, 'b'],
        [3, 'c'],
      ]),
    ).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(removeDuplicateIds([])).toEqual([]);
  });
});

describe('parseTagString', () => {
  it('parses full namespace', () => {
    expect(parseTagString('artist:test')).toEqual({
      namespace: 'artist:',
      name: 'test',
    });
  });

  it('parses shortened namespace', () => {
    expect(parseTagString('a:test')).toEqual({
      namespace: 'a:',
      name: 'test',
    });
  });

  it('throws for empty tag name', () => {
    expect(() => parseTagString('artist:')).toThrow();
  });

  it('throws when separator is missing', () => {
    expect(() => parseTagString('artist')).toThrow();
  });

  it('throws when there are multiple separators', () => {
    expect(() => parseTagString('artist:test:value')).toThrow();
  });

  it('throws for invalid namespace', () => {
    expect(() => parseTagString('unknown:test')).toThrow();
  });
});

describe('parseTagFromString', () => {
  it.each([
    [
      'female:elf',
      {
        tag: {
          namespace: 'female:',
          name: 'elf',
        },
        suffix: '',
      },
    ],
    [
      'f:elf',
      {
        tag: {
          namespace: 'f:',
          name: 'elf',
        },
        suffix: '',
      },
    ],
    [
      'f:anal intercourse 2/20',
      {
        tag: {
          namespace: 'f:',
          name: 'anal intercourse',
        },
        suffix: ' 2/20',
      },
    ],
    [
      'f:anal intercourse (p. 11-12)',
      {
        tag: {
          namespace: 'f:',
          name: 'anal intercourse',
        },
        suffix: ' (p. 11-12)',
      },
    ],
    [
      'f:anal intercourse(p. 11-12)',
      {
        tag: {
          namespace: 'f:',
          name: 'anal intercourse',
        },
        suffix: '(p. 11-12)',
      },
    ],
    [
      'f:anal  intercourse',
      {
        tag: {
          namespace: 'f:',
          name: 'anal intercourse',
        },
        suffix: '',
      },
    ],
    [
      'f:anal  intercourse - p.9',
      {
        tag: {
          namespace: 'f:',
          name: 'anal intercourse',
        },
        suffix: ' - p.9',
      },
    ],
    [
      'x:oyakodon - not present (female:)',
      {
        tag: { namespace: 'x:', name: 'oyakodon' },
        suffix: ' - not present (female:)',
      },
    ],
  ])('parses "%s"', (input, expected) => {
    expect(parseTagFromString(input)).toEqual(expected);
  });

  it.each([
    '',
    'female',
    'female:',
    'female:- - -',
    'female:---',
    'unknown:test',
  ])('throws for "%s"', (input) => {
    expect(() => parseTagFromString(input)).toThrow();
  });
});

describe('isTagString', () => {
  it('returns true for valid tag strings', () => {
    expect(isTagString('artist:test')).toBe(true);
    expect(isTagString('a:test')).toBe(true);
  });

  it('returns false for invalid tag strings', () => {
    expect(isTagString('artist')).toBe(false);
    expect(isTagString('artist:')).toBe(false);
    expect(isTagString('unknown:test')).toBe(false);
    expect(isTagString('artist:test:value')).toBe(false);
  });
});

describe('equalsNamespace', () => {
  it('treats full and short namespace as equal', () => {
    expect(equalsNamespace('artist:', 'a:')).toBe(true);
  });

  it('treats aliases of same group as equal', () => {
    expect(equalsNamespace('character:', 'char:')).toBe(true);
    expect(equalsNamespace('character:', 'c:')).toBe(true);
  });

  it('returns false for different namespace groups', () => {
    expect(equalsNamespace('m:', 'f:')).toBe(false);
  });
});

describe('includesTagString', () => {
  it('returns true when a namespace is followed by an alphanumeric tag', () => {
    expect(includesTagString('artist:test')).toBe(true);
  });

  it('returns true for shortened namespaces', () => {
    expect(includesTagString('a:test')).toBe(true);
  });

  it('returns false when namespace is not present', () => {
    expect(includesTagString('some random text')).toBe(false);
  });

  it('returns false when namespace is not followed by an alphanumeric character', () => {
    expect(includesTagString('artist:')).toBe(false);
    expect(includesTagString('artist: ')).toBe(false);
    expect(includesTagString('artist:-test')).toBe(false);
    expect(includesTagString('artist:_test')).toBe(false);
  });
});

describe('equalsTag', () => {
  it('returns true for identical tags', () => {
    expect(
      equalsTag(
        { namespace: 'artist:', name: 'john' },
        { namespace: 'artist:', name: 'john' },
      ),
    ).toBe(true);
  });

  it('returns true when namespaces are aliases', () => {
    expect(
      equalsTag(
        { namespace: 'artist:', name: 'john' },
        { namespace: 'a:', name: 'john' },
      ),
    ).toBe(true);
  });

  it('returns false when names differ', () => {
    expect(
      equalsTag(
        { namespace: 'artist:', name: 'john' },
        { namespace: 'artist:', name: 'jane' },
      ),
    ).toBe(false);
  });

  it('returns false when namespace groups differ', () => {
    expect(
      equalsTag(
        { namespace: 'artist:', name: 'john' },
        { namespace: 'group:', name: 'john' },
      ),
    ).toBe(false);
  });
});

describe('includesTag', () => {
  const tags: GalleryTag[] = [
    { namespace: 'artist:', name: 'john' },
    { namespace: 'group:', name: 'circle' },
  ];

  it('returns true when tag exists', () => {
    expect(
      includesTag(tags, {
        namespace: 'artist:',
        name: 'john',
      }),
    ).toBe(true);
  });

  it('returns false when tag does not exist', () => {
    expect(
      includesTag(tags, {
        namespace: 'artist:',
        name: 'jane',
      }),
    ).toBe(false);
  });
});
