import { API_BATCH_LIMIT, API_URL } from '../const';
import { ApiResponseGallery, hasMetadataResponse } from '../types/api-types';
import { GalleryData, GalleryId } from '../types/gallery-types';
import {
  getGalleryHref,
  parseTagString,
  removeDuplicateIds,
} from '../utils/gallery-utils';
import { limiter } from './limiter';

/**
 * Fetches galleries from the API.
 *
 * WARNING: API doesnt return weak tags (power < 10) for batch requests
 * @returns Map of galleries by id
 */
export async function fetchGalleries(
  ids: GalleryId[],
): Promise<Map<number, GalleryData>> {
  ids = removeDuplicateIds(ids);
  const batches: GalleryId[][] = [];
  for (let i = 0; i < ids.length; i += API_BATCH_LIMIT) {
    batches.push(ids.slice(i, i + API_BATCH_LIMIT));
  }

  const galleries: Map<number, GalleryData> = new Map();
  for (const batch of batches) {
    console.info('Fetching batch of size', batch.length);
    const batchGalleries = await limiter.schedule(() => fetchBatch(batch));
    for (const gallery of batchGalleries) {
      galleries.set(gallery.id[0], gallery);
    }
  }
  return galleries;
}

async function fetchBatch(ids: GalleryId[]): Promise<GalleryData[]> {
  const body = {
    method: 'gdata',
    namespace: 1,
    gidlist: ids,
  };
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (response.status !== 200) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const json = await response.json();
  if (!hasMetadataResponse(json)) {
    throw new Error(`Could not parse API response: ${JSON.stringify(json)}`);
  }

  const { gmetadata: data } = json;
  return data.map(parseGalleryResponse);
}

function parseGalleryResponse(gallery: ApiResponseGallery): GalleryData {
  const id: GalleryId = [gallery.gid, gallery.token];
  return {
    id: id,
    href: getGalleryHref(id),
    title: gallery.title,
    titleJpn: gallery.title_jpn,
    category: gallery.category,
    thumb: gallery.thumb,
    uploader: gallery.uploader,
    posted: gallery.posted,
    expunged: gallery.expunged,
    rating: gallery.rating,
    tags: gallery.tags.map(parseTagString),
  };
}
