import { isTagLine, Post, PostGallery, TagsLine } from '@/types';

export function isStrikedPost(post: Post): boolean {
  return post.galleries.every((g) => isStrikedGallery(g));
}

export function isStrikedGroup(post: Post, group: number): boolean {
  return post.galleries
    .filter((p) => p.group === group)
    .every((g) => isStrikedGallery(g));
}

export function isStrikedGallery(gallery: PostGallery): boolean {
  return gallery.lines
    .filter((l) => isTagLine(l))
    .every((l) => isStrikedTagLine(l));
}

export function isStrikedTagLine(tagLine: TagsLine): boolean {
  return tagLine.tags.every((t) => t.isStriked);
}

export function getPostTagsCount(post: Post) {
  const tags = post.galleries.flatMap((g) =>
    g.lines.filter(isTagLine).flatMap((tl) => tl.tags),
  );
  return {
    strikedTags: tags.filter((t) => t.isStriked).length,
    totalTags: tags.length,
  };
}

export function getPostGalleriesCount(post: Post) {
  return {
    strikedGalleries: post.galleries.filter(isStrikedGallery).length,
    totalGalleries: post.galleries.length,
  };
}
