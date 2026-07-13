import { GalleryTag } from '@ehentai/lib/types';

export type Post = {
  galleries: PostGallery[];
  opener: string;
  href: string;
  date: string;
};

export type PostGallery = {
  lines: Line[];
  group: number;
  href: string;
  info: string;
};

export type Line = TagsLine | TextLine;

export type TagsLine = {
  tags: PostTag[];
  info: string;
};

export function isTagLine(line: Line | TagsLine): line is TagsLine {
  return 'tags' in line;
}

export type PostTag = GalleryTag & {
  isStriked: boolean;
};

export type TextLine = {
  text: string;
};
