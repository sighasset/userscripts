import { GalleryTag } from '../types';
import { parseTagString } from '../utils';

export function queryGalleryTags(galleryDoc: Document): GalleryTag[] {
  const rows = [...galleryDoc.querySelectorAll('#taglist table tbody tr')];
  if (rows.length === 0) {
    console.warn('Queried 0 tags from gallery document');
  }

  const result: GalleryTag[] = [];
  for (const row of rows) {
    const namespace = row.querySelector('td');
    if (!namespace) {
      throw new Error('Couldnt query namespace from gallery document.row');
    }

    const tags = row.querySelectorAll('div');
    tags.forEach((tag) => {
      result.push(parseTagString(namespace.textContent + tag.textContent));
    });
  }

  return result;
}
