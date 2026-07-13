import { unsafeWindow } from '$';
import { query } from '@ehentai/lib/utils';

import { parsePost } from '@/check-tags/post-parser';
import { saveOrUpdatePost } from '@/storage/persist-posts';
import { getPostHref, getPostText } from '@/utils/forum-dom-utils';

export async function setupPostAutoSave() {
  const accessor = (): Function | null =>
    (unsafeWindow as any)?.ValidateForm ?? null;

  const originalValidate = await query(accessor, {
    retry: 2 * 15,
    timeout: 500,
  });

  if (!originalValidate) {
    const message =
      'failed to setup post auto save: couldnt query validate form function on window.';
    console.error(message);
    return;
  }

  (unsafeWindow as any).ValidateForm = function (...args: any[]) {
    try {
      const href = getPostHref();
      const post = parsePost(getPostText(), href);
      saveOrUpdatePost(post);
    } catch (e) {
      alert('Failed to save post: ' + e);
    }

    return originalValidate.apply(this, args);
  };
}
