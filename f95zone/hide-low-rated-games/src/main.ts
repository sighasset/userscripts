// @ts-ignore isolatedModules
import './main.css';

import {
  GM_getValue,
  GM_registerMenuCommand,
  GM_setValue,
  GM_unregisterMenuCommand,
} from '$';

const LOW_RATED_CLASS = 'us-low-rated';

let threshold: number = GM_getValue('threshold', 4);
let configMenuId: string | number;

registerConfigMenu();
observeBody();

function registerConfigMenu() {
  if (configMenuId !== undefined) {
    GM_unregisterMenuCommand(configMenuId);
  }

  configMenuId = GM_registerMenuCommand(
    `Set minimum rating (${threshold})`,
    async () => {
      const value = prompt('Minimum rating', threshold.toString());
      if (!value) return;

      const newThreshold = parseFloat(value);
      if (Number.isNaN(newThreshold)) return;

      threshold = newThreshold;
      GM_setValue('threshold', threshold);

      clearLowRated();
      setLowRated();

      registerConfigMenu();
    },
  );
}

function observeBody() {
  const targetNode = document.querySelector('body') as HTMLBodyElement;
  const config = { childList: true, subtree: true };

  const observer = new MutationObserver(setLowRated);
  observer.observe(targetNode, config);
}

function setLowRated() {
  if (threshold <= 0) return;

  const entries = document.querySelectorAll('div.resource-tile');
  entries.forEach((entry) => {
    const rating = entry.querySelector('div.resource-tile_info-meta_rating');
    if (!rating) {
      throw new Error('Couldnt query rating block');
    }
    if (parseFloat(rating.textContent) >= threshold) return;
    entry.classList.add(LOW_RATED_CLASS);
  });
}
function clearLowRated() {
  const entries = document.querySelectorAll(`.${LOW_RATED_CLASS}`);
  entries.forEach((e) => e.classList.remove(LOW_RATED_CLASS));
}
