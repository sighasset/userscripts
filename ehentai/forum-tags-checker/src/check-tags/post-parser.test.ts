import {
  DEFAULT_OPENER_MSG,
  PARSER_GROUP_SPLITTER,
  THANKS_MSG,
  TO_STRING_GROUP_SPLITTER,
} from '@/const';
import { isTagLine } from '@/types';

import { parsePost, postToString } from './post-parser';

const LINKS = [
  'https://e-hentai.org/g/1/a',
  'https://e-hentai.org/g/2/b',
] as const;

const TAGS = [
  {
    namespace: 'female:',
    name: 'elf',
  },
  {
    namespace: 'mixed:',
    name: 'anal intercourse',
  },
] as const;

const TAGS_WITH_INFO = [
  {
    namespace: 'female:',
    name: 'anal intercourse',
    suffix: ' 2/20',
  },
  {
    namespace: 'mixed:',
    name: 'oyakodon',
    suffix: ' (p. 11-12)',
  },
  {
    namespace: 'other:',
    name: '3d',
    suffix: ' - p. 11-12',
  },
] as const;

function tagToString(tag: {
  namespace: string;
  name: string;
  suffix?: string;
}) {
  return `${tag.namespace}${tag.name}${tag.suffix ?? ''}`;
}

function expectTag(
  tag: {
    namespace: string;
    name: string;
  },
  isStriked = false,
) {
  return expect.objectContaining({
    namespace: tag.namespace,
    name: tag.name,
    isStriked,
  });
}

function createPost(text: string) {
  return parsePost(text.trim());
}

function serialize(text: string) {
  return postToString(createPost(text));
}

describe('parsePost', () => {
  it('uses first line as opener when it is non-tag non-gallery', () => {
    const post = parsePost(
      `
My opener
${tagToString(TAGS[0])}
${LINKS[0]}
`.trim(),
    );

    expect(post.opener).toBe('My opener');
  });

  it('uses default opener when post doesnt have opener', () => {
    expect(parsePost(LINKS[0]).opener).toBe(DEFAULT_OPENER_MSG);
    expect(parsePost(tagToString(TAGS[0])).opener).toBe(DEFAULT_OPENER_MSG);
    expect(parsePost(tagToString(TAGS_WITH_INFO[0])).opener).toBe(
      DEFAULT_OPENER_MSG,
    );
  });

  it('parses tags attached to gallery', () => {
    const allTags = [...TAGS, ...TAGS_WITH_INFO];

    const post = parsePost(
      `
${allTags.map(tagToString).join('\n')}
${LINKS[0]}
`.trim(),
    );

    expect(post.galleries).toHaveLength(1);
    expect(post.galleries[0].lines).toHaveLength(allTags.length);

    post.galleries[0].lines.forEach((line, index) => {
      if (!isTagLine(line)) {
        throw new Error('expected tag line');
      }

      expect(line.tags).toEqual([expectTag(allTags[index])]);
    });
  });

  it('parses multiple tags from a single line', () => {
    const post = parsePost(
      `
${tagToString(TAGS[0])}, ${tagToString(TAGS[1])}
${LINKS[0]}
`.trim(),
    );

    expect(post.galleries).toHaveLength(1);
    expect(post.galleries[0].lines).toHaveLength(1);

    const line = post.galleries[0].lines[0];

    if (!isTagLine(line)) {
      throw new Error('expected tag line');
    }

    expect(line.tags).toEqual(
      expect.arrayContaining([expectTag(TAGS[0]), expectTag(TAGS[1])]),
    );

    expect(line.tags).toHaveLength(2);
  });

  it('parses namespace and name from tags', () => {
    const post = parsePost(
      `
${tagToString(TAGS[0])}
${tagToString(TAGS[1])}
${LINKS[0]}
`.trim(),
    );

    expect(post.galleries[0].lines).toHaveLength(2);

    post.galleries[0].lines.forEach((line, index) => {
      if (!isTagLine(line)) {
        throw new Error('expected tag line');
      }

      expect(line.tags).toEqual([expectTag(TAGS[index])]);
    });
  });

  it('parses striked tags', () => {
    const post = parsePost(
      `
[s]${tagToString(TAGS[0])}[/s]
${LINKS[0]}
`.trim(),
    );

    const line = post.galleries[0].lines[0];

    if (!isTagLine(line)) {
      throw new Error('expected tag line');
    }

    expect(line.tags).toEqual([expectTag(TAGS[0], true)]);
  });

  it('preserves text lines before gallery', () => {
    const post = parsePost(
      `
${DEFAULT_OPENER_MSG}
some note
another note
${LINKS[0]}
`.trim(),
    );

    expect(post.galleries[0].lines).toEqual([
      { text: 'some note' },
      { text: 'another note' },
    ]);
  });

  it('supports multiple galleries after single tags group', () => {
    const post = parsePost(
      `
${tagToString(TAGS[0])}
${LINKS[0]}
${LINKS[1]}
`.trim(),
    );

    expect(post.galleries).toHaveLength(2);

    expect(post.galleries[0].lines).toHaveLength(1);
    expect(post.galleries[1].lines).toHaveLength(1);
  });

  it('does not mutate tags of previous galleries when a later gallery is striked', () => {
    const post = parsePost(
      `
${tagToString(TAGS[0])}
${LINKS[0]}
[s]${LINKS[1]}[/s]
`.trim(),
    );

    const firstLine = post.galleries[0].lines[0];
    const secondLine = post.galleries[1].lines[0];

    if (!isTagLine(firstLine) || !isTagLine(secondLine)) {
      throw new Error('expected tag line');
    }

    expect(firstLine.tags).toEqual(
      expect.arrayContaining([expectTag(TAGS[0])]),
    );

    expect(secondLine.tags).toEqual(
      expect.arrayContaining([expectTag(TAGS[0], true)]),
    );
  });

  it('clears previous tags for next gallery', () => {
    const post = parsePost(
      `
${tagToString(TAGS[0])}
${LINKS[0]}

${tagToString(TAGS[1])}
${LINKS[1]}
`.trim(),
    );

    const firstLine = post.galleries[0].lines[0];
    const secondLine = post.galleries[1].lines[0];

    if (!isTagLine(firstLine) || !isTagLine(secondLine)) {
      throw new Error('expected tag line');
    }

    expect(firstLine.tags).toEqual(
      expect.arrayContaining([expectTag(TAGS[0])]),
    );

    expect(secondLine.tags).toEqual(
      expect.arrayContaining([expectTag(TAGS[1])]),
    );
  });

  it('assigns galleries to groups separated by group splitter', () => {
    const post = parsePost(
      `
${LINKS[0]}${PARSER_GROUP_SPLITTER[0]}${LINKS[1]}
`.trim(),
    );

    expect(post.galleries).toHaveLength(2);
    expect(post.galleries[0].group).toBe(post.galleries[1].group - 1);
  });

  it('preserves tag inheritance across group boundaries', () => {
    const post = parsePost(
      `
${tagToString(TAGS[0])}
${LINKS[0]}${PARSER_GROUP_SPLITTER}${LINKS[1]}
`.trim(),
    );

    expect(post.galleries).toHaveLength(2);

    const firstLine = post.galleries[0].lines[0];
    const secondLine = post.galleries[1].lines[0];

    if (!isTagLine(firstLine) || !isTagLine(secondLine)) {
      throw new Error('expected tag line');
    }

    expect(firstLine.tags).toEqual(
      expect.arrayContaining([expectTag(TAGS[0])]),
    );

    expect(secondLine.tags).toEqual(
      expect.arrayContaining([expectTag(TAGS[0])]),
    );
  });
});

describe('postToString', () => {
  it('preserves opener', () => {
    expect(
      serialize(`
My opener
${LINKS[0]}
`),
    ).toContain('My opener');
  });

  it('renders gallery links', () => {
    const result = serialize(`
${LINKS[0]}
`);

    expect(result).toContain(`[url=${LINKS[0]}]${LINKS[0]}[/url]`);
  });

  it('renders tag lines', () => {
    const result = serialize(`
${tagToString(TAGS[0])}
${LINKS[0]}
`);

    expect(result).toContain(`${TAGS[0].name}`);
  });

  it('moves striked tags to the end of tag line', () => {
    const result = serialize(`
female:elf, [s]mixed:anal intercourse[/s], female:big breasts
${LINKS[0]}
`);

    expect(result.indexOf(':anal intercourse')).toBeGreaterThan(
      result.indexOf(':elf'),
    );
    expect(result.indexOf(':anal intercourse')).toBeGreaterThan(
      result.indexOf(':big breasts'),
    );
  });

  it('renders text lines', () => {
    const result = serialize(`
${DEFAULT_OPENER_MSG}
note 1
note 2
${LINKS[0]}
`);

    expect(result).toContain('note 1');
    expect(result).toContain('note 2');
  });

  it('places completed galleries after thanks section', () => {
    const result = serialize(`
female:elf
${LINKS[0]}

[s]female:anal intercourse[/s]
[s]${LINKS[1]}[/s]
`);

    const activeTag = result.indexOf(':elf');
    const thanks = result.lastIndexOf(THANKS_MSG);
    const completedTag = result.indexOf(':anal intercourse');

    expect(activeTag).toBeLessThan(thanks);
    expect(thanks).toBeLessThan(completedTag);
  });

  it('renders thanks at top when post is fully completed', () => {
    const result = serialize(`
[s]female:elf[/s]
[s]${LINKS[0]}[/s]
`);

    expect(result.startsWith(THANKS_MSG)).toBe(true);
  });

  it('strikes opener when post is fully completed', () => {
    const result = serialize(`
My opener
[s]female:elf[/s]
[s]${LINKS[0]}[/s]
`);

    expect(result).toContain('[s]My opener[/s]');
  });

  it('preserves group boundaries', () => {
    const result = serialize(`
${LINKS[0]}
${PARSER_GROUP_SPLITTER}
${LINKS[1]}
`);

    const first = result.indexOf(LINKS[0]);
    const splitter = result.indexOf(TO_STRING_GROUP_SPLITTER);
    const second = result.indexOf(LINKS[1]);

    expect(first).toBeLessThan(splitter);
    expect(splitter).toBeLessThan(second);
  });
});
