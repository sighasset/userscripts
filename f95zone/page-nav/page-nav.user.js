// ==UserScript==
// @name         Page Navigation
// @namespace    https://github.com/sighasset
// @version      0.2
// @description  Navigate pages with F1 (previous) and F2 (next)
// @author       sighasset
// @match        https://f95zone.to/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=f95zone.to
// @updateURL    https://raw.githubusercontent.com/sighasset/userscripts/main/f95zone/page-nav/page-nav.meta.js
// @downloadURL  https://raw.githubusercontent.com/sighasset/userscripts/main/f95zone/page-nav/page-nav.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  document.addEventListener('keyup', (e) => {
    if (e.code === 'F1') {
      queryPrevBtn()?.click();
    } else if (e.code === 'F2') {
      queryNextBtn()?.click();
    }
  });

  function queryNextBtn() {
    return (
      document.querySelector('a.nav_next') ??
      document.querySelector('a.pageNav-jump--next')
    );
  }
  function queryPrevBtn() {
    return (
      document.querySelector('a.nav_prev') ??
      document.querySelector('a.pageNav-jump--prev')
    );
  }
})();
