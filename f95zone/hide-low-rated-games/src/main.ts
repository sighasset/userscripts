// @ts-ignore isolatedModules
import './main.css';

import { GM_getValue } from '$';
import { registerConfigNumberVar } from './config';
import { LIKES_ID, LOW_RATED_CLASS, VIEWS_ID } from './const';
import { queryGames, queryLikes, queryRating, queryViews } from './queries';

const RATING_ID = 'min_rating';

registerConfigNumberVar(RATING_ID, 4.0, 'Minimum Rating', refreshLowRated);
registerConfigNumberVar(LIKES_ID, 0, 'Minimum Likes', refreshLowRated);
registerConfigNumberVar(VIEWS_ID, 0, 'Minimum Views', refreshLowRated);

observeBody();

function observeBody() {
  const targetNode = document.querySelector('body') as HTMLBodyElement;
  const config = { childList: true, subtree: true };

  const observer = new MutationObserver(hideLowRated);
  observer.observe(targetNode, config);
}

function hideLowRated() {
  const minRating = GM_getValue(RATING_ID);
  const minLikes = GM_getValue(LIKES_ID);
  const minViews = GM_getValue(VIEWS_ID);
  if (minRating <= 0 && minLikes <= 0 && minViews <= 0) return;

  for (const game of queryGames()) {
    const rating = queryRating(game);
    const likes = queryLikes(game);
    const views = queryViews(game);
    if (rating < minRating || likes < minLikes || views < minViews) {
      game.classList.add(LOW_RATED_CLASS);
    }
  }
}
function undoHide() {
  const entries = document.querySelectorAll(`.${LOW_RATED_CLASS}`);
  entries.forEach((e) => e.classList.remove(LOW_RATED_CLASS));
}
function refreshLowRated() {
  undoHide();
  hideLowRated();
}
