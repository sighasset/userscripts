import { TAG_NAME_REGEX } from '@ehentai/lib';
import { Namespaces } from '@ehentai/lib/types';

export function isGalleryLinkLine(line: string) {
  return line.includes('hentai.org/g/');
}

export function unwrapLink(link: string) {
  if (!link.includes('[url=')) {
    return link;
  }
  const startIndex = link.indexOf('[url=') + 5;
  const endIndex = link.indexOf(']', startIndex);
  return link.substring(startIndex, endIndex);
}

export function isStrikedLine(line: string) {
  line = line.trim();
  const strikedStart = line.indexOf('[s]');
  const strikedEnd = line.lastIndexOf('[/s]');
  // [s] at the start && [/s] is present after [s]
  return strikedStart === 0 && strikedEnd > strikedStart;
}

export function unwrapStriked(line: string): { value: string; suffix: string } {
  if (!isStrikedLine(line)) {
    // console.warn('line is not striked: ', line);
    return { value: line, suffix: '' };
  }
  const strikedStart = line.indexOf('[s]');
  const strikedEnd = line.lastIndexOf('[/s]');
  const value = line.slice(strikedStart + 3, strikedEnd);
  const suffix = line.slice(strikedEnd + 4);
  return { value, suffix };
}

export function wrapStriked(text: string) {
  return `[s]${text}[/s]`;
}

const tagStartRegex = new RegExp(
  `(?:\\[s\\])?(?:${Namespaces.join('|')})(?=${TAG_NAME_REGEX})`,
  'g',
);
export function getDirtyTagStrings(text: string): string[] {
  const starts = [...text.matchAll(tagStartRegex)].map((m) => m.index);
  if (starts.length === 0) return [];

  return starts.map((start, i) => {
    const end = starts[i + 1] ?? text.length;
    const chunk = text.slice(start, end);
    const closeIdx = chunk.indexOf('[/s]');
    return closeIdx === -1 ? chunk : chunk.slice(0, closeIdx + 4);
  });
}
