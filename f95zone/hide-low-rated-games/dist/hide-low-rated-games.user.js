// ==UserScript==
// @name         Hide Low Rated Games
// @namespace    https://github.com/sighasset/userscripts/tree/main/f95zone
// @version      0.3
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
	function registerConfigNumberVar(id, value, menuText, onUpdate) {
		const existingVar = varsMap.get(id);
		if (existingVar) _GM_unregisterMenuCommand(existingVar);
		_GM_setValue(id, value);
		let menuId = _GM_registerMenuCommand(`${menuText} (${value})`, async () => {
			const input = prompt(menuText, value.toString());
			if (!input) return;
			const normalizedInput = input.trim().replaceAll(",", ".");
			const newValue = Number(normalizedInput);
			if (!Number.isFinite(newValue)) return;
			registerConfigNumberVar(id, newValue, menuText, onUpdate);
			if (onUpdate) onUpdate(newValue);
		});
		varsMap.set(id, menuId);
	}
	var LOW_RATED_CLASS = "us-low-rated";
	var LIKES_ID = "min_likes";
	var VIEWS_ID = "min_views";
	function queryGames() {
		return document.querySelectorAll("div.resource-tile");
	}
	function queryRating(entry) {
		const rating = entry.querySelector("div.resource-tile_info-meta_rating");
		if (!rating) throw new Error("Couldnt query rating block");
		return parseFloat(rating.textContent);
	}
	function queryLikes(entry) {
		const likes = entry.querySelector("div.resource-tile_info-meta_likes");
		if (!likes) throw new Error("Couldnt query likes block");
		return parseInt(likes.textContent);
	}
	function queryViews(entry) {
		const views = entry.querySelector("div.resource-tile_info-meta_views");
		if (!views) throw new Error("Couldnt query views block");
		const viewsText = views.textContent.trim();
		const multiplier = viewsText.endsWith("K") ? 1e3 : viewsText.endsWith("M") ? 1e6 : 1;
		const viewsNumber = parseFloat(viewsText.replace(/[KM]/, ""));
		return Math.round(viewsNumber * multiplier);
	}
	var RATING_ID = "min_rating";
	registerConfigNumberVar(RATING_ID, 4, "Minimum Rating", refreshLowRated);
	registerConfigNumberVar(LIKES_ID, 0, "Minimum Likes", refreshLowRated);
	registerConfigNumberVar(VIEWS_ID, 0, "Minimum Views", refreshLowRated);
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
		const minLikes = _GM_getValue(LIKES_ID);
		const minViews = _GM_getValue(VIEWS_ID);
		console.log(`Filtering games with minRating: ${minRating}, minLikes: ${minLikes}, minViews: ${minViews}`);
		if (minRating <= 0 && minLikes <= 0 && minViews <= 0) return;
		for (const game of queryGames()) {
			const rating = queryRating(game);
			const likes = queryLikes(game);
			const views = queryViews(game);
			if (rating < minRating || likes < minLikes || views < minViews) game.classList.add(LOW_RATED_CLASS);
		}
	}
	function undoHide() {
		document.querySelectorAll(`.${LOW_RATED_CLASS}`).forEach((e) => e.classList.remove(LOW_RATED_CLASS));
	}
	function refreshLowRated() {
		undoHide();
		hideLowRated();
	}
})();
