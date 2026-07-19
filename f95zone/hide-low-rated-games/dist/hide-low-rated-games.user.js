// ==UserScript==
// @name         Hide Low Rated Games
// @namespace    https://github.com/sighasset/userscripts/tree/main/f95zone
// @version      0.1
// @author       sighasset
// @description  Hides search results below the configured rating threshold
// @icon         https://www.google.com/s2/favicons?sz=64&domain=f95zone.to
// @downloadURL  https://raw.githubusercontent.com/sighasset/userscripts/refs/heads/main/f95zone/hide-low-rated/dist/hide-low-rated.user.js
// @updateURL    https://raw.githubusercontent.com/sighasset/userscripts/refs/heads/main/f95zone/hide-low-rated/dist/hide-low-rated.meta.js
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
	var LOW_RATED_CLASS = "us-low-rated";
	var threshold = _GM_getValue("threshold", 4);
	var configMenuId;
	registerConfigMenu();
	observeBody();
	function registerConfigMenu() {
		if (configMenuId !== void 0) _GM_unregisterMenuCommand(configMenuId);
		configMenuId = _GM_registerMenuCommand(`Set minimum rating (${threshold})`, async () => {
			const value = prompt("Minimum rating", threshold.toString());
			if (!value) return;
			const newThreshold = parseFloat(value);
			if (Number.isNaN(newThreshold)) return;
			threshold = newThreshold;
			_GM_setValue("threshold", threshold);
			clearLowRated();
			setLowRated();
			registerConfigMenu();
		});
	}
	function observeBody() {
		const targetNode = document.querySelector("body");
		new MutationObserver(setLowRated).observe(targetNode, {
			childList: true,
			subtree: true
		});
	}
	function setLowRated() {
		if (threshold <= 0) return;
		document.querySelectorAll("div.resource-tile").forEach((entry) => {
			const rating = entry.querySelector("div.resource-tile_info-meta_rating");
			if (!rating) throw new Error("Couldnt query rating block");
			if (parseFloat(rating.textContent) >= threshold) return;
			entry.classList.add(LOW_RATED_CLASS);
		});
	}
	function clearLowRated() {
		document.querySelectorAll(`.${LOW_RATED_CLASS}`).forEach((e) => e.classList.remove(LOW_RATED_CLASS));
	}
})();
