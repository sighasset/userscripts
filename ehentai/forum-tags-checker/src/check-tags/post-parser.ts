import { ShortenNamespace } from '@ehentai/lib/types';
import { includesTagString, parseTagFromString } from '@ehentai/lib/utils';

import {
  DEFAULT_OPENER_MSG,
  PARSER_GROUP_SPLITTER,
  TAG_SPLITTER,
  THANKS_MSG,
  TO_STRING_GROUP_SPLITTER,
} from '@/const';
import { isTagLine, Line, Post, PostGallery, PostTag, TagsLine } from '@/types';
import {
  getDirtyTagStrings,
  isGalleryLinkLine,
  isStrikedLine,
  unwrapLink,
  unwrapStriked,
  wrapStriked,
} from '@/utils/parser-utils';
import {
  isStrikedGallery,
  isStrikedPost,
  isStrikedTagLine,
} from '@/utils/post-utils';

// Posts expectations:
// 1. tags preceed gallery link
// 2. after encountering gallery link, current tags bag will be assigned to all galleries until new tag lines encountered

// from string

export function parsePost(
  text: string,
  href: string = window.location.href,
  date: string = new Date().toISOString(),
): Post {
  if (text.startsWith(THANKS_MSG)) {
    text = text.slice(THANKS_MSG.length).trimStart();
  }

  const firstLine = text.split('\n')[0];
  let opener = DEFAULT_OPENER_MSG;
  if (
    firstLine &&
    !includesTagString(firstLine) &&
    !isGalleryLinkLine(firstLine)
  ) {
    if (isStrikedLine(firstLine)) {
      const { value } = unwrapStriked(firstLine);
      opener = value;
      text = text.slice(firstLine.length).trimStart();
    } else {
      opener = firstLine;
      text = text.slice(firstLine.length).trimStart();
    }
  }

  const groups = text
    .split(new RegExp(PARSER_GROUP_SPLITTER.join('|')))
    .map((t, i) => ({
      lines: t.split('\n').filter((l) => l.length > 0),
      group: i,
    }));

  if (groups.length === 0 || groups[0].lines.length === 0) {
    return { opener: '', href, date, galleries: [] };
  }

  const galleries: PostGallery[] = [];
  const linesBag: Line[] = [];
  let shouldClearBag = false;
  for (const { lines, group } of groups) {
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];

      if (isGalleryLinkLine(lineText)) {
        shouldClearBag = true;

        const { href, info, isStriked } = parseGalleryLink(lineText);
        let lines = structuredClone(linesBag);
        if (isStriked) {
          // set all tags.isStriked = true
          lines = lines.map((l) => {
            if (isTagLine(l)) {
              return {
                ...l,
                tags: l.tags.map((t) => ({ ...t, isStriked: true })),
              };
            }
            return l;
          });
        }

        const gallery: PostGallery = {
          href,
          info,
          lines,
          group,
        };
        galleries.push(gallery);
        continue;
      }

      if (includesTagString(lineText)) {
        if (shouldClearBag) {
          linesBag.length = 0;
          shouldClearBag = false;
        }

        linesBag.push(parseTagsLine(lineText));
        continue;
      }

      linesBag.push({ text: lineText });
    }
  }

  return {
    opener,
    href,
    date,
    galleries,
  };
}

function parseTagsLine(line: string): TagsLine {
  const isStrikedTl = isStrikedLine(line);
  if (isStrikedTl) {
    const { value, suffix } = unwrapStriked(line);
    line = `${value.trim()} ${suffix.trim()}`;
  }

  const tagStrings = getDirtyTagStrings(line);

  let info = '';
  const tags: PostTag[] = tagStrings.map((tagStr, index) => {
    tagStr = tagStr.trimEnd();
    while (tagStr.endsWith(TAG_SPLITTER)) {
      tagStr = tagStr.slice(0, -1);
    }

    const isStriked = isStrikedLine(tagStr);
    if (isStriked) {
      const { value, suffix } = unwrapStriked(tagStr);
      tagStr = `${value.trim()} ${suffix.trim()}`;
    }

    const { tag, suffix } = parseTagFromString(tagStr);
    if (index === tagStrings.length - 1) {
      info = suffix;
    } else if (suffix) {
      console.warn('parser: dropping tag suffix: ', suffix);
    }
    return {
      ...tag,
      isStriked: isStrikedTl || isStriked,
    };
  });

  return { tags, info };
}

function parseGalleryLink(linkLine: string): {
  href: string;
  info: string;
  isStriked: boolean;
} {
  const isStriked = isStrikedLine(linkLine);

  let strikedSuffix = '';
  if (isStriked) {
    const { value, suffix } = unwrapStriked(linkLine);
    linkLine = value;
    strikedSuffix = suffix;
  }

  const splitted = linkLine.split(' ');
  const link = unwrapLink(splitted[0]);
  const info = splitted.slice(1).join(' ');

  return {
    href: link,
    info: [info.trimStart(), strikedSuffix.trimEnd()].filter(Boolean).join(' '),
    isStriked,
  };
}

// to string

export function postToString(post: Post): string {
  const opener = post.opener || DEFAULT_OPENER_MSG;

  const activeGalleries = post.galleries.filter((g) => !isStrikedGallery(g));

  const completedGalleries = post.galleries.filter(isStrikedGallery);

  const activeContent =
    activeGalleries.length > 0 ? renderGroupedGalleries(activeGalleries) : '';

  const completedContent =
    completedGalleries.length > 0
      ? renderGroupedGalleries(completedGalleries)
      : '';

  const sections: string[] = [];

  const postIsStriked = isStrikedPost(post);

  if (postIsStriked) {
    sections.push(THANKS_MSG);
  }

  sections.push(postIsStriked ? wrapStriked(opener) : opener);

  if (activeContent) {
    sections.push(activeContent);
  }

  if (completedContent) {
    if (!postIsStriked) {
      sections.push(THANKS_MSG);
    }
    sections.push(completedContent);
  }

  return sections.filter(Boolean).join('\n\n');
}

function renderGroupedGalleries(galleries: PostGallery[]): string {
  const groups = [...new Set(galleries.map((g) => g.group))].sort(
    (a, b) => a - b,
  );

  return groups
    .map((group) =>
      galleriesToString(galleries.filter((g) => g.group === group)),
    )
    .join(TO_STRING_GROUP_SPLITTER);
}

function galleriesToString(galleries: PostGallery[]): string {
  return galleries.map(galleryToString).join('\n\n');
}

function galleryToString(gallery: PostGallery): string {
  const lines = [
    ...gallery.lines
      .filter(isTagLine)
      .sort((a, b) => +isStrikedTagLine(a) - +isStrikedTagLine(b))
      .concat(),
    ...gallery.lines.filter((l) => !isTagLine(l)),
  ].map(lineToString);

  let linkLine = `[url=${gallery.href}]${gallery.href}[/url]${gallery.info}`;
  if (isStrikedGallery(gallery)) {
    linkLine = wrapStriked(linkLine);
  }
  lines.push(linkLine);

  return lines.join('\n');
}

function lineToString(line: Line): string {
  return isTagLine(line) ? tagLineToString(line) : line.text;
}

function tagLineToString(line: TagsLine): string {
  const isStriked = isStrikedTagLine(line);
  const tagsStr = line.tags
    .sort((a, b) => +a.isStriked - +b.isStriked)
    .map((t) => tagToString(t, !isStriked))
    .join(`${TAG_SPLITTER} `);

  const tagLineStr = `${tagsStr}${line.info}`;
  return isStriked ? wrapStriked(tagLineStr) : tagLineStr;
}

function tagToString(tag: PostTag, shouldWrap: boolean = true): string {
  const value = `${ShortenNamespace[tag.namespace]}${tag.name}`;
  return tag.isStriked && shouldWrap ? wrapStriked(value) : value;
}
