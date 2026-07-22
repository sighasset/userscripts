// ==UserScript==
// @name         Hide Low Rated Games
// @namespace    https://github.com/sighasset/userscripts/tree/main/f95zone
// @version      0.2
// @author       sighasset
// @description  Hides search results below the configured rating threshold
// @icon         https://www.google.com/s2/favicons?sz=64&domain=f95zone.to
// @downloadURL  https://github.com/sighasset/userscripts/raw/refs/heads/main/f95zone/hide-low-rated-games/dist/hide-low-rated-games.user.js
// @updateURL    https://github.com/sighasset/userscripts/raw/refs/heads/main/f95zone/hide-low-rated-games/dist/hide-low-rated-games.meta.js
// @match        https://f95zone.to/sam/latest_alpha/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_unregisterMenuCommand
// ==/UserScript==

(function() {
	"use strict";
	var s = new Set();
	var _css = async (t) => {
		if (s.has(t)) return;
		s.add(t);
		((c) => {
			if (typeof GM_addStyle === "function") GM_addStyle(c);
			else (document.head || document.documentElement).appendChild(document.createElement("style")).append(c);
		})(t);
	};
	_css("div.resource-tile.us-low-rated{display:none}");
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var _GM_unregisterMenuCommand = (() => typeof GM_unregisterMenuCommand != "undefined" ? GM_unregisterMenuCommand : void 0)();
	var varsMap = new Map();
	function registerConfigNumberVar(id, defaultValue, menuText, onUpdate) {
		const existingVar = varsMap.get(id);
		if (existingVar) _GM_unregisterMenuCommand(existingVar);
		const value = Number(_GM_getValue(id, defaultValue));
		let menuId = _GM_registerMenuCommand(`${menuText} (${value})`, async () => {
			const input = prompt(menuText, value.toString());
			if (!input) return;
			const normalizedInput = input.trim().replaceAll(",", ".");
			const newValue = Number(normalizedInput);
			if (!Number.isFinite(newValue)) return;
			_GM_setValue(id, newValue);
			if (onUpdate) onUpdate(newValue);
		});
		varsMap.set(id, menuId);
	}
	var LOW_RATED_CLASS = "us-low-rated";
	function queryGames() {
		return document.querySelectorAll("div.resource-tile");
	}
	function queryRating(entry) {
		const rating = entry.querySelector("div.resource-tile_info-meta_rating");
		if (!rating) throw new Error("Couldnt query rating block");
		return parseFloat(rating.textContent);
	}
	var RATING_ID = "min_rating";
	registerConfigNumberVar(RATING_ID, 4, "Minimum rating", refreshLowRated);
	observeBody();
	function observeBody() {
		const targetNode = document.querySelector("body");
		new MutationObserver(hideLowRated).observe(targetNode, {
			childList: true,
			subtree: true
		});
	}
	function hideLowRated() {
		const minRating = _GM_getValue(RATING_ID);
		if (minRating <= 0) return;
		for (const game of queryGames()) if (queryRating(game) < minRating) game.classList.add(LOW_RATED_CLASS);
	}
	function undoHide() {
		document.querySelectorAll(`.${LOW_RATED_CLASS}`).forEach((e) => e.classList.remove(LOW_RATED_CLASS));
	}
	function refreshLowRated() {
		undoHide();
		hideLowRated();
	}
})();
