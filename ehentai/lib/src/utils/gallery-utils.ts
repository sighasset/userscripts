import { EHENTAI_URL, GALLERY_PATH, TAG_NAME_REGEX } from '../const';
import { GalleryId, GalleryTag } from '../types/gallery-types';
import {
  isNamespace,
  Namespace,
  Namespaces,
  ShortenNamespace,
} from '../types/namespace-types';

export function getGalleryHref(id: GalleryId) {
  return `${EHENTAI_URL}${GALLERY_PATH}${id[0]}/${id[1]}`;
}

export function getGalleryId(href: string): GalleryId {
  try {
    const url = new URL(href);
    const parts = url.pathname.split('/').filter((p) => p.length > 0);
    const galleryId = parts.slice(-2);

    const id = Number(galleryId[0]);
    if (isNaN(id)) {
      throw new Error(`Invalid id: ${id}`);
    }
    const token = galleryId[1];
    if (!token) {
      throw new Error(`Invalid token: ${token}`);
    }

    return [id, token];
  } catch (e) {
    throw new Error(`Invalid gallery href: ${href}. ${e}`);
  }
}

export function isEqualGalleryId(a: GalleryId, b: GalleryId) {
  return a[0] === b[0] && a[1] === b[1];
}

export function removeDuplicateIds(ids: GalleryId[]) {
  return ids.filter(
    (id, index) => ids.findIndex((id2) => isEqualGalleryId(id2, id)) === index,
  );
}

/**
 * Tried to parse a tag from exact string
 */
export function parseTagString(tag: string): GalleryTag {
  const parts = tag.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid tag string "${tag}"`);
  }

  const namespace = parts[0] + ':';
  if (!isNamespace(namespace)) {
    throw new Error(`Invalid namespace "${namespace}" in tag string "${tag}"`);
  }

  const name = parts[1];
  if (!name) {
    throw new Error(`Invalid tag name "${name}" in tag string "${tag}"`);
  }

  return {
    namespace: namespace,
    name: parts[1],
  };
}

const namespaceRegex = new RegExp(Namespaces.join('|'));
const tagNameRegex = new RegExp(`^${TAG_NAME_REGEX}$`);
/**
 * Tries to parse first encountered tag in a string
 */
export function parseTagFromString(text: string): {
  tag: GalleryTag;
  suffix: string;
} {
  const match = text.match(namespaceRegex);
  if (!match) {
    throw new Error(`Tag not found in text "${text}"`);
  }
  const namespace = match[0] as Namespace;

  const tail = text.slice(match.index! + namespace.length);
  if (!tail) {
    throw new Error(
      `Empty tag name in text "${text}" for namespace "${namespace}"`,
    );
  }

  const parts = tail.trim().split(/\s+/);
  const invalidPartIndex = parts.findIndex(
    (part) => !part || /^[ .-]/.test(part) || !tagNameRegex.test(part),
  );

  const validParts =
    invalidPartIndex === -1 ? parts : parts.slice(0, invalidPartIndex);

  if (invalidPartIndex !== -1) {
    const invalidPart = parts[invalidPartIndex];
    if (!/^[0-9 .-]/.test(invalidPart)) {
      const m = invalidPart.match(/^[a-zA-Z0-9]+/);
      if (m) validParts.push(m[0]);
    }
  }

  const name = validParts.join(' ');
  if (!name) {
    throw new Error(
      `Empty tag name in text "${text}" for namespace "${namespace}"`,
    );
  }

  const lastPart = validParts[validParts.length - 1];
  const tailConsumedCount = tail.indexOf(lastPart) + lastPart.length;
  const suffix = tail.slice(tailConsumedCount);

  return { tag: { name, namespace }, suffix };
}

export function isTagString(tag: string): boolean {
  try {
    parseTagString(tag);
    return true;
  } catch (e) {
    return false;
  }
}

export function equalsNamespace(a: Namespace, b: Namespace): boolean {
  return ShortenNamespace[a] === ShortenNamespace[b];
}

export function includesTagString(text: string): boolean {
  return Namespaces.some((ns) => {
    const index = text.indexOf(ns);
    return (
      index !== -1 &&
      text.slice(index + ns.length, index + ns.length + 1).match(/[a-zA-Z0-9]/)
    );
  });
}

export function equalsTag(a: GalleryTag, b: GalleryTag): boolean {
  return equalsNamespace(a.namespace, b.namespace) && a.name === b.name;
}

export function includesTag(tags: GalleryTag[], tag: GalleryTag): boolean {
  return tags.some((t) => equalsTag(t, tag));
}
