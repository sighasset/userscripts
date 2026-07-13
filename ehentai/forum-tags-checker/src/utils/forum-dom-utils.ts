const ASSISTANCE_FORUM_TITLE = 'Tagging and Mistagging Assistance';
const EDITING_PREFIX = 'Editing a post in ';
const REPLYING_PREFIX = 'Replying to ';

export function isDownvoteThread() {
  const url = new URL(window.location.href);
  return url.searchParams.get('showtopic') === '274004';
}
export function isEditingPost() {
  const titles = [...document.querySelectorAll('.maintitle')];
  return titles.some((t) =>
    t.textContent.includes(EDITING_PREFIX + ASSISTANCE_FORUM_TITLE),
  );
}
export function isCreatingPost() {
  const titles = [...document.querySelectorAll('.maintitle')];
  return titles.some((t) =>
    t.textContent.includes(REPLYING_PREFIX + ASSISTANCE_FORUM_TITLE),
  );
}

export function getPostText() {
  return getPostTextarea().value;
}
export function setPostText(text: string) {
  getPostTextarea().value = text;
}
function getPostTextarea() {
  return document.querySelector('#postcontent') as HTMLTextAreaElement;
}

export function getPostHref() {
  const url = new URL(window.location.href);
  if (url.searchParams.size === 0) {
    // how can i get post id on reply page? its not in dom yet
    url.searchParams.set('act', 'post');
    url.searchParams.set('do', 'edit_post');

    const f = (document.querySelector('input[name="f"]') as HTMLInputElement)
      .value;
    const t = (document.querySelector('input[name="t"]') as HTMLInputElement)
      .value;
    const p = (document.querySelector('input[name="p"]') as HTMLInputElement)
      .value;
    const st = (document.querySelector('input[name="st"]') as HTMLInputElement)
      .value;

    if (!f || !t || !p || !st) {
      throw new Error(`couldnt query url params from dom ${{ f, t, p, st }}`);
    }

    url.searchParams.set('f', 'edit_post');
    url.searchParams.set('t', 'edit_post');
    url.searchParams.set('p', 'edit_post');
    url.searchParams.set('st', 'edit_post');
  }

  return url.href;
}
