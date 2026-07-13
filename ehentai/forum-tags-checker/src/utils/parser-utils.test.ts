import { describe, expect, it } from 'vitest';

import { getDirtyTagStrings } from '@/utils/parser-utils';

describe('getDirtyTagStrings', () => {
  const expectTags = (text: string, tags: string[]) => {
    expect(getDirtyTagStrings(text)).toEqual(tags);
  };

  it.each([
    ['hello world', []],
    ['artist:john doe', ['artist:john doe']],
    [
      'artist:john doecharacter:rei ayanami',
      ['artist:john doe', 'character:rei ayanami'],
    ],
    ['a:john doec:rei ayanami', ['a:john doe', 'c:rei ayanami']],
    [
      '[s]artist:john doe[/s]female:glasses',
      ['[s]artist:john doe[/s]', 'female:glasses'],
    ],
    [
      '[s]artist:john doe[/s][s]female:glasses[/s]',
      ['[s]artist:john doe[/s]', '[s]female:glasses[/s]'],
    ],
    [
      'artist:john doe some extra textfemale:glasses',
      ['artist:john doe some extra text', 'female:glasses'],
    ],
    ['artist:abc XYZ 123.-', ['artist:abc XYZ 123.-']],
    [
      'x:oyakodon - not present (female:)',
      ['x:oyakodon - not present (female:)'],
    ],
  ])('extracts tags from %j', (input, expected) => {
    expectTags(input, expected);
  });
});
