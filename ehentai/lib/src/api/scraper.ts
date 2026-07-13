import { FETCH_FROM_URL, GALLERY_PATH } from '../const';
import { queryGalleryTags } from '../parser';
import { GalleryId, ScrapedGalleryData } from '../types';
import { limiter } from './limiter';

export async function scrapeGallery(
  id: GalleryId,
): Promise<ScrapedGalleryData> {
  const href = `${FETCH_FROM_URL}${GALLERY_PATH}${id[0]}/${id[1]}/`;
  console.info(`scraping ${href}`);
  const document = await fetch(href);
  const tags = queryGalleryTags(document);
  return {
    id,
    href,
    tags,
  };
}

const parser = new DOMParser();
const fetch = (url: string): Promise<Document> => {
  return limiter.schedule(
    () =>
      new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          headers: {
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',

            'User-Agent': navigator.userAgent,
          },

          onload: (response) =>
            resolve(parser.parseFromString(response.responseText, 'text/html')),
          onerror: (error) => reject(error),
        });
      }),
  );
};
