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
