// Offline copy of the game for the iPhone home-screen app (scripts/build_pwa.py fills NAME, BASE, OWN, FILES, CORE).
// The game files live in play/; the 全開版 in all/ has only its own page, manifest and icons (OWN) and loads the rest from play/.
// Every file is kept in one cache with a hash marker, so an update only downloads the files that changed.
// install: the small core files (pages, code, fonts, UI art), into a staging cache.
// activate: move the staged files in, take over open pages (the page reloads once after an update).
// 'fill' message from the page: download every missing or outdated file, reporting progress; it picks up
// where it stopped if iOS closes the app halfway. fetch: cached copy first, else the network (and keep it).
// build 145bc617afd2
const NAME = "play", BASE = "./", OWN = ["index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"], FILES = {"assets/ab-cross-current-v16.wav": "2f34a03c4a15", "assets/ab-cross-flow-v16.wav": "82041a8818e5", "assets/ab-flame-current-v13.wav": "aa08fc5ae2c6", "assets/ab-flame-flow-v13.wav": "abe94524b0ee", "assets/ab-prism-flow-v19.wav": "79ed613fe5dc", "assets/afternoon-tea.webp": "47cbbbef284c", "assets/aura-cross-v35.png": "5f7c69de6b03", "assets/aura-pearl-v35.png": "7286eb7b2f59", "assets/bgm-autumn1-v55.mp3": "c6a2b1517fd6", "assets/bgm-autumn2-v55.mp3": "23b8f82e75ea", "assets/bgm-spring2-v55.mp3": "28e158e36172", "assets/bgm-strawberry-tea-v44.mp3": "a0c38a10e049", "assets/bgm-summer1-v55.mp3": "6ed2b31e1c8c", "assets/bgm-summer2-v55.mp3": "c9b1dc1a58fb", "assets/bgm-winter1-v55.mp3": "bedcbb6f78a6", "assets/bgm-winter2-v55.mp3": "e81bcf6b64ee", "assets/birth-flow-v34.wav": "5780994c076f", "assets/birth-flow-v34.webp": "3958ae9ef620", "assets/blossom-v45.webp": "aa44f564973b", "assets/bud-v45.webp": "37b6674fc90a", "assets/burr-cracked-v45.webp": "50ed408e412e", "assets/burr-v45.webp": "b7505efa4aea", "assets/button-v44.webp": "ae863fff8dbf", "assets/cake-base-v25.png": "500a6573c424", "assets/cake-berry-v25.png": "74e2dc5c7222", "assets/cake-v24.png": "5bdba1aa39cf", "assets/chapter-autumn-end-v46.webp": "260b7e43020b", "assets/chapter-summer-end-v84.webp": "ae0a66ca8c2f", "assets/chapter1-end-v44.webp": "37cc74fbd8e1", "assets/chapter2-end-v45.webp": "4c8488c73f2b", "assets/choux-v29.png": "241065e3ee65", "assets/cone-v29.png": "b232fbbc07e4", "assets/cover-autumn1-v61.webp": "e3b4717ed579", "assets/cover-autumn2-v61.webp": "17c576396984", "assets/cover-finale-v61.webp": "0366c619ed83", "assets/cover-spring1-v61.webp": "3c8d95b428d7", "assets/cover-spring2-v61.webp": "3eff455785ad", "assets/cover-summer1-v61.webp": "141a407fea75", "assets/cover-summer2-v61.webp": "69533650b763", "assets/cover-winter1-v61.webp": "f637a9013935", "assets/cover-winter2-v61.webp": "948ebca0164a", "assets/dessert-a1-v45.webp": "52acf82c51b0", "assets/dessert-a2-v45.webp": "e6e177f3f69f", "assets/dessert-a3-v45.webp": "524280e2058e", "assets/dessert-a4-v45.webp": "a1e4086b5974", "assets/dessert-a5-v45.webp": "c62bad3233b5", "assets/dessert-a6-v45.webp": "e08c28935fe0", "assets/dessert-r1-v44.webp": "3d65bc411df0", "assets/dessert-r10-v45.webp": "bf28539e447a", "assets/dessert-r11-v45.webp": "522a76d3ded3", "assets/dessert-r12-v45.webp": "6f12e7432659", "assets/dessert-r2-v44.webp": "77502dc22e4b", "assets/dessert-r3-v44.webp": "a2e37d69d88e", "assets/dessert-r4-v44.webp": "330909d51047", "assets/dessert-r5-v44.webp": "874a26e53a5d", "assets/dessert-r6-v44.webp": "9d0f8e3567b0", "assets/dessert-r7-v45.webp": "1d601b27bfb6", "assets/dessert-r8-v45.webp": "7abcbfb3f2d9", "assets/dessert-r9-v45.webp": "67aa7d98b5c5", "assets/dessert-s1-v44.webp": "d5d5745052f5", "assets/dessert-s2-v45.webp": "a085cc1962dc", "assets/dessert-s3-v45.webp": "53460daecfa5", "assets/dessert-s4-v45.webp": "49cd11453611", "assets/dessert-s5-v45.webp": "aaf96afb562c", "assets/dessert-s6-v45.webp": "b97abd8fd8f6", "assets/dialogue-v44.webp": "edfd0364ed9f", "assets/donut-v29.png": "4e00a8d57d1b", "assets/finale-shot1-v60.webp": "0c8528464d2d", "assets/finale-shot2-v84.webp": "53912bb556dc", "assets/finale-shot3-v60.webp": "2de2802c833f", "assets/finale-shot4-v48.webp": "cbc730873920", "assets/finale-shot5-v48.webp": "bb34462c1bae", "assets/finale-shot6-v48.webp": "02b347130df9", "assets/finale-theme-v49.mp3": "6da6da185706", "assets/floral-flow-v12.png": "e3384d8838ea", "assets/floral-sprig-v44.webp": "e2b82cb328ba", "assets/frost-shell-v44.webp": "9c4cef4836fc", "assets/gift-v45.webp": "1bc129ce3f03", "assets/header-autumn-v60.webp": "2909b37d5a2b", "assets/header-spring-v60.webp": "2d965395da1f", "assets/header-summer-v60.webp": "13346b7ee599", "assets/header-winter-v60.webp": "92e353c4ea7a", "assets/icon-album-v59.webp": "e3222712aaa0", "assets/icon-back-v56.webp": "73ea28007cc1", "assets/icon-close-v56.webp": "ddddcfa06caf", "assets/icon-exit-v59.webp": "711bf8366683", "assets/icon-hint-v56.webp": "8bdcbff1ea8d", "assets/icon-lock-v56.webp": "ef008c434609", "assets/icon-menu-v56.webp": "fe745441be48", "assets/icon-note-v56.webp": "1f364776cc9c", "assets/icon-play-v56.webp": "6a44bcaa2f37", "assets/icon-skip-v56.webp": "258602c31a8c", "assets/icon-sound-off-v56.webp": "0361c7f4e546", "assets/icon-sound-on-v56.webp": "b024bc360448", "assets/icon-star-off-v56.webp": "c470815668ce", "assets/icon-star-on-v56.webp": "fb03390ea5d0", "assets/item-mango-v45.webp": "a4ae66f3d0c0", "assets/leaf-v45.webp": "8cdb98fef515", "assets/macaron-v30.png": "cf016b20e225", "assets/mimi-portraits-v44.webp": "b008eab9dad7", "assets/mimi-sans-fill-400.woff2": "978e7c1aee6c", "assets/mimi-sans-fill-500.woff2": "ff55cefd2e92", "assets/mimi-sans-fill-700.woff2": "a031f8b23a80", "assets/mimi-sans-tc.woff2": "2eddade16275", "assets/mimi-serif-fill-400.woff2": "8e126c69b38e", "assets/mimi-serif-fill-600.woff2": "d2c5d8a9fbf7", "assets/mimi-serif-fill-700.woff2": "3b130061f51b", "assets/mimi-serif-fill-900.woff2": "653c0896de32", "assets/mimi-serif-tc.woff2": "9d7945ef9517", "assets/owner-portraits-v44.webp": "ffafda4308d5", "assets/petals-flow-v17.webp": "8333da013540", "assets/prism-flow-v21.webp": "91f806fd324c", "assets/pudding-v5.png": "d85f68c0a581", "assets/rainbow-v57.png": "a00fb17ee685", "assets/ring-v4.png": "dc0001af8985", "assets/scene-autumn-mid-v52.webp": "20c28011cef4", "assets/scene-autumn-open-v52.webp": "92ffb6763919", "assets/scene-inf-unlock-v60.webp": "8142a0da86ef", "assets/scene-spring-mid-v52.webp": "62ae01467ff9", "assets/scene-spring-open-v52.webp": "b5d7e01db067", "assets/scene-summer-mid-v84.webp": "68d3dc13156a", "assets/scene-summer-open-v84.webp": "fae5964f39a0", "assets/scene-winter-mid-v52.webp": "5a03236e83df", "assets/scene-winter-open-v84.webp": "6478cf236d95", "assets/sfx-birth-v32.wav": "1ed29d77b4a5", "assets/sfx-charge-v10.wav": "cf914204f499", "assets/sfx-impact-v10.wav": "d9ec61e396a1", "assets/sfx-invalid-v32.wav": "d38d37f3dd9b", "assets/sfx-land-1-v32.wav": "574997c9299a", "assets/sfx-land-2-v32.wav": "1cc54dae232a", "assets/sfx-match-1-v32.wav": "f7ac551f205b", "assets/sfx-match-2-v32.wav": "d2ca63f935d9", "assets/sfx-note-v32.wav": "022c76efb90a", "assets/sfx-select-1-v32.wav": "bc4a39a97870", "assets/sfx-select-2-v32.wav": "397b0e4b764d", "assets/sfx-select-3-v32.wav": "244370ea596e", "assets/sfx-swap-v32.wav": "051f736f42f6", "assets/shards-v4.png": "08a1c57613ce", "assets/shop-v4.webp": "dcd7a2bdf993", "assets/star-v4.png": "f5f426c30fd2", "assets/starline-flow-v14.webp": "1d7c0bbef056", "assets/story-berry-v44.webp": "cb611fb8ec05", "assets/story-puff-v44.webp": "814fcf62edb6", "assets/story-serve-v44.webp": "7106e3c62034", "assets/sugar-dust-v44.webp": "2ca844ede626", "assets/tart-v29.png": "d0a73732db01", "assets/thumb-autumn-mid-v52.webp": "82f017cb122b", "assets/thumb-autumn-open-v52.webp": "ed9d20cda87e", "assets/thumb-autumn-v51.webp": "9ce48f9f8832", "assets/thumb-berry-v51.webp": "0e874786df3d", "assets/thumb-inf-unlock-v60.webp": "f1e0526a7484", "assets/thumb-opening-v51.webp": "f820cfda466b", "assets/thumb-puff-v51.webp": "b56b3675c8d4", "assets/thumb-serve-v51.webp": "ca072e48c353", "assets/thumb-spring-mid-v52.webp": "a98da8248142", "assets/thumb-spring-open-v52.webp": "ac75997615c1", "assets/thumb-spring-v51.webp": "61a379408699", "assets/thumb-summer-mid-v84.webp": "af9bd6c4f8d9", "assets/thumb-summer-open-v84.webp": "de988cf93e64", "assets/thumb-summer-v84.webp": "1ba8c9a8b808", "assets/thumb-winter-mid-v52.webp": "5d1a551b581f", "assets/thumb-winter-open-v84.webp": "d07172c2fefd", "assets/thumb-winter-v51.webp": "37fa985b6288", "assets/title-bg-v50.webp": "759d48179b5c", "assets/title-logo-jp2a-v54.webp": "13831b4b76bd", "assets/title-ornament-v44.webp": "e4c3fb4bed1e", "assets/tray-autumn-v60.webp": "b163c120c14c", "assets/tray-elegant-v58.webp": "d96f73a2524b", "assets/tray-spring-v60.webp": "12ed1c3d0105", "assets/tray-summer-v60.webp": "87c84d50d0a8", "assets/tray-winter-v60.webp": "26a99284f39e", "assets/tray-wood-v58.webp": "dea7778c5e20", "assets/ui-btn-primary-plain-v56.webp": "db395b7803d2", "assets/ui-btn-primary-v56.webp": "274a2f1edfbf", "assets/ui-btn-secondary-plain-v56.webp": "e3bfe75f72c4", "assets/ui-btn-secondary-v56.webp": "ae175335225d", "assets/ui-card-lines-v56.webp": "afeba5471b93", "assets/ui-card-v56.webp": "d37c9c1f803d", "assets/ui-frame-lines-v56.webp": "74851ea49bfe", "assets/ui-frame-v56.webp": "18bd9731aa11", "audio.js": "3ac07d933018", "bgm.js": "76f2a75211fc", "birth-fx.js": "ea4ad5dddf5c", "comparison-audio.js": "acbc622da596", "content.js": "7c1d6bf52bc9", "contour-fx.js": "047f7997cfe2", "cross-fx.js": "f67824dfe9f5", "engine.js": "cbe4b67c2157", "favicon.svg": "1390b5919087", "fx-surface.js": "7859abb27c60", "game.js": "310dced85c68", "gold-fx.js": "28a75eb3f3d7", "infinite.js": "ce6aff686cf7", "motion.css": "1cdaf035e17b", "motion.js": "ed3ad8e39006", "prism-fx.js": "979fc95201c9", "recipe-ui.js": "129c9d507c2e", "style.css": "c7d033a2a9b7", "view.js": "b67f9e580104", "pwa.js": "ec292a17a9a5", "index.html": "898bf310cbf6", "manifest.webmanifest": "c13ab069fa41", "icon-180.png": "c35293096c11", "icon-192.png": "6e70dfed6290", "icon-512.png": "3103b5c46967"}, CORE = ["assets/aura-cross-v35.png", "assets/aura-pearl-v35.png", "assets/button-v44.webp", "assets/cake-base-v25.png", "assets/cake-berry-v25.png", "assets/cake-v24.png", "assets/choux-v29.png", "assets/cone-v29.png", "assets/cover-autumn1-v61.webp", "assets/cover-autumn2-v61.webp", "assets/cover-finale-v61.webp", "assets/cover-spring1-v61.webp", "assets/cover-spring2-v61.webp", "assets/cover-summer1-v61.webp", "assets/cover-summer2-v61.webp", "assets/cover-winter1-v61.webp", "assets/cover-winter2-v61.webp", "assets/dialogue-v44.webp", "assets/donut-v29.png", "assets/floral-flow-v12.png", "assets/header-autumn-v60.webp", "assets/header-spring-v60.webp", "assets/header-summer-v60.webp", "assets/header-winter-v60.webp", "assets/icon-album-v59.webp", "assets/icon-back-v56.webp", "assets/icon-close-v56.webp", "assets/icon-exit-v59.webp", "assets/icon-hint-v56.webp", "assets/icon-lock-v56.webp", "assets/icon-menu-v56.webp", "assets/icon-note-v56.webp", "assets/icon-play-v56.webp", "assets/icon-skip-v56.webp", "assets/icon-sound-off-v56.webp", "assets/icon-sound-on-v56.webp", "assets/icon-star-off-v56.webp", "assets/icon-star-on-v56.webp", "assets/macaron-v30.png", "assets/mimi-portraits-v44.webp", "assets/mimi-sans-fill-400.woff2", "assets/mimi-sans-fill-500.woff2", "assets/mimi-sans-fill-700.woff2", "assets/mimi-sans-tc.woff2", "assets/mimi-serif-fill-400.woff2", "assets/mimi-serif-fill-600.woff2", "assets/mimi-serif-fill-700.woff2", "assets/mimi-serif-fill-900.woff2", "assets/mimi-serif-tc.woff2", "assets/owner-portraits-v44.webp", "assets/pudding-v5.png", "assets/rainbow-v57.png", "assets/ring-v4.png", "assets/shards-v4.png", "assets/shop-v4.webp", "assets/star-v4.png", "assets/tart-v29.png", "assets/title-bg-v50.webp", "assets/title-logo-jp2a-v54.webp", "assets/title-ornament-v44.webp", "assets/tray-autumn-v60.webp", "assets/tray-elegant-v58.webp", "assets/tray-spring-v60.webp", "assets/tray-summer-v60.webp", "assets/tray-winter-v60.webp", "assets/tray-wood-v58.webp", "assets/ui-btn-primary-plain-v56.webp", "assets/ui-btn-primary-v56.webp", "assets/ui-btn-secondary-plain-v56.webp", "assets/ui-btn-secondary-v56.webp", "assets/ui-card-lines-v56.webp", "assets/ui-card-v56.webp", "assets/ui-frame-lines-v56.webp", "assets/ui-frame-v56.webp", "audio.js", "bgm.js", "birth-fx.js", "comparison-audio.js", "content.js", "contour-fx.js", "cross-fx.js", "engine.js", "fx-surface.js", "game.js", "gold-fx.js", "infinite.js", "motion.css", "motion.js", "prism-fx.js", "recipe-ui.js", "style.css", "view.js", "pwa.js", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
const MAIN = 'mimi-cake-' + NAME, STAGE = MAIN + '-stage', MARK = '__hash/';
const base = new URL(BASE, self.location).href, own = new URL('./', self.location).href;
const url = path => path.startsWith(MARK) ? new URL(path, base).href : new URL(path, OWN.includes(path) ? own : base).href;
const PATH_OF = new Map(Object.keys(FILES).map(p => [url(p), p]));

// Files already checked once are remembered, so later requests go straight to the cached copy.
const known = new Set();
async function fresh(cache, path) {
  if (known.has(path)) return true;
  const m = await cache.match(url(MARK + path));
  const ok = !!m && (await m.text()) === FILES[path] && !!(await cache.match(url(path)));
  if (ok) known.add(path); return ok;
}
// A copy that came through a redirect (e.g. /play/index.html → /play/) cannot answer a page load, so store it plain.
const plain = async res => res.redirected ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers }) : res;
async function save(cache, path) {
  const res = await plain(await fetch(new Request(url(path), { cache: 'reload' })));
  if (!res.ok) throw new Error(path);
  await cache.put(url(path), res);
  await cache.put(url(MARK + path), new Response(FILES[path]));
  known.add(path);
}
async function each(paths, job, threads = 4) {
  let i = 0;
  await Promise.all(Array.from({ length: threads }, async () => { while (i < paths.length) await job(paths[i++]); }));
}

self.addEventListener('install', event => event.waitUntil((async () => {
  const main = await caches.open(MAIN), stage = await caches.open(STAGE), todo = [];
  for (const p of CORE) if (!(await fresh(main, p))) todo.push(p);
  await each(todo, p => save(stage, p));
  await self.skipWaiting();
})()));

self.addEventListener('activate', event => event.waitUntil((async () => {
  const main = await caches.open(MAIN), stage = await caches.open(STAGE);
  for (const req of await stage.keys()) await main.put(req, await stage.match(req));
  await caches.delete(STAGE);
  for (const req of await main.keys()) {               // drop files that are no longer part of the game
    const mark = base + MARK, path = req.url.startsWith(mark) ? decodeURIComponent(req.url.slice(mark.length)) : PATH_OF.get(req.url);
    if (!path || !(path in FILES)) await main.delete(req);
  }
  for (const key of await caches.keys()) if (key.startsWith('mimi-cake-' + NAME) && key !== MAIN) await caches.delete(key);
  await self.clients.claim();
})()));

let filling = null;
async function fill() {
  const main = await caches.open(MAIN), all = Object.keys(FILES), todo = [];
  for (const p of all) if (!(await fresh(main, p))) todo.push(p);
  const tell = async msg => { for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage(msg); };
  let done = all.length - todo.length;
  await tell({ type: 'fill', done, total: all.length });
  await each(todo, async p => {
    try { await save(main, p); } catch { return; }
    done++; await tell({ type: 'fill', done, total: all.length });
  });
  await tell({ type: 'fill', done, total: all.length, finished: done === all.length });
}
self.addEventListener('message', event => {
  if (event.data === 'fill') event.waitUntil(filling ||= fill().finally(() => { filling = null; }));
});

// Safari asks for music played through <audio> in byte ranges; answer those from the cached file.
async function ranged(request, response) {
  const m = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') || '');
  if (!m) return response;
  const buf = await response.arrayBuffer(), size = buf.byteLength;
  const start = m[1] ? +m[1] : Math.max(0, size - +m[2]), end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const clean = req.url.split(/[?#]/)[0];
  const path = req.mode === 'navigate' && clean.startsWith(own) ? 'index.html' : PATH_OF.get(clean) ?? PATH_OF.get(decodeURI(clean));
  if (!path) return;
  event.respondWith((async () => {
    const main = await caches.open(MAIN);
    if (await fresh(main, path)) return ranged(req, await main.match(url(path)));
    try {
      const res = await plain(await fetch(new Request(url(path), { cache: 'reload' })));
      if (res.ok) { const copy = res.clone(); event.waitUntil(main.put(url(path), copy).then(() => main.put(url(MARK + path), new Response(FILES[path]))).then(() => known.add(path))); }
      return req.headers.has('range') && res.ok ? ranged(req, res) : res;
    } catch {
      const old = await main.match(url(path));          // offline: an older copy is better than nothing
      return old ? ranged(req, old) : Response.error();
    }
  })());
});
