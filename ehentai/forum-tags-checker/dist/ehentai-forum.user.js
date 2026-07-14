// ==UserScript==
// @name         Tags Checker
// @namespace    https://github.com/sighasset/userscripts/tree/main/ehentai
// @version      0.2
// @author       sighasset
// @description  Utillity to work with downvote requests
// @icon         https://www.google.com/s2/favicons?sz=64&domain=forums.e-hentai.org
// @downloadURL  https://raw.githubusercontent.com/sighasset/userscripts/main/ehentai/forum-tags-checker/dist/forum-tags-checker.user.js
// @updateURL    https://raw.githubusercontent.com/sighasset/userscripts/main/ehentai/forum-tags-checker/dist/forum-tags-checker.meta.js
// @match        https://forums.e-hentai.org/*
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  const d$2=new Set;const e$2 = async e=>{d$2.has(e)||(d$2.add(e),(t=>{typeof GM_addStyle=="function"?GM_addStyle(t):(document.head||document.documentElement).appendChild(document.createElement("style")).append(t);})(e));};

  e$2(" ._header_aob47_1{display:flex;flex-direction:row;justify-content:space-between;align-items:center}._headerRight_aob47_15{display:flex;flex-direction:row;gap:8px}._checkButton_aob47_27{display:flex;flex-direction:row;align-items:center;gap:4px;padding:2px 8px}._spinner_aob47_43{--size: 12px;width:var(--size);height:var(--size);border:2px solid black;border-bottom-color:transparent;border-radius:50%;display:inline-block;box-sizing:border-box;animation:_rotation_aob47_1 1s linear infinite}@keyframes _rotation_aob47_1{0%{transform:rotate(0)}to{transform:rotate(360deg)}}._root_17y9n_1{width:650px} ");

  var _GM_openInTab = (() => typeof GM_openInTab != "undefined" ? GM_openInTab : void 0)();
  var _unsafeWindow = (() => typeof unsafeWindow != "undefined" ? unsafeWindow : void 0)();
  const API_URL = "https://api.e-hentai.org/api.php";
  const API_BATCH_LIMIT = 25;
  const API_RATELIMIT_MS = 750;
  const EHENTAI_URL = "https://e-hentai.org/";
  const PANDA_URL = "https://exhentai.org/";
  const FETCH_FROM_URL = PANDA_URL;
  const GALLERY_PATH = "g/";
  const TAG_NAME_REGEX = "[a-zA-Z0-9 .-]+";
  const DEFAULT_QUERY_RETRY = 3;
  const DEFAULT_QUERY_TIMEOUT_MS = 1e3;
  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  const dateFormatter = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  function toHumanDate(date) {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return dateFormatter.format(dateObj);
    } catch (e2) {
      console.warn(e2);
      return date.toString();
    }
  }
  async function query(accessorFn, options = {
    retry: DEFAULT_QUERY_RETRY,
    timeout: DEFAULT_QUERY_TIMEOUT_MS
  }) {
    let retry = options.retry;
    while (retry > 0) {
      const result = accessorFn();
      if (result) return result;
      retry -= 1;
      await sleep(options.timeout);
    }
    return null;
  }
  const NamespaceGroups = {
    artist: ["artist:", "a:"],
    character: ["character:", "c:", "char:"],
    cosplayer: ["cosplayer:", "cos:"],
    female: ["female:", "f:"],
    group: ["group:", "g:"],
    circle: ["circle:"],
    language: ["language:", "l:", "lang:"],
    location: ["location:", "loc:"],
    male: ["male:", "m:"],
    mixed: ["mixed:", "x:"],
    other: ["other:", "o:"],
    parody: ["parody:", "p:"],
    series: ["series:"],
    reclass: ["reclass:", "r:"]
  };
  const GroupedNamespaces = Object.values(NamespaceGroups);
  const Namespaces = GroupedNamespaces.flat().sort(
    (a2, b2) => b2.length - a2.length
  );
  Object.fromEntries(
    GroupedNamespaces.flatMap((namespaces) => {
      const [full] = namespaces;
      return namespaces.map((ns) => [ns, full]);
    })
  );
  const ShortenNamespace = Object.fromEntries(
    GroupedNamespaces.flatMap((namespaces) => {
      const [full, short = full] = namespaces;
      return namespaces.map((ns) => [ns, short]);
    })
  );
  const NamespaceMap = new Map(
    GroupedNamespaces.flatMap((group) => group.map((ns) => [ns, group]))
  );
  function isNamespace(value) {
    return NamespaceMap.has(value);
  }
  function getGalleryHref(id) {
    return `${EHENTAI_URL}${GALLERY_PATH}${id[0]}/${id[1]}`;
  }
  function getGalleryId(href) {
    try {
      const url = new URL(href);
      const parts = url.pathname.split("/").filter((p2) => p2.length > 0);
      const galleryId = parts.slice(-2);
      const id = Number(galleryId[0]);
      if (isNaN(id)) {
        throw new Error(`Invalid id: ${id}`);
      }
      const token = galleryId[1];
      if (!token) {
        throw new Error(`Invalid token: ${token}`);
      }
      return [id, token];
    } catch (e2) {
      throw new Error(`Invalid gallery href: ${href}. ${e2}`);
    }
  }
  function isEqualGalleryId(a2, b2) {
    return a2[0] === b2[0] && a2[1] === b2[1];
  }
  function removeDuplicateIds(ids) {
    return ids.filter(
      (id, index) => ids.findIndex((id2) => isEqualGalleryId(id2, id)) === index
    );
  }
  function parseTagString(tag) {
    const parts = tag.split(":");
    if (parts.length !== 2) {
      throw new Error(`Invalid tag string "${tag}"`);
    }
    const namespace = parts[0] + ":";
    if (!isNamespace(namespace)) {
      throw new Error(`Invalid namespace "${namespace}" in tag string "${tag}"`);
    }
    const name = parts[1];
    if (!name) {
      throw new Error(`Invalid tag name "${name}" in tag string "${tag}"`);
    }
    return {
      namespace,
      name: parts[1]
    };
  }
  const namespaceRegex = new RegExp(Namespaces.join("|"));
  const tagNameRegex = new RegExp(`^${TAG_NAME_REGEX}$`);
  function parseTagFromString(text) {
    const match = text.match(namespaceRegex);
    if (!match) {
      throw new Error(`Tag not found in text "${text}"`);
    }
    const namespace = match[0];
    const tail = text.slice(match.index + namespace.length);
    if (!tail) {
      throw new Error(
        `Empty tag name in text "${text}" for namespace "${namespace}"`
      );
    }
    const parts = tail.trim().split(/\s+/);
    const invalidPartIndex = parts.findIndex(
      (part) => !part || /^[ .-]/.test(part) || !tagNameRegex.test(part)
    );
    const validParts = invalidPartIndex === -1 ? parts : parts.slice(0, invalidPartIndex);
    if (invalidPartIndex !== -1) {
      const invalidPart = parts[invalidPartIndex];
      if (!/^[0-9 .-]/.test(invalidPart)) {
        const m2 = invalidPart.match(/^[a-zA-Z0-9]+/);
        if (m2) validParts.push(m2[0]);
      }
    }
    const name = validParts.join(" ");
    if (!name) {
      throw new Error(
        `Empty tag name in text "${text}" for namespace "${namespace}"`
      );
    }
    const lastPart = validParts[validParts.length - 1];
    const tailConsumedCount = tail.indexOf(lastPart) + lastPart.length;
    const suffix = tail.slice(tailConsumedCount);
    return { tag: { name, namespace }, suffix };
  }
  function equalsNamespace(a2, b2) {
    return ShortenNamespace[a2] === ShortenNamespace[b2];
  }
  function includesTagString(text) {
    return Namespaces.some((ns) => {
      const index = text.indexOf(ns);
      return index !== -1 && text.slice(index + ns.length, index + ns.length + 1).match(/[a-zA-Z0-9]/);
    });
  }
  function equalsTag(a2, b2) {
    return equalsNamespace(a2.namespace, b2.namespace) && a2.name === b2.name;
  }
  function includesTag(tags, tag) {
    return tags.some((t2) => equalsTag(t2, tag));
  }
  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a2 = document.createElement("a");
    a2.href = url;
    a2.download = filename;
    document.body.appendChild(a2);
    a2.click();
    document.body.removeChild(a2);
    URL.revokeObjectURL(url);
  }
  function promptFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.onchange = () => {
        const file = input.files?.[0] || null;
        resolve(file);
        cleanup();
      };
      input.oncancel = () => {
        resolve(null);
        cleanup();
      };
      const handleWindowFocus = () => {
        window.removeEventListener("focus", handleWindowFocus);
        setTimeout(() => {
          if (!input.files || input.files.length === 0) {
            resolve(null);
            cleanup();
          }
        }, 300);
      };
      const cleanup = () => {
        input.onchange = null;
        input.oncancel = null;
        window.removeEventListener("focus", handleWindowFocus);
        input.remove();
      };
      window.addEventListener("focus", handleWindowFocus);
      input.style.display = "none";
      document.body.appendChild(input);
      input.click();
    });
  }
  function hasMetadataResponse(response) {
    return "gmetadata" in response;
  }
  class SharedRateLimiter {
    constructor(minTime, maxConcurrent = 1) {
      this.minTime = minTime;
      this.maxConcurrent = maxConcurrent;
      this.queue = [];
      this.running = 0;
    }
    async schedule(fn) {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          this.running++;
          try {
            resolve(await fn());
          } catch (e2) {
            reject(e2);
          }
          setTimeout(() => {
            this.running--;
            this.next();
          }, this.minTime);
        });
        this.next();
      });
    }
    next() {
      if (this.running >= this.maxConcurrent || this.queue.length === 0) {
        return;
      }
      this.queue.shift()();
    }
  }
  const limiter = new SharedRateLimiter(API_RATELIMIT_MS, 1);
  async function fetchGalleries(ids) {
    ids = removeDuplicateIds(ids);
    const batches = [];
    for (let i2 = 0; i2 < ids.length; i2 += API_BATCH_LIMIT) {
      batches.push(ids.slice(i2, i2 + API_BATCH_LIMIT));
    }
    const galleries = new Map();
    for (const batch of batches) {
      console.info("Fetching batch of size", batch.length);
      const batchGalleries = await limiter.schedule(() => fetchBatch(batch));
      for (const gallery of batchGalleries) {
        galleries.set(gallery.id[0], gallery);
      }
    }
    return galleries;
  }
  async function fetchBatch(ids) {
    const body = {
      method: "gdata",
      namespace: 1,
      gidlist: ids
    };
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (response.status !== 200) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    const json = await response.json();
    if (!hasMetadataResponse(json)) {
      throw new Error(`Could not parse API response: ${JSON.stringify(json)}`);
    }
    const { gmetadata: data } = json;
    return data.map(parseGalleryResponse);
  }
  function parseGalleryResponse(gallery) {
    const id = [gallery.gid, gallery.token];
    return {
      id,
      href: getGalleryHref(id),
      title: gallery.title,
      titleJpn: gallery.title_jpn,
      category: gallery.category,
      thumb: gallery.thumb,
      uploader: gallery.uploader,
      posted: gallery.posted,
      expunged: gallery.expunged,
      rating: gallery.rating,
      tags: gallery.tags.map(parseTagString)
    };
  }
  function queryGalleryTags(galleryDoc) {
    const rows = [...galleryDoc.querySelectorAll("#taglist table tbody tr")];
    if (rows.length === 0) {
      console.warn("Queried 0 tags from gallery document");
    }
    const result = [];
    for (const row of rows) {
      const namespace = row.querySelector("td");
      if (!namespace) {
        throw new Error("Couldnt query namespace from gallery document.row");
      }
      const tags = row.querySelectorAll("div");
      tags.forEach((tag) => {
        result.push(parseTagString(namespace.textContent + tag.textContent));
      });
    }
    return result;
  }
  async function scrapeGallery(id) {
    const href = `${FETCH_FROM_URL}${GALLERY_PATH}${id[0]}/${id[1]}/`;
    console.info(`scraping ${href}`);
    const document2 = await fetch$1(href);
    const tags = queryGalleryTags(document2);
    return {
      id,
      href,
      tags
    };
  }
  const parser = new DOMParser();
  const fetch$1 = (url) => {
    return limiter.schedule(
      () => new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          headers: {
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "User-Agent": navigator.userAgent
          },
          onload: (response) => resolve(parser.parseFromString(response.responseText, "text/html")),
          onerror: (error) => reject(error)
        });
      })
    );
  };
  const DEFAULT_OPENER_MSG = "Please downvote:";
  const THANKS_MSG = "Thanks";
  const TO_STRING_GROUP_SPLITTER = "\n———————————————————————————\n";
  const PARSER_GROUP_SPLITTER = [
    TO_STRING_GROUP_SPLITTER,
    "\n\n\n"
  ];
  const TAG_SPLITTER = ",";
  const BATCH_TRIGGER_LIMIT = 5;
  function isTagLine(line) {
    return "tags" in line;
  }
  function isStrikedPost(post) {
    return post.galleries.every((g2) => isStrikedGallery(g2));
  }
  function isStrikedGallery(gallery) {
    return gallery.lines.filter((l2) => isTagLine(l2)).every((l2) => isStrikedTagLine(l2));
  }
  function isStrikedTagLine(tagLine) {
    return tagLine.tags.every((t2) => t2.isStriked);
  }
  function getPostTagsCount(post) {
    const tags = post.galleries.flatMap(
      (g2) => g2.lines.filter(isTagLine).flatMap((tl) => tl.tags)
    );
    return {
      strikedTags: tags.filter((t2) => t2.isStriked).length,
      totalTags: tags.length
    };
  }
  function getPostGalleriesCount(post) {
    return {
      strikedGalleries: post.galleries.filter(isStrikedGallery).length,
      totalGalleries: post.galleries.length
    };
  }
  async function checkPosts(posts, onChange) {
    const ids = posts.flatMap(
      (p2) => p2.galleries.filter((g2) => !isStrikedGallery(g2)).map((g2) => getGalleryId(g2.href))
    );
    ids.forEach(() => onChange?.("increase-total"));
    const fetchedGalleries = ids.length > BATCH_TRIGGER_LIMIT ? await fetchGalleries(ids) : new Map();
    const scrapedGalleries = new Map();
    const updates = [];
    for (const post of posts) {
      const update = await checkPost(
        post,
        fetchedGalleries,
        scrapedGalleries,
        onChange
      );
      if (update.strikedTags > 0) {
        updates.push(update);
      }
    }
    return updates;
  }
  async function checkPost(post, fetchedGalleries, scrapedGalleries, onChange) {
    const checkedPost = structuredClone(post);
    let strikedTags = 0;
    let checkedGalleries = 0;
    for (const gallery of checkedPost.galleries) {
      if (isStrikedGallery(gallery)) continue;
      const id = getGalleryId(gallery.href);
      const fetchedTags = fetchedGalleries.get(id[0])?.tags ?? [];
      checkedGalleries++;
      onChange?.("checked-gallery");
      for (const line of gallery.lines) {
        if (!isTagLine(line)) continue;
        for (const tag of line.tags) {
          if (tag.isStriked) continue;
          if (!includesTag(fetchedTags, tag)) {
            const { tags } = await getScrapedGallery(scrapedGalleries, id);
            if (includesTag(tags, tag)) continue;
            tag.isStriked = true;
            strikedTags++;
            onChange?.("striked-tag");
          }
        }
      }
    }
    return { checkedPost, strikedTags, checkedGalleries };
  }
  async function getScrapedGallery(scrapedGalleries, id) {
    const scrapedGallery = scrapedGalleries.get(id[0]);
    if (!scrapedGallery) {
      const scrapedGallery2 = await scrapeGallery(id);
      scrapedGalleries.set(id[0], scrapedGallery2);
      return scrapedGallery2;
    }
    return scrapedGallery;
  }
  var n, l$1, u$2, i$1, r$1, o$1, e$1, f$2, c$1, a$1, s$1, h$1, p$1, v$1, d$1 = {}, w$1 = [], _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, g = Array.isArray;
  function m$1(n2, l2) {
    for (var u2 in l2) n2[u2] = l2[u2];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k$1(l2, u2, t2) {
    var i2, r2, o2, e2 = {};
    for (o2 in u2) "key" == o2 ? i2 = u2[o2] : "ref" == o2 ? r2 = u2[o2] : e2[o2] = u2[o2];
    if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), "function" == typeof l2 && null != l2.defaultProps) for (o2 in l2.defaultProps) void 0 === e2[o2] && (e2[o2] = l2.defaultProps[o2]);
    return x(l2, e2, i2, r2, null);
  }
  function x(n2, t2, i2, r2, o2) {
    var e2 = { type: n2, props: t2, key: i2, ref: r2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o2 ? ++u$2 : o2, __i: -1, __u: 0 };
    return null == o2 && null != l$1.vnode && l$1.vnode(e2), e2;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l2) {
    this.props = n2, this.context = l2;
  }
  function $(n2, l2) {
    if (null == l2) return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u2; l2 < n2.__k.length; l2++) if (null != (u2 = n2.__k[l2]) && null != u2.__e) return u2.__e;
    return "function" == typeof n2.type ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u2 = n2.__v, t2 = u2.__e, i2 = [], r2 = [], o2 = m$1({}, u2);
      o2.__v = u2.__v + 1, l$1.vnode && l$1.vnode(o2), q(n2.__P, o2, u2, n2.__n, n2.__P.namespaceURI, 32 & u2.__u ? [t2] : null, i2, null == t2 ? $(u2) : t2, !!(32 & u2.__u), r2), o2.__v = u2.__v, o2.__.__k[o2.__i] = o2, D$1(i2, o2, r2), u2.__e = u2.__ = null, o2.__e != t2 && P(o2);
    }
  }
  function P(n2) {
    if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l2) {
      if (null != l2 && null != l2.__e) return n2.__e = n2.__c.base = l2.__e;
    }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = true) && i$1.push(n2) && !H.__r++ || r$1 != l$1.debounceRendering) && ((r$1 = l$1.debounceRendering) || o$1)(H);
  }
  function H() {
    try {
      for (var n2, l2 = 1; i$1.length; ) i$1.length > l2 && i$1.sort(e$1), n2 = i$1.shift(), l2 = i$1.length, I(n2);
    } finally {
      i$1.length = H.__r = 0;
    }
  }
  function L(n2, l2, u2, t2, i2, r2, o2, e2, f2, c2, a2) {
    var s2, h2, p2, v2, y, _2, g2, m2 = t2 && t2.__k || w$1, b2 = l2.length;
    for (f2 = T(u2, l2, m2, f2, b2), s2 = 0; s2 < b2; s2++) null != (p2 = u2.__k[s2]) && (h2 = -1 != p2.__i && m2[p2.__i] || d$1, p2.__i = s2, _2 = q(n2, p2, h2, i2, r2, o2, e2, f2, c2, a2), v2 = p2.__e, p2.ref && h2.ref != p2.ref && (h2.ref && J(h2.ref, null, p2), a2.push(p2.ref, p2.__c || v2, p2)), null == y && null != v2 && (y = v2), (g2 = !!(4 & p2.__u)) || h2.__k === p2.__k ? (f2 = j$1(p2, f2, n2, g2), g2 && h2.__e && (h2.__e = null)) : "function" == typeof p2.type && void 0 !== _2 ? f2 = _2 : v2 && (f2 = v2.nextSibling), p2.__u &= -7);
    return u2.__e = y, f2;
  }
  function T(n2, l2, u2, t2, i2) {
    var r2, o2, e2, f2, c2, a2 = u2.length, s2 = a2, h2 = 0;
    for (n2.__k = new Array(i2), r2 = 0; r2 < i2; r2++) null != (o2 = l2[r2]) && "boolean" != typeof o2 && "function" != typeof o2 ? ("string" == typeof o2 || "number" == typeof o2 || "bigint" == typeof o2 || o2.constructor == String ? o2 = n2.__k[r2] = x(null, o2, null, null, null) : g(o2) ? o2 = n2.__k[r2] = x(S, { children: o2 }, null, null, null) : void 0 === o2.constructor && o2.__b > 0 ? o2 = n2.__k[r2] = x(o2.type, o2.props, o2.key, o2.ref ? o2.ref : null, o2.__v) : n2.__k[r2] = o2, f2 = r2 + h2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, -1 != (c2 = o2.__i = O(o2, u2, f2, s2)) && (s2--, (e2 = u2[c2]) && (e2.__u |= 2)), null == e2 || null == e2.__v ? (-1 == c2 && (i2 > a2 ? h2-- : i2 < a2 && h2++), "function" != typeof o2.type && (o2.__u |= 4)) : c2 != f2 && (c2 == f2 - 1 ? h2-- : c2 == f2 + 1 ? h2++ : (c2 > f2 ? h2-- : h2++, o2.__u |= 4))) : n2.__k[r2] = null;
    if (s2) for (r2 = 0; r2 < a2; r2++) null != (e2 = u2[r2]) && 0 == (2 & e2.__u) && (e2.__e == t2 && (t2 = $(e2)), K(e2, e2));
    return t2;
  }
  function j$1(n2, l2, u2, t2) {
    var i2, r2;
    if ("function" == typeof n2.type) {
      for (i2 = n2.__k, r2 = 0; i2 && r2 < i2.length; r2++) i2[r2] && (i2[r2].__ = n2, l2 = j$1(i2[r2], l2, u2, t2));
      return l2;
    }
    n2.__e != l2 && (t2 && (l2 && n2.type && !l2.parentNode && (l2 = $(n2)), u2.insertBefore(n2.__e, l2 || null)), l2 = n2.__e);
    do {
      l2 = l2 && l2.nextSibling;
    } while (null != l2 && 8 == l2.nodeType);
    return l2;
  }
  function O(n2, l2, u2, t2) {
    var i2, r2, o2, e2 = n2.key, f2 = n2.type, c2 = l2[u2], a2 = null != c2 && 0 == (2 & c2.__u);
    if (null === c2 && null == e2 || a2 && e2 == c2.key && f2 == c2.type) return u2;
    if (t2 > (a2 ? 1 : 0)) {
      for (i2 = u2 - 1, r2 = u2 + 1; i2 >= 0 || r2 < l2.length; ) if (null != (c2 = l2[o2 = i2 >= 0 ? i2-- : r2++]) && 0 == (2 & c2.__u) && e2 == c2.key && f2 == c2.type) return o2;
    }
    return -1;
  }
  function z$1(n2, l2, u2) {
    "-" == l2[0] ? n2.setProperty(l2, null == u2 ? "" : u2) : n2[l2] = null == u2 ? "" : "number" != typeof u2 || _.test(l2) ? u2 : u2 + "px";
  }
  function N(n2, l2, u2, t2, i2) {
    var r2, o2;
    n: if ("style" == l2) if ("string" == typeof u2) n2.style.cssText = u2;
    else {
      if ("string" == typeof t2 && (n2.style.cssText = t2 = ""), t2) for (l2 in t2) u2 && l2 in u2 || z$1(n2.style, l2, "");
      if (u2) for (l2 in u2) t2 && u2[l2] == t2[l2] || z$1(n2.style, l2, u2[l2]);
    }
    else if ("o" == l2[0] && "n" == l2[1]) r2 = l2 != (l2 = l2.replace(s$1, "$1")), o2 = l2.toLowerCase(), l2 = o2 in n2 || "onFocusOut" == l2 || "onFocusIn" == l2 ? o2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + r2] = u2, u2 ? t2 ? u2[a$1] = t2[a$1] : (u2[a$1] = h$1, n2.addEventListener(l2, r2 ? v$1 : p$1, r2)) : n2.removeEventListener(l2, r2 ? v$1 : p$1, r2);
    else {
      if ("http://www.w3.org/2000/svg" == i2) l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l2 && "height" != l2 && "href" != l2 && "list" != l2 && "form" != l2 && "tabIndex" != l2 && "download" != l2 && "rowSpan" != l2 && "colSpan" != l2 && "role" != l2 && "popover" != l2 && l2 in n2) try {
        n2[l2] = null == u2 ? "" : u2;
        break n;
      } catch (n3) {
      }
      "function" == typeof u2 || (null == u2 || false === u2 && "-" != l2[4] ? n2.removeAttribute(l2) : n2.setAttribute(l2, "popover" == l2 && 1 == u2 ? "" : u2));
    }
  }
  function V(n2) {
    return function(u2) {
      if (this.l) {
        var t2 = this.l[u2.type + n2];
        if (null == u2[c$1]) u2[c$1] = h$1++;
        else if (u2[c$1] < t2[a$1]) return;
        return t2(l$1.event ? l$1.event(u2) : u2);
      }
    };
  }
  function q(n2, u2, t2, i2, r2, o2, e2, f2, c2, a2) {
    var s2, h2, p2, v2, y, d2, _2, k2, x2, M, $2, I2, P2, A2, H2, T2 = u2.type;
    if (void 0 !== u2.constructor) return null;
    128 & t2.__u && (c2 = !!(32 & t2.__u), o2 = [f2 = u2.__e = t2.__e]), (s2 = l$1.__b) && s2(u2);
    n: if ("function" == typeof T2) try {
      if (k2 = u2.props, x2 = T2.prototype && T2.prototype.render, M = (s2 = T2.contextType) && i2[s2.__c], $2 = s2 ? M ? M.props.value : s2.__ : i2, t2.__c ? _2 = (h2 = u2.__c = t2.__c).__ = h2.__E : (x2 ? u2.__c = h2 = new T2(k2, $2) : (u2.__c = h2 = new C(k2, $2), h2.constructor = T2, h2.render = Q), M && M.sub(h2), h2.state || (h2.state = {}), h2.__n = i2, p2 = h2.__d = true, h2.__h = [], h2._sb = []), x2 && null == h2.__s && (h2.__s = h2.state), x2 && null != T2.getDerivedStateFromProps && (h2.__s == h2.state && (h2.__s = m$1({}, h2.__s)), m$1(h2.__s, T2.getDerivedStateFromProps(k2, h2.__s))), v2 = h2.props, y = h2.state, h2.__v = u2, p2) x2 && null == T2.getDerivedStateFromProps && null != h2.componentWillMount && h2.componentWillMount(), x2 && null != h2.componentDidMount && h2.__h.push(h2.componentDidMount);
      else {
        if (x2 && null == T2.getDerivedStateFromProps && k2 !== v2 && null != h2.componentWillReceiveProps && h2.componentWillReceiveProps(k2, $2), u2.__v == t2.__v || !h2.__e && null != h2.shouldComponentUpdate && false === h2.shouldComponentUpdate(k2, h2.__s, $2)) {
          u2.__v != t2.__v && (h2.props = k2, h2.state = h2.__s, h2.__d = false), u2.__e = t2.__e, u2.__k = t2.__k, u2.__k.some(function(n3) {
            n3 && (n3.__ = u2);
          }), w$1.push.apply(h2.__h, h2._sb), h2._sb = [], h2.__h.length && e2.push(h2);
          break n;
        }
        null != h2.componentWillUpdate && h2.componentWillUpdate(k2, h2.__s, $2), x2 && null != h2.componentDidUpdate && h2.__h.push(function() {
          h2.componentDidUpdate(v2, y, d2);
        });
      }
      if (h2.context = $2, h2.props = k2, h2.__P = n2, h2.__e = false, I2 = l$1.__r, P2 = 0, x2) h2.state = h2.__s, h2.__d = false, I2 && I2(u2), s2 = h2.render(h2.props, h2.state, h2.context), w$1.push.apply(h2.__h, h2._sb), h2._sb = [];
      else do {
        h2.__d = false, I2 && I2(u2), s2 = h2.render(h2.props, h2.state, h2.context), h2.state = h2.__s;
      } while (h2.__d && ++P2 < 25);
      h2.state = h2.__s, null != h2.getChildContext && (i2 = m$1(m$1({}, i2), h2.getChildContext())), x2 && !p2 && null != h2.getSnapshotBeforeUpdate && (d2 = h2.getSnapshotBeforeUpdate(v2, y)), A2 = null != s2 && s2.type === S && null == s2.key ? E(s2.props.children) : s2, f2 = L(n2, g(A2) ? A2 : [A2], u2, t2, i2, r2, o2, e2, f2, c2, a2), h2.base = u2.__e, u2.__u &= -161, h2.__h.length && e2.push(h2), _2 && (h2.__E = h2.__ = null);
    } catch (n3) {
      if (u2.__v = null, c2 || null != o2) if (n3.then) {
        for (u2.__u |= c2 ? 160 : 128; f2 && 8 == f2.nodeType && f2.nextSibling; ) f2 = f2.nextSibling;
        o2[o2.indexOf(f2)] = null, u2.__e = f2;
      } else {
        for (H2 = o2.length; H2--; ) b(o2[H2]);
        B$1(u2);
      }
      else u2.__e = t2.__e, u2.__k = t2.__k, n3.then || B$1(u2);
      l$1.__e(n3, u2, t2);
    }
    else null == o2 && u2.__v == t2.__v ? (u2.__k = t2.__k, u2.__e = t2.__e) : f2 = u2.__e = G(t2.__e, u2, t2, i2, r2, o2, e2, c2, a2);
    return (s2 = l$1.diffed) && s2(u2), 128 & u2.__u ? void 0 : f2;
  }
  function B$1(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B$1));
  }
  function D$1(n2, u2, t2) {
    for (var i2 = 0; i2 < t2.length; i2++) J(t2[i2], t2[++i2], t2[++i2]);
    l$1.__c && l$1.__c(u2, n2), n2.some(function(u3) {
      try {
        n2 = u3.__h, u3.__h = [], n2.some(function(n3) {
          n3.call(u3);
        });
      } catch (n3) {
        l$1.__e(n3, u3.__v);
      }
    });
  }
  function E(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : void 0 !== n2.constructor ? null : m$1({}, n2);
  }
  function G(u2, t2, i2, r2, o2, e2, f2, c2, a2) {
    var s2, h2, p2, v2, y, w2, _2, m2 = i2.props || d$1, k2 = t2.props, x2 = t2.type;
    if ("svg" == x2 ? o2 = "http://www.w3.org/2000/svg" : "math" == x2 ? o2 = "http://www.w3.org/1998/Math/MathML" : o2 || (o2 = "http://www.w3.org/1999/xhtml"), null != e2) {
      for (s2 = 0; s2 < e2.length; s2++) if ((y = e2[s2]) && "setAttribute" in y == !!x2 && (x2 ? y.localName == x2 : 3 == y.nodeType)) {
        u2 = y, e2[s2] = null;
        break;
      }
    }
    if (null == u2) {
      if (null == x2) return document.createTextNode(k2);
      u2 = document.createElementNS(o2, x2, k2.is && k2), c2 && (l$1.__m && l$1.__m(t2, e2), c2 = false), e2 = null;
    }
    if (null == x2) m2 === k2 || c2 && u2.data == k2 || (u2.data = k2);
    else {
      if (e2 = "textarea" == x2 && null != k2.defaultValue ? null : e2 && n.call(u2.childNodes), !c2 && null != e2) for (m2 = {}, s2 = 0; s2 < u2.attributes.length; s2++) m2[(y = u2.attributes[s2]).name] = y.value;
      for (s2 in m2) y = m2[s2], "dangerouslySetInnerHTML" == s2 ? p2 = y : "children" == s2 || s2 in k2 || "value" == s2 && "defaultValue" in k2 || "checked" == s2 && "defaultChecked" in k2 || N(u2, s2, null, y, o2);
      for (s2 in k2) y = k2[s2], "children" == s2 ? v2 = y : "dangerouslySetInnerHTML" == s2 ? h2 = y : "value" == s2 ? w2 = y : "checked" == s2 ? _2 = y : c2 && "function" != typeof y || m2[s2] === y || N(u2, s2, y, m2[s2], o2);
      if (h2) c2 || p2 && (h2.__html == p2.__html || h2.__html == u2.innerHTML) || (u2.innerHTML = h2.__html), t2.__k = [];
      else if (p2 && (u2.innerHTML = ""), L("template" == t2.type ? u2.content : u2, g(v2) ? v2 : [v2], t2, i2, r2, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o2, e2, f2, e2 ? e2[0] : i2.__k && $(i2, 0), c2, a2), null != e2) for (s2 = e2.length; s2--; ) b(e2[s2]);
      c2 && "textarea" != x2 || (s2 = "value", "progress" == x2 && null == w2 ? u2.removeAttribute("value") : null != w2 && (w2 !== u2[s2] || "progress" == x2 && !w2 || "option" == x2 && w2 != m2[s2]) && N(u2, s2, w2, m2[s2], o2), s2 = "checked", null != _2 && _2 != u2[s2] && N(u2, s2, _2, m2[s2], o2));
    }
    return u2;
  }
  function J(n2, u2, t2) {
    try {
      if ("function" == typeof n2) {
        var i2 = "function" == typeof n2.__u;
        i2 && n2.__u(), i2 && null == u2 || (n2.__u = n2(u2));
      } else n2.current = u2;
    } catch (n3) {
      l$1.__e(n3, t2);
    }
  }
  function K(n2, u2, t2) {
    var i2, r2;
    if (l$1.unmount && l$1.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || J(i2, null, u2)), null != (i2 = n2.__c)) {
      if (i2.componentWillUnmount) try {
        i2.componentWillUnmount();
      } catch (n3) {
        l$1.__e(n3, u2);
      }
      i2.base = i2.__P = null;
    }
    if (i2 = n2.__k) for (r2 = 0; r2 < i2.length; r2++) i2[r2] && K(i2[r2], u2, t2 || "function" != typeof n2.type);
    t2 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function Q(n2, l2, u2) {
    return this.constructor(n2, u2);
  }
  function R(u2, t2, i2) {
    var r2, o2, e2, f2;
    t2 == document && (t2 = document.documentElement), l$1.__ && l$1.__(u2, t2), o2 = (r2 = false) ? null : t2.__k, e2 = [], f2 = [], q(t2, u2 = t2.__k = k$1(S, null, [u2]), o2 || d$1, d$1, t2.namespaceURI, o2 ? null : t2.firstChild ? n.call(t2.childNodes) : null, e2, o2 ? o2.__e : t2.firstChild, r2, f2), D$1(e2, u2, f2);
  }
  n = w$1.slice, l$1 = { __e: function(n2, l2, u2, t2) {
    for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
      if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
    } catch (l3) {
      n2 = l3;
    }
    throw n2;
  } }, u$2 = 0, C.prototype.setState = function(n2, l2) {
    var u2;
    u2 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m$1({}, this.state), "function" == typeof n2 && (n2 = n2(m$1({}, u2), this.props)), n2 && m$1(u2, n2), null != n2 && this.__v && (l2 && this._sb.push(l2), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i$1 = [], o$1 = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e$1 = function(n2, l2) {
    return n2.__v.__b - l2.__v.__b;
  }, H.__r = 0, f$2 = Math.random().toString(8), c$1 = "__d" + f$2, a$1 = "__a" + f$2, s$1 = /(PointerCapture)$|Capture$/i, h$1 = 0, p$1 = V(false), v$1 = V(true);
  var f$1 = 0;
  function u$1(e2, t2, n2, o2, i2, u2) {
    t2 || (t2 = {});
    var a2, c2, p2 = t2;
    if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
    var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f$1, __i: -1, __u: 0, __source: i2, __self: u2 };
    if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
    return l$1.vnode && l$1.vnode(l2), l2;
  }
  var t, r, u, i, o = 0, f = [], c = l$1, e = c.__b, a = c.__r, v = c.diffed, l = c.__c, m = c.unmount, s = c.__;
  function p(n2, t2) {
    c.__h && c.__h(r, n2, o || t2), o = 0;
    var u2 = r.__H || (r.__H = { __: [], __h: [] });
    return n2 >= u2.__.length && u2.__.push({}), u2.__[n2];
  }
  function d(n2) {
    return o = 1, h(D, n2);
  }
  function h(n2, u2, i2) {
    var o2 = p(t++, 2);
    if (o2.t = n2, !o2.__c && (o2.__ = [D(void 0, u2), function(n3) {
      var t2 = o2.__N ? o2.__N[0] : o2.__[0], r2 = o2.t(t2, n3);
      t2 !== r2 && (o2.__N = [r2, o2.__[1]], o2.__c.setState({}));
    }], o2.__c = r, !r.__f)) {
      var f2 = function(n3, t2, r2) {
        if (!o2.__c.__H) return true;
        var u3 = o2.__c.__H.__.filter(function(n4) {
          return n4.__c;
        });
        if (u3.every(function(n4) {
          return !n4.__N;
        })) return !c2 || c2.call(this, n3, t2, r2);
        var i3 = o2.__c.props !== n3;
        return u3.some(function(n4) {
          if (n4.__N) {
            var t3 = n4.__[0];
            n4.__ = n4.__N, n4.__N = void 0, t3 !== n4.__[0] && (i3 = true);
          }
        }), c2 && c2.call(this, n3, t2, r2) || i3;
      };
      r.__f = true;
      var c2 = r.shouldComponentUpdate, e2 = r.componentWillUpdate;
      r.componentWillUpdate = function(n3, t2, r2) {
        if (this.__e) {
          var u3 = c2;
          c2 = void 0, f2(n3, t2, r2), c2 = u3;
        }
        e2 && e2.call(this, n3, t2, r2);
      }, r.shouldComponentUpdate = f2;
    }
    return o2.__N || o2.__;
  }
  function j() {
    for (var n2; n2 = f.shift(); ) {
      var t2 = n2.__H;
      if (n2.__P && t2) try {
        t2.__h.some(z), t2.__h.some(B), t2.__h = [];
      } catch (r2) {
        t2.__h = [], c.__e(r2, n2.__v);
      }
    }
  }
  c.__b = function(n2) {
    r = null, e && e(n2);
  }, c.__ = function(n2, t2) {
    n2 && t2.__k && t2.__k.__m && (n2.__m = t2.__k.__m), s && s(n2, t2);
  }, c.__r = function(n2) {
    a && a(n2), t = 0;
    var i2 = (r = n2.__c).__H;
    i2 && (u === r ? (i2.__h = [], r.__h = [], i2.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })) : (i2.__h.some(z), i2.__h.some(B), i2.__h = [], t = 0)), u = r;
  }, c.diffed = function(n2) {
    v && v(n2);
    var t2 = n2.__c;
    t2 && t2.__H && (t2.__H.__h.length && (1 !== f.push(t2) && i === c.requestAnimationFrame || ((i = c.requestAnimationFrame) || w)(j)), t2.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u), n3.u = void 0;
    })), u = r = null;
  }, c.__c = function(n2, t2) {
    t2.some(function(n3) {
      try {
        n3.__h.some(z), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || B(n4);
        });
      } catch (r2) {
        t2.some(function(n4) {
          n4.__h && (n4.__h = []);
        }), t2 = [], c.__e(r2, n3.__v);
      }
    }), l && l(n2, t2);
  }, c.unmount = function(n2) {
    m && m(n2);
    var t2, r2 = n2.__c;
    r2 && r2.__H && (r2.__H.__.some(function(n3) {
      try {
        z(n3);
      } catch (n4) {
        t2 = n4;
      }
    }), r2.__H = void 0, t2 && c.__e(t2, r2.__v));
  };
  var k = "function" == typeof requestAnimationFrame;
  function w(n2) {
    var t2, r2 = function() {
      clearTimeout(u2), k && cancelAnimationFrame(t2), setTimeout(n2);
    }, u2 = setTimeout(r2, 35);
    k && (t2 = requestAnimationFrame(r2));
  }
  function z(n2) {
    var t2 = r, u2 = n2.__c;
    "function" == typeof u2 && (n2.__c = void 0, u2()), r = t2;
  }
  function B(n2) {
    var t2 = r;
    n2.__c = n2.__(), r = t2;
  }
  function D(n2, t2) {
    return "function" == typeof t2 ? t2(n2) : t2;
  }
  function isGalleryLinkLine(line) {
    return line.includes("hentai.org/g/");
  }
  function unwrapLink(link) {
    if (!link.includes("[url=")) {
      return link;
    }
    const startIndex = link.indexOf("[url=") + 5;
    const endIndex = link.indexOf("]", startIndex);
    return link.substring(startIndex, endIndex);
  }
  function isStrikedLine(line) {
    line = line.trim();
    const strikedStart = line.indexOf("[s]");
    const strikedEnd = line.lastIndexOf("[/s]");
    return strikedStart === 0 && strikedEnd > strikedStart;
  }
  function unwrapStriked(line) {
    if (!isStrikedLine(line)) {
      return { value: line, suffix: "" };
    }
    const strikedStart = line.indexOf("[s]");
    const strikedEnd = line.lastIndexOf("[/s]");
    const value = line.slice(strikedStart + 3, strikedEnd);
    const suffix = line.slice(strikedEnd + 4);
    return { value, suffix };
  }
  function wrapStriked(text) {
    return `[s]${text}[/s]`;
  }
  const tagStartRegex = new RegExp(
    `(?:\\[s\\])?(?:${Namespaces.join("|")})(?=${TAG_NAME_REGEX})`,
    "g"
  );
  function getDirtyTagStrings(text) {
    const starts = [...text.matchAll(tagStartRegex)].map((m2) => m2.index);
    if (starts.length === 0) return [];
    return starts.map((start, i2) => {
      const end = starts[i2 + 1] ?? text.length;
      const chunk = text.slice(start, end);
      const closeIdx = chunk.indexOf("[/s]");
      return closeIdx === -1 ? chunk : chunk.slice(0, closeIdx + 4);
    });
  }
  function parsePost(text, href = window.location.href, date = ( new Date()).toISOString()) {
    if (text.startsWith(THANKS_MSG)) {
      text = text.slice(THANKS_MSG.length).trimStart();
    }
    const firstLine = text.split("\n")[0];
    let opener = DEFAULT_OPENER_MSG;
    if (firstLine && !includesTagString(firstLine) && !isGalleryLinkLine(firstLine)) {
      if (isStrikedLine(firstLine)) {
        const { value } = unwrapStriked(firstLine);
        opener = value;
        text = text.slice(firstLine.length).trimStart();
      } else {
        opener = firstLine;
        text = text.slice(firstLine.length).trimStart();
      }
    }
    const groups = text.split(new RegExp(PARSER_GROUP_SPLITTER.join("|"))).map((t2, i2) => ({
      lines: t2.split("\n").filter((l2) => l2.length > 0),
      group: i2
    }));
    if (groups.length === 0 || groups[0].lines.length === 0) {
      return { opener: "", href, date, galleries: [] };
    }
    const galleries = [];
    const linesBag = [];
    let shouldClearBag = false;
    for (const { lines, group } of groups) {
      for (let i2 = 0; i2 < lines.length; i2++) {
        const lineText = lines[i2];
        if (isGalleryLinkLine(lineText)) {
          shouldClearBag = true;
          const { href: href2, info, isStriked } = parseGalleryLink(lineText);
          let lines2 = structuredClone(linesBag);
          if (isStriked) {
            lines2 = lines2.map((l2) => {
              if (isTagLine(l2)) {
                return {
                  ...l2,
                  tags: l2.tags.map((t2) => ({ ...t2, isStriked: true }))
                };
              }
              return l2;
            });
          }
          const gallery = {
            href: href2,
            info,
            lines: lines2,
            group
          };
          galleries.push(gallery);
          continue;
        }
        if (includesTagString(lineText)) {
          if (shouldClearBag) {
            linesBag.length = 0;
            shouldClearBag = false;
          }
          linesBag.push(parseTagsLine(lineText));
          continue;
        }
        linesBag.push({ text: lineText });
      }
    }
    return {
      opener,
      href,
      date,
      galleries
    };
  }
  function parseTagsLine(line) {
    const isStrikedTl = isStrikedLine(line);
    if (isStrikedTl) {
      const { value, suffix } = unwrapStriked(line);
      line = `${value.trim()} ${suffix.trim()}`;
    }
    const tagStrings = getDirtyTagStrings(line);
    let info = "";
    const tags = tagStrings.map((tagStr, index) => {
      tagStr = tagStr.trimEnd();
      while (tagStr.endsWith(TAG_SPLITTER)) {
        tagStr = tagStr.slice(0, -1);
      }
      const isStriked = isStrikedLine(tagStr);
      if (isStriked) {
        const { value, suffix: suffix2 } = unwrapStriked(tagStr);
        tagStr = `${value.trim()} ${suffix2.trim()}`;
      }
      const { tag, suffix } = parseTagFromString(tagStr);
      if (index === tagStrings.length - 1) {
        info = suffix;
      } else if (suffix) {
        console.warn("parser: dropping tag suffix: ", suffix);
      }
      return {
        ...tag,
        isStriked: isStrikedTl || isStriked
      };
    });
    return { tags, info };
  }
  function parseGalleryLink(linkLine) {
    const isStriked = isStrikedLine(linkLine);
    let strikedSuffix = "";
    if (isStriked) {
      const { value, suffix } = unwrapStriked(linkLine);
      linkLine = value;
      strikedSuffix = suffix;
    }
    const splitted = linkLine.split(" ");
    const link = unwrapLink(splitted[0]);
    const info = splitted.slice(1).join(" ");
    return {
      href: link,
      info: [info.trimStart(), strikedSuffix.trimEnd()].filter(Boolean).join(" "),
      isStriked
    };
  }
  function postToString(post) {
    const opener = post.opener || DEFAULT_OPENER_MSG;
    const activeGalleries = post.galleries.filter((g2) => !isStrikedGallery(g2));
    const completedGalleries = post.galleries.filter(isStrikedGallery);
    const activeContent = activeGalleries.length > 0 ? renderGroupedGalleries(activeGalleries) : "";
    const completedContent = completedGalleries.length > 0 ? renderGroupedGalleries(completedGalleries) : "";
    const sections = [];
    const postIsStriked = isStrikedPost(post);
    if (postIsStriked) {
      sections.push(THANKS_MSG);
    }
    sections.push(postIsStriked ? wrapStriked(opener) : opener);
    if (activeContent) {
      sections.push(activeContent);
    }
    if (completedContent) {
      if (!postIsStriked) {
        sections.push(THANKS_MSG);
      }
      sections.push(completedContent);
    }
    return sections.filter(Boolean).join("\n\n");
  }
  function renderGroupedGalleries(galleries) {
    const groups = [...new Set(galleries.map((g2) => g2.group))].sort(
      (a2, b2) => a2 - b2
    );
    return groups.map(
      (group) => galleriesToString(galleries.filter((g2) => g2.group === group))
    ).join(TO_STRING_GROUP_SPLITTER);
  }
  function galleriesToString(galleries) {
    return galleries.map(galleryToString).join("\n\n");
  }
  function galleryToString(gallery) {
    const lines = [
      ...gallery.lines.filter(isTagLine).sort((a2, b2) => +isStrikedTagLine(a2) - +isStrikedTagLine(b2)).concat(),
      ...gallery.lines.filter((l2) => !isTagLine(l2))
    ].map(lineToString);
    let linkLine = `[url=${gallery.href}]${gallery.href}[/url]${gallery.info}`;
    if (isStrikedGallery(gallery)) {
      linkLine = wrapStriked(linkLine);
    }
    lines.push(linkLine);
    return lines.join("\n");
  }
  function lineToString(line) {
    return isTagLine(line) ? tagLineToString(line) : line.text;
  }
  function tagLineToString(line) {
    const isStriked = isStrikedTagLine(line);
    const tagsStr = line.tags.sort((a2, b2) => +a2.isStriked - +b2.isStriked).map((t2) => tagToString(t2, !isStriked)).join(`${TAG_SPLITTER} `);
    const tagLineStr = `${tagsStr}${line.info}`;
    return isStriked ? wrapStriked(tagLineStr) : tagLineStr;
  }
  function tagToString(tag, shouldWrap = true) {
    const value = `${ShortenNamespace[tag.namespace]}${tag.name}`;
    return tag.isStriked && shouldWrap ? wrapStriked(value) : value;
  }
  function PostInfo({ post }) {
    const { strikedGalleries, totalGalleries } = getPostGalleriesCount(post);
    const { strikedTags, totalTags } = getPostTagsCount(post);
    return u$1("div", { children: [
u$1("div", { children: [
        "Striked ",
        strikedGalleries,
        "/",
        totalGalleries,
        " galleries"
      ] }),
u$1("div", { children: [
        "Striked ",
        strikedTags,
        "/",
        totalTags,
        " tags"
      ] })
    ] });
  }
  const POSTS_STORAGE_KEY = "downvote_posts";
  function loadPosts() {
    return JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY) || "[]");
  }
  function loadPost(href) {
    return loadPosts().find((p2) => p2.href === href) ?? null;
  }
  function savePosts(posts) {
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
  }
  function equalsPosts(a2, b2) {
    return a2.href === b2.href;
  }
  function saveOrUpdatePost(post) {
    if (post.galleries.some(
      (g2) => g2.lines.filter(isTagLine).some((l2) => l2.tags.some((t2) => t2.name.includes("present")))
    )) {
      alert("post has 'present' tag");
      throw new Error('post has "present" tag');
    }
    const posts = loadPosts();
    const index = posts.findIndex((p2) => equalsPosts(p2, post));
    if (index === -1) {
      posts.push(post);
      console.info("created post\n", post);
    } else {
      const updated = {
        ...posts[index],
        galleries: post.galleries,
        opener: post.opener
      };
      posts[index] = updated;
      console.info("updated post\n", post);
    }
    savePosts(posts);
    return posts.find((p2) => equalsPosts(p2, post));
  }
  const ASSISTANCE_FORUM_TITLE = "Tagging and Mistagging Assistance";
  const EDITING_PREFIX = "Editing a post in ";
  const REPLYING_PREFIX = "Replying to ";
  function isEditingPost() {
    const titles = [...document.querySelectorAll(".maintitle")];
    return titles.some(
      (t2) => t2.textContent.includes(EDITING_PREFIX + ASSISTANCE_FORUM_TITLE)
    );
  }
  function isCreatingPost() {
    const titles = [...document.querySelectorAll(".maintitle")];
    return titles.some(
      (t2) => t2.textContent.includes(REPLYING_PREFIX + ASSISTANCE_FORUM_TITLE)
    );
  }
  function getPostText() {
    return getPostTextarea().value;
  }
  function setPostText(text) {
    getPostTextarea().value = text;
  }
  function getPostTextarea() {
    return document.querySelector("#postcontent");
  }
  function getPostHref() {
    const url = new URL(window.location.href);
    if (url.searchParams.size === 0) {
      url.searchParams.set("act", "post");
      url.searchParams.set("do", "edit_post");
      const f2 = document.querySelector('input[name="f"]').value;
      const t2 = document.querySelector('input[name="t"]').value;
      const p2 = document.querySelector('input[name="p"]').value;
      const st = document.querySelector('input[name="st"]').value;
      if (!f2 || !t2 || !p2 || !st) {
        throw new Error(`couldnt query url params from dom ${{ f: f2, t: t2, p: p2, st }}`);
      }
      url.searchParams.set("f", "edit_post");
      url.searchParams.set("t", "edit_post");
      url.searchParams.set("p", "edit_post");
      url.searchParams.set("st", "edit_post");
    }
    return url.href;
  }
  const header = "_header_aob47_1";
  const headerRight = "_headerRight_aob47_15";
  const checkButton = "_checkButton_aob47_27";
  const spinner = "_spinner_aob47_43";
  const styles$1 = {
    header,
    headerRight,
    checkButton,
    spinner
  };
  function App() {
    const [post, setPost] = d(
      () => isEditingPost() ? loadPost(getPostHref()) : null
    );
    const [checkProgress, setCheckProgress] = d(
      null
    );
    const updatePost = (post2) => {
      setPostText(postToString(post2));
      setPost(post2);
    };
    const handleCheckTags = async () => {
      setCheckProgress({ total: 0, checked: 0 });
      try {
        const parsed = parsePost(getPostText(), post?.href, post?.date);
        const updates = await checkPosts([parsed], (change) => {
          switch (change) {
            case "checked-gallery":
              setCheckProgress((prev) => {
                prev ??= { total: 0, checked: 0 };
                return { ...prev, checked: prev.checked + 1 };
              });
              break;
            case "increase-total":
              setCheckProgress((prev) => {
                prev ??= { total: 0, checked: 0 };
                return { ...prev, total: prev.total + 1 };
              });
              break;
          }
        });
        const { checkedPost } = updates[0] ?? { checkedPost: post };
        updatePost(checkedPost);
      } catch (e2) {
        console.error(e2);
      } finally {
        setCheckProgress(null);
      }
    };
    return u$1(S, { children: [
u$1("div", { class: styles$1.header, children: [
u$1("h4", { children: post ? `Post: ${toHumanDate(post.date)}` : "No post info" }),
u$1("div", { class: styles$1.headerRight, children: [
          checkProgress && u$1("progress", { value: checkProgress.checked, max: checkProgress.total }),
u$1(
            "button",
            {
              onClick: handleCheckTags,
              type: "button",
              class: styles$1.checkButton,
              children: [
                "Check tags",
                " ",
                checkProgress && checkProgress.checked !== checkProgress.total && u$1("span", { class: styles$1.spinner })
              ]
            }
          )
        ] })
      ] }),
      post && u$1(PostInfo, { post })
    ] });
  }
  const root = "_root_17y9n_1";
  const styles = {
    root
  };
  function renderRoot() {
    const parent = document.querySelector(
      ".darkrow3 > tbody > tr > td:nth-child(2)"
    );
    if (!parent) {
      console.error("Couldnt query parent for tags checker");
      return;
    }
    const root2 = document.createElement("div");
    root2.className = styles.root;
    parent.appendChild(root2);
    R( u$1(App, {}), root2);
  }
  async function setupPostAutoSave() {
    const accessor = () => _unsafeWindow?.ValidateForm ?? null;
    const originalValidate = await query(accessor, {
      retry: 2 * 15,
      timeout: 500
    });
    if (!originalValidate) {
      const message = "failed to setup post auto save: couldnt query validate form function on window.";
      console.error(message);
      return;
    }
    _unsafeWindow.ValidateForm = function(...args) {
      try {
        const href = getPostHref();
        const post = parsePost(getPostText(), href);
        saveOrUpdatePost(post);
      } catch (e2) {
        alert("Failed to save post: " + e2);
      }
      return originalValidate.apply(this, args);
    };
  }
  const BACKUP_NAME = "backup-downvote-posts";
  const BACKUP_EXT = ".json";
  function downloadBackup() {
    const posts = loadPosts();
    const backup = {
      posts
    };
    const content = JSON.stringify(backup);
    downloadFile(BACKUP_NAME + BACKUP_EXT, content);
  }
  async function restoreBackup() {
    const file = await promptFile("application/json");
    if (!file) {
      console.warn("no backup file selected");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result;
        const backup = JSON.parse(content);
        const posts = backup.posts;
        posts.forEach((post) => {
          try {
            saveOrUpdatePost(post);
          } catch (error) {
            console.error("error restoring post", post, error);
          }
        });
      } catch (error) {
        console.error("error parsing backup file", error);
      }
    };
    reader.readAsText(file);
  }
  main();
  function main() {
    setupGlobalShortcuts();
    if (isEditingPost() || isCreatingPost()) {
      setupPostAutoSave();
      renderRoot();
    }
  }
  function setupGlobalShortcuts() {
    document.addEventListener("keyup", (e2) => {
      if (e2.ctrlKey && e2.altKey && e2.code === "Digit1") {
        openPosts();
      }
      if (e2.ctrlKey && e2.altKey && e2.code === "Digit2") {
        openChangedPosts();
      }
      if (e2.ctrlKey && e2.altKey && e2.code === "Digit5") {
        openPosts({ isStriked: true });
      }
      if (e2.ctrlKey && e2.altKey && e2.code === "Digit9") {
        openPosts();
        openPosts({ isStriked: true });
      }
      if (e2.code === "F11") {
        downloadBackup();
      }
      if (e2.code === "F12") {
        restoreBackup();
      }
    });
  }
  function openPosts({ isStriked } = { isStriked: false }) {
    const posts = loadPosts();
    for (const post of posts.slice().reverse()) {
      if (isStrikedPost(post) === isStriked) {
        _GM_openInTab(post.href);
      }
    }
  }
  async function openChangedPosts() {
    const posts = loadPosts();
    console.info(`Checking ${posts.length} posts`);
    const updates = await checkPosts(posts);
    console.info(`Updated ${updates.length} posts`);
    for (const { checkedPost, checkedGalleries, strikedTags } of updates) {
      const message = `Post ${toHumanDate(checkedPost.date)} ${checkedPost.href}
${checkedGalleries} galleries checked 
${strikedTags} tags striked`;
      console.info(message);
      _GM_openInTab(checkedPost.href);
    }
  }

})();