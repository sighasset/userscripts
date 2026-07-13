import { fetchGalleries, scrapeGallery } from '@ehentai/lib/api';
import { GalleryData, GalleryId, ScrapedGalleryData } from '@ehentai/lib/types';
import { getGalleryId, includesTag } from '@ehentai/lib/utils';

import { BATCH_TRIGGER_LIMIT } from '@/const';
import { isTagLine, Post } from '@/types';
import { isStrikedGallery } from '@/utils/post-utils';

type PostUpdate = {
  checkedPost: Post;
  strikedTags: number;
  checkedGalleries: number;
};

type PostChange = 'striked-tag' | 'checked-gallery' | 'increase-total';

/**
 * Updates tag.isStriked for galleries and returns number of striked tags
 */
export async function checkPosts(
  posts: Post[],
  onChange?: (change: PostChange) => void,
): Promise<PostUpdate[]> {
  const ids = posts.flatMap((p) =>
    p.galleries
      .filter((g) => !isStrikedGallery(g))
      .map((g) => getGalleryId(g.href)),
  );
  ids.forEach(() => onChange?.('increase-total'));
  const fetchedGalleries: Map<number, GalleryData> =
    ids.length > BATCH_TRIGGER_LIMIT ? await fetchGalleries(ids) : new Map();
  const scrapedGalleries: Map<number, ScrapedGalleryData> = new Map();

  const updates: PostUpdate[] = [];
  for (const post of posts) {
    const update = await checkPost(
      post,
      fetchedGalleries,
      scrapedGalleries,
      onChange,
    );
    if (update.strikedTags > 0) {
      updates.push(update);
    }
  }
  return updates;
}

async function checkPost(
  post: Post,
  fetchedGalleries: Map<number, GalleryData>,
  scrapedGalleries: Map<number, ScrapedGalleryData>,
  onChange?: (change: PostChange) => void,
): Promise<PostUpdate> {
  const checkedPost = structuredClone(post);
  let strikedTags = 0;
  let checkedGalleries = 0;
  for (const gallery of checkedPost.galleries) {
    if (isStrikedGallery(gallery)) continue;

    const id = getGalleryId(gallery.href);

    const fetchedTags = fetchedGalleries.get(id[0])?.tags ?? [];

    checkedGalleries++;
    onChange?.('checked-gallery');

    for (const line of gallery.lines) {
      if (!isTagLine(line)) continue;

      for (const tag of line.tags) {
        if (tag.isStriked) continue;

        if (!includesTag(fetchedTags, tag)) {
          // remoteGallery is batch request so we need to check if tag is weak or not present
          const { tags } = await getScrapedGallery(scrapedGalleries, id);
          if (includesTag(tags, tag)) continue;
          tag.isStriked = true;
          strikedTags++;
          onChange?.('striked-tag');
        }
      }
    }
  }
  return { checkedPost, strikedTags, checkedGalleries };
}

async function getScrapedGallery(
  scrapedGalleries: Map<number, ScrapedGalleryData>,
  id: GalleryId,
): Promise<ScrapedGalleryData> {
  const scrapedGallery = scrapedGalleries.get(id[0]);
  if (!scrapedGallery) {
    const scrapedGallery = await scrapeGallery(id);
    scrapedGalleries.set(id[0], scrapedGallery);
    return scrapedGallery;
  }
  return scrapedGallery;
}
