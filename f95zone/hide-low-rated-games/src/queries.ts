export function queryGames(): NodeListOf<Element> {
  return document.querySelectorAll('div.resource-tile');
}

export function queryRating(entry: Element): number {
  const rating = entry.querySelector('div.resource-tile_info-meta_rating');
  if (!rating) {
    throw new Error('Couldnt query rating block');
  }
  return parseFloat(rating.textContent);
}

export function queryLikes(entry: Element): number {
  const likes = entry.querySelector('div.resource-tile_info-meta_likes');
  if (!likes) {
    throw new Error('Couldnt query likes block');
  }
  return parseInt(likes.textContent);
}

export function queryViews(entry: Element): number {
  const views = entry.querySelector('div.resource-tile_info-meta_views');
  if (!views) {
    throw new Error('Couldnt query views block');
  }
  // views can use K or M suffixes, so we need to handle that
  const viewsText = views.textContent.trim();
  const multiplier = viewsText.endsWith('K')
    ? 1000
    : viewsText.endsWith('M')
      ? 1000000
      : 1;
  const viewsNumber = parseFloat(viewsText.replace(/[KM]/, ''));
  return Math.round(viewsNumber * multiplier);
}
