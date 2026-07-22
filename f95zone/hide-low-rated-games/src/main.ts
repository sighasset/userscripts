// @ts-ignore isolatedModules
import './main.css';

import { GM_getValue } from '$';
import { registerConfigNumberVar } from './config';
import { LOW_RATED_CLASS } from './const';
import { queryGames, queryRating } from './queries';

const RATING_ID = 'min_rating';

registerConfigNumberVar(RATING_ID, 4.0, 'Minimum rating', refreshLowRated);

observeBody();

function observeBody() {
  const targetNode = document.querySelector('body') as HTMLBodyElement;
  const config = { childList: true, subtree: true };

  const observer = new MutationObserver(hideLowRated);
  observer.observe(targetNode, config);
}

function hideLowRated() {
  const minRating = GM_getValue(RATING_ID);
  if (minRating <= 0) return;

  for (const game of queryGames()) {
    const rating = queryRating(game);
    if (rating < minRating) {
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
