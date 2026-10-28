// UI for the normal mode「試做新甜點」: dessert notebook (level list), level intro,
// goal HUD and the tasting card. Game state lives in game.js.
import { DESSERTS } from './content.js';
import { createPortrait, speakerName } from './view.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const icon = type => { const i = el('img', 'goal-icon'); i.src = DESSERTS[type].art.url; i.alt = ''; return i; };
export const starsText = n => '★'.repeat(n) + '☆'.repeat(3 - n);
// Hand-drawn stars (icon sheet qa/v56). total=3 shows earned + empty; total=n shows just n stars.
const STAR_ON = 'assets/icon-star-on-v56.webp', STAR_OFF = 'assets/icon-star-off-v56.webp';
export function starIcons(n, total = 3, cls = '') {
  const box = el('span', 'star-row' + (cls ? ' ' + cls : '')); box.setAttribute('role', 'img'); box.setAttribute('aria-label', `${n} 顆星`);
  for (let i = 0; i < total; i++) { const im = el('img', 'star-ico'); im.src = i < n ? STAR_ON : STAR_OFF; im.alt = ''; box.append(im); }
  return box;
}
const iconImg = (src, cls = 'ui-ico') => { const im = el('img', cls); im.src = src; im.alt = ''; return im; };
export const starsFor = (level, moves) => moves <= level.stars[0] ? 3 : moves <= level.stars[1] ? 2 : 1;

export function line([speaker, text, expression]) {
  if (speaker === '旁白') return el('p', 'recipe-scene narration', text);
  const row = el('div', 'intro-line'), p = el('p'), b = el('b', null, speakerName(speaker));
  p.append(b, document.createTextNode('「' + text + '」')); row.append(createPortrait(speaker, expression), p); return row;
}
function goalChips(level) {
  const box = el('div', 'goal-list');
  for (const [type, n] of Object.entries(level.goals)) { const chip = el('span', 'goal-chip'); chip.append(icon(Number(type)), el('b', null, '× ' + n)); chip.title = DESSERTS[type].name; box.append(chip); }
  if (level.bloom) { const chip = el('span', 'goal-chip bloom'); chip.append(el('i', null, '✿'), el('b', null, '開花 × ' + level.bloom)); box.append(chip); }
  if (level.frost?.length) { const chip = el('span', 'goal-chip'); chip.append(el('i', 'ico-frost'), el('b', null, '敲開糖霜 × ' + level.frost.length)); box.append(chip); }
  if (level.burr?.length) { const chip = el('span', 'goal-chip'); chip.append(el('i', 'ico-burr'), el('b', null, '剝開栗子殼 × ' + level.burr.length)); box.append(chip); }
  if (level.buds?.length) { const chip = el('span', 'goal-chip'); chip.append(el('i', 'ico-bud'), el('b', null, '讓櫻花開 × ' + level.buds.length)); box.append(chip); }
  if (level.mango) { const chip = el('span', 'goal-chip'); chip.append(el('i', 'ico-mango'), el('b', null, '芒果送到底 × ' + level.mango.total)); box.append(chip); }
  if (level.leaves) { const chip = el('span', 'goal-chip'); chip.append(el('i', 'ico-leaf'), el('b', null, '掃落葉 × ' + level.leaves.goal)); box.append(chip); }
  if (level.gift?.length) { const chip = el('span', 'goal-chip bonus'); chip.append(el('i', 'ico-gift'), el('b', null, '禮物盒（驚喜）')); box.append(chip); }
  if (level.dust?.length) { const chip = el('span', 'goal-chip'); chip.append(el('i', 'ico-dust'), el('b', null, '清掉糖粉 × ' + level.dust.length)); box.append(chip); }
  return box;
}
// Until a finished-dessert illustration exists, plate the goal desserts.
function plate(level) {
  if (level.art) {
    // A slow or dropped download retries once, then falls back to the plated desserts (never a broken-image icon).
    const img = el('img'); img.alt = level.name;
    img.onerror = () => {
      if (!img.dataset.retried) { img.dataset.retried = '1'; setTimeout(() => { img.src = level.art + '?r=' + Date.now(); }, 600); }
      else img.replaceWith(platedDesserts(level));
    };
    img.src = level.art; return img;
  }
  return platedDesserts(level);
}
export function preloadArt(level) { if (level?.art) { const i = new Image(); i.src = level.art; } }
function platedDesserts(level) {
  const p = el('div', 'taste-plate'); const types = Object.keys(level.goals).map(Number);
  types.forEach((t, k) => { const i = icon(t); i.style.setProperty('--k', k); i.style.setProperty('--n', types.length); p.append(i); });
  return p;
}

export function renderMenu(chapters, saved, { onPick, onFree, onStory }) {
  const list = $('menu-levels'); list.replaceChildren();
  for (const chapter of chapters) {
    list.append(el('h3', 'menu-chapter', chapter.title));
    const ci = chapters.indexOf(chapter), prevLast = ci > 0 ? chapters[ci - 1].levels.at(-1) : null;
    chapter.levels.forEach((level, k) => {
      const stars = saved[level.id] || 0, unlocked = !!window.__CAKE_UNLOCK_ALL__ || stars > 0 || (k === 0 ? (!prevLast || saved[prevLast.id] > 0) : saved[chapter.levels[k - 1].id] > 0);
      const card = el('button', 'menu-card' + (stars ? ' done' : '')); card.type = 'button'; card.disabled = !unlocked;
      // The finished dessert's picture shows once it has been made (in the 全開版 preview, always).
      const shown = stars || window.__CAKE_UNLOCK_ALL__;
      const art = el('span', 'menu-art'); if (shown) art.append(plate(level)); else art.append(el('span', 'menu-number', String(k + 1)));
      const copy = el('span', 'menu-copy'); copy.append(el('b', null, unlocked ? level.name : '？？？'), unlocked ? (() => { const s = el('span', 'menu-stars'); s.append(starIcons(stars)); return s; })() : el('span', 'menu-stars', k === 0 ? '完成上一章後解鎖' : '完成上一款後解鎖'));
      card.append(art, copy); card.addEventListener('click', () => onPick(level, chapter)); list.append(card);
    });
  }
  if ($('menu-free')) $('menu-free').onclick = onFree;
  if (!$('menu-dialog').open) $('menu-dialog').showModal();
}

export function showLevelIntro(level, chapter, index, onStart, made = false) {
  // The dessert's own illustration. On a first try it is shown softly blurred with 「做做看就知道」, so the
  // clear picture stays the reward on the tasting card (made before, or 全開版: shown clearly).
  const art = $('level-art'); art.replaceChildren(plate(level));
  art.classList.toggle('teaser', !!level.art && !(made || window.__CAKE_UNLOCK_ALL__));
  $('level-kicker').textContent = level.kicker || (level.easy ? `${chapter.title} · 品嚐故事` : `${chapter.title} · 第 ${index + 1} 款`);
  $('level-title').textContent = level.name;
  $('level-lines').replaceChildren(...level.intro.map(line));
  $('level-goals').replaceChildren(goalChips(level));
  if (level.rule || level.easy) $('level-rule').textContent = level.rule || '不限步數 · 慢慢做就好';
  else $('level-rule').replaceChildren(`不限步數 · ${level.stars[0]} 步內 `, starIcons(3, 3, 'tiny'), ` · ${level.stars[1]} 步內 `, starIcons(2, 2, 'tiny'));
  $('level-back').textContent = level.backLabel || (level.easy ? '回品嚐故事' : '回甜點筆記');
  $('level-start').onclick = () => { $('level-dialog').close(); onStart(); };
  $('level-dialog').showModal(); fitLevelCard();
}
// On a short screen (Safari's bars take ~200px) the goals and rule slid under the docked 開始試做 button.
// Shrink the picture just enough that the whole card fits, down to a slim banner; past that the card scrolls.
function fitLevelCard() {
  const art = $('level-art'); art.style.height = '';
  const dock = document.querySelector('#level-dialog .ui-dock'), rule = $('level-rule');
  if (!dock || !rule) return;
  const over = rule.getBoundingClientRect().bottom + 8 - dock.getBoundingClientRect().top;
  if (over > 0) art.style.height = Math.max(72, art.offsetHeight - over) + 'px';
}

export function renderHud(level, need, bloomLeft, moves, frostLeft = 0, dustLeft = 0, extra = null) {
  const hud = $('recipe-hud'); if (!level) { hud.hidden = true; document.querySelector('.idea-progress').hidden = false; return; }
  hud.hidden = false; document.querySelector('.idea-progress').hidden = true;
  const chips = [];
  for (const [type, n] of Object.entries(level.goals)) {
    const left = Math.max(0, need[type]), chip = el('span', 'hud-chip' + (left ? '' : ' met'));
    chip.append(icon(Number(type)), el('b', null, left ? String(left) : '✓')); chip.setAttribute('aria-label', `${DESSERTS[type].name}還差 ${left} 個`); chips.push(chip);
  }
  if (level.bloom) { const chip = el('span', 'hud-chip bloom' + (bloomLeft > 0 ? '' : ' met')); chip.append(el('i', null, '✿'), el('b', null, bloomLeft > 0 ? String(bloomLeft) : '✓')); chip.setAttribute('aria-label', `還要開花 ${Math.max(0, bloomLeft)} 次`); chips.push(chip); }
  if (level.frost?.length) { const chip = el('span', 'hud-chip' + (frostLeft ? '' : ' met')); chip.append(el('i', 'ico-frost'), el('b', null, frostLeft ? String(frostLeft) : '✓')); chip.setAttribute('aria-label', `還有 ${frostLeft} 個糖霜`); chips.push(chip); }
  if (level.dust?.length) { const chip = el('span', 'hud-chip' + (dustLeft ? '' : ' met')); chip.append(el('i', 'ico-dust'), el('b', null, dustLeft ? String(dustLeft) : '✓')); chip.setAttribute('aria-label', `還有 ${dustLeft} 格糖粉`); chips.push(chip); }
  const addChip = (cls, left, label) => { const chip = el('span', 'hud-chip' + (left ? '' : ' met')); chip.append(el('i', cls), el('b', null, left ? String(left) : '✓')); chip.setAttribute('aria-label', label); chips.push(chip); };
  if (level.burr?.length) { addChip('ico-burr', frostLeft, `還有 ${frostLeft} 個栗子殼`); }
  if (level.buds?.length) addChip('ico-bud', extra?.buds || 0, `還有 ${extra?.buds || 0} 個花苞`);
  if (level.mango) addChip('ico-mango', extra?.mango || 0, `還要送 ${extra?.mango || 0} 顆芒果`);
  if (level.leaves) addChip('ico-leaf', extra?.leaves || 0, `還要掃 ${extra?.leaves || 0} 片落葉`);
  if (level.limit) { // limited dessert: moves left, warm red when five or fewer remain
    const left = Math.max(0, level.limit - moves), meta = el('span', 'hud-moves limit' + (left <= 5 ? ' low' : ''));
    meta.append(el('small', null, '剩'), el('b', null, String(left)), el('small', null, '步')); meta.setAttribute('aria-label', `還剩 ${left} 步`);
    hud.classList.toggle('dense', chips.length > 4); hud.replaceChildren(el('span', 'hud-goals'), meta); hud.firstChild.append(...chips); fitHud(hud, chips.length); return;
  }
  const meta = el('span', 'hud-moves'); meta.append(el('b', null, String(moves)), (() => { const sm = el('small', null, '步'); if (!(chips.length > 5 || level.easy || !level.stars)) { sm.append(' · '); sm.append(starIcons(starsFor(level, moves), 3, 'tiny')); } return sm; })());
  hud.classList.toggle('dense', chips.length > 4);
  hud.replaceChildren(el('span', 'hud-goals'), meta); hud.firstChild.append(...chips); fitHud(hud, chips.length);
}

// Many goals (late 無限靈感筆記 desserts can have 8-10) don't fit as framed chips beside the move count:
// switch to icons with a small number badge ('tight'), and smaller still ('tighter') if they still overflow.
function fitHud(hud, count) {
  hud.classList.remove('tight', 'tighter');
  const goals = hud.firstChild, over = () => goals.scrollWidth > goals.clientWidth + 1;
  if (count >= 7 || over()) hud.classList.add('tight');
  if (hud.classList.contains('tight') && (count >= 10 || over())) hud.classList.add('tighter');
}

export function showTasting(level, stars, moves, best, { onNext, onMenu, custom }) {
  $('taste-art').replaceChildren(plate(level));
  $('taste-title').textContent = level.name;
  if (custom || level.easy) $('taste-stars').textContent = custom ? custom.headline : ''; else $('taste-stars').replaceChildren(starIcons(stars, 3, 'big'));
  $('taste-moves').textContent = custom ? custom.detail : level.easy ? `${moves} 步完成 · 好吃！` : `${moves} 步完成${best > stars ? `（最佳 ${best} 顆星）` : stars === 3 ? ' · 滿分！' : ''}`;
  $('taste-menu').textContent = custom?.menuLabel || (level.easy ? '繼續' : '甜點筆記');
  $('taste-next').textContent = custom?.nextLabel || '下一款';
  $('taste-lines').replaceChildren(...(custom?.lines || level.taste).map(line));
  $('taste-next').hidden = !onNext; $('taste-menu').classList.toggle('solo', !onNext); /* one button left: the red one */ $('taste-next').onclick = () => { $('taste-dialog').close(); onNext ? onNext() : onMenu(); };
  $('taste-menu').onclick = () => { $('taste-dialog').close(); onMenu(); };
  $('taste-dialog').showModal();
}

// A short story beat between levels: season opening, mid-season interlude, or the finale.
// scene: { kicker, title, lines, art? }
export function showScene(scene, onClose, button = '繼續') {
  $('chapter-alt').hidden = true;
  $('chapter-title').textContent = scene.title; $('chapter-kicker').textContent = scene.kicker || '';
  $('chapter-lines').replaceChildren(...scene.lines.map(line));
  $('chapter-art').hidden = !scene.art; if (scene.art) $('chapter-art').querySelector('img').src = scene.art;
  $('chapter-close').textContent = button;
  $('chapter-close').onclick = () => { $('chapter-dialog').close(); onClose(); };
  $('chapter-dialog').showModal();
}

export function showChapterEnd(chapter, onClose) {
  $('chapter-alt').hidden = true;
  $('chapter-close').textContent = '回到甜點筆記';
  $('chapter-title').textContent = chapter.end.title; $('chapter-kicker').textContent = chapter.title + ' · 完成';
  $('chapter-lines').replaceChildren(...chapter.end.lines.map(line));
  $('chapter-art').hidden = !chapter.art; if (chapter.art) $('chapter-art').querySelector('img').src = chapter.art;
  $('chapter-close').onclick = () => { $('chapter-dialog').close(); onClose(); };
  $('chapter-dialog').showModal();
}

// One album for every story scene: the opening, the three story pages and each season's ending.
// It opens on a wall of snapshots pinned at different angles; tapping one flies it to the centre,
// full width, with the scene's words underneath (swipe for the next one, tap the picture for a big
// sideways view). × or back returns the photo to its place on the wall.
// entries: [{ img, kicker, label, title, scene?, lines, unlocked, lockHint }]
// The wall is a tidy two-column board, grouped by chapter of the story (序章 / 四季 / 終章),
// each snapshot tilted a little; it scrolls when the phone is short. A portrait photo spans the board.
const WALL_TILT = [-3, 2.5, 2, -2.5, -2, 3, 2.5, -3, 1.5];
const WALL_GROUPS = { prologue: '序章・那天的午後', finale: '終章' }; // seasons use their chapter title
const tilt = k => WALL_TILT[k % WALL_TILT.length];
const flightMs = () => matchMedia('(prefers-reduced-motion: reduce)').matches || window.__CAKE_TEST_FAST__ ? 0 : 460;
function fly(dialog, src, srcRot, dst, dstRot) {
  const ms = flightMs(); if (!ms || dst.closest('.locked')) return Promise.resolve();
  const a = src.getBoundingClientRect(), b = dst.getBoundingClientRect();
  const w = dst.offsetWidth, h = dst.offsetHeight; if (!w || !src.offsetWidth) return Promise.resolve();
  const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  const clone = el('img', 'av-flying'); clone.src = dst.currentSrc || dst.src; clone.alt = '';
  Object.assign(clone.style, { left: cx - w / 2 + 'px', top: cy - h / 2 + 'px', width: w + 'px', height: h + 'px' });
  dialog.append(clone);
  const from = `translate(${a.left + a.width / 2 - cx}px,${a.top + a.height / 2 - cy}px) rotate(${srcRot}deg) scale(${src.offsetWidth / w})`;
  const run = clone.animate([{ transform: from }, { transform: `rotate(${dstRot}deg)` }], { duration: ms, easing: 'cubic-bezier(.2,.75,.25,1)' });
  return run.finished.catch(() => {}).then(() => clone.remove());
}
// music: { tunes: [{ key, name, season, heard, playing, hint }], onPlay(key) } — the 音樂盒 tab: every tune heard so far.
export function showAlbum(entries, onClose, start = -1, music = null) {
  const track = $('album-track'), dots = $('album-dots'), dialog = $('album-dialog'), wall = $('album-wall-photos');
  const showTab = which => {
    const onMusic = which === 'music' && !!music;
    $('album-tab-photos').classList.toggle('on', !onMusic); $('album-tab-music').classList.toggle('on', onMusic);
    $('album-tab-photos').setAttribute('aria-selected', String(!onMusic)); $('album-tab-music').setAttribute('aria-selected', String(onMusic));
    wall.hidden = onMusic; $('album-music').hidden = !onMusic; dialog.classList.toggle('music', onMusic);
    if (onMusic) drawMusic(); else update();
  };
  const drawMusic = () => {
    const seasons = ['春', '夏', '秋', '冬', '終章'], tunes = [...music.tunes].sort((a, b) => a.season - b.season || a.hidden - b.hidden);
    $('album-music-count').textContent = `收藏了 ${tunes.filter(t => t.heard).length} / ${tunes.length} 首・點一下播放`;
    $('album-count').textContent = '';
    $('album-music-list').replaceChildren(...tunes.map(t => {
      const row = el('button', 'av-tune' + (t.heard ? '' : ' locked') + (t.playing ? ' playing' : '')); row.type = 'button'; row.disabled = !t.heard;
      const badge = el('span', 'av-tune-badge');
      // Heard tunes show their cover (a note over it while playing); locked ones only the lock.
      if (t.heard && t.cover) { const art = el('img', 'av-tune-cover'); art.src = t.cover; art.alt = ''; art.decoding = 'async'; badge.append(art); badge.classList.add('art'); }
      if (t.playing) badge.append(iconImg('assets/icon-note-v56.webp', 'ui-ico'));
      else if (!t.heard) badge.append(iconImg('assets/icon-lock-v56.webp', 'ui-ico'));
      else if (!t.cover) badge.append(document.createTextNode(seasons[t.season]));
      const copy = el('span', 'av-tune-copy'); copy.append(el('b', null, t.heard ? t.name : '？？？'), el('small', null, t.heard ? (t.playing ? '播放中' : `${seasons[t.season]}的旋律`) : t.hint));
      row.append(badge, copy);
      row.onclick = () => { music.onPlay(t.key); music.tunes.forEach(x => { x.playing = x.key === t.key; }); drawMusic(); };
      return row;
    }));
  };
  $('album-tab-photos').onclick = () => showTab('photos'); $('album-tab-music').onclick = () => showTab('music');
  $('album-tab-music').hidden = !music;
  track.replaceChildren(); dots.replaceChildren(); wall.replaceChildren();
  dialog.classList.remove('focused', 'photo-only');
  let current = -1, moving = false;
  const slideImg = k => track.children[k]?.querySelector('.av-pic img');
  const snaps = [];
  const wallImg = k => snaps[k]?.querySelector('img');
  let group = null, col = 0;
  entries.forEach((entry, k) => {
    if (entry.group && entry.group !== group) { group = entry.group; col = 0; wall.append(el('h3', 'av-group', entry.groupLabel || WALL_GROUPS[group] || '')); }
    const snap = el('button', 'av-snap' + (entry.unlocked ? '' : ' locked') + (entry.tall ? ' tall' : ''));
    snap.type = 'button'; snap.style.cssText = `--r:${tilt(k)}deg;--dy:${!entry.tall && col++ % 2 ? 14 : 0}px`;
    snaps.push(snap);
    snap.setAttribute('aria-label', entry.unlocked ? entry.label || entry.title : '尚未收藏的回憶');
    const shot = el('img'); shot.src = entry.thumb || entry.img; shot.alt = ''; shot.decoding = 'async'; snap.append(shot);
    if (!entry.unlocked) { const l = el('span', 'av-lock'); l.append(iconImg('assets/icon-lock-v56.webp')); snap.append(l); }
    snap.append(el('span', 'av-snap-label', entry.unlocked ? entry.label || entry.title : '？？？'));
    snap.addEventListener('click', () => focus(k));
    wall.append(snap);

    const slide = el('section', 'av-slide' + (entry.unlocked ? '' : ' locked') + (entry.tall ? ' tall' : ''));
    slide.style.setProperty('--img', `url("${entry.img}")`); slide.setAttribute('aria-label', entry.unlocked ? entry.title : '尚未收藏');
    const pic = el('div', 'av-pic'); const img = el('img'); img.src = entry.img; img.alt = entry.unlocked ? entry.title : ''; pic.append(img);
    if (!entry.unlocked) { const l = el('span', 'av-lock'); l.append(iconImg('assets/icon-lock-v56.webp')); pic.append(l); }
    pic.addEventListener('click', () => dialog.classList.toggle('photo-only'));
    const cap = el('div', 'av-caption');
    if (entry.unlocked) {
      cap.append(el('span', 'scene-kicker', entry.kicker), el('h2', null, entry.title));
      // A full-screen portrait photo (the finale) keeps the picture whole: its words play in the film.
      if (entry.scene && !entry.tall) cap.append(el('p', 'recipe-scene', entry.scene));
      if (!entry.tall) { const lines = el('div', 'av-lines'); lines.append(...entry.lines.map(line)); cap.append(lines); }
      if (entry.play) { const b = el('button', 'av-play'); b.append(iconImg('assets/icon-play-v56.webp'), document.createTextNode('再看一次終章')); b.onclick = () => { dialog.close(); dialog.classList.remove('focused', 'photo-only', 'flying'); entry.play(); }; cap.append(b); }
      if (!entry.tall) cap.append(el('p', 'av-tip', '點照片看大圖・左右滑動翻頁'));
    } else cap.append(el('span', 'scene-kicker', '尚未收藏'), el('h2', null, '？？？'), el('p', 'recipe-scene', entry.lockHint));
    slide.append(pic, cap); track.append(slide); dots.append(el('i'));
  });
  const kept = entries.filter(e => e.unlocked).length;
  const update = () => {
    if (!dialog.classList.contains('focused')) { $('album-count').textContent = `已收藏 ${kept} / ${entries.length}`; return; }
    current = Math.max(0, Math.min(entries.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
    $('album-count').textContent = `${current + 1} / ${entries.length}`;
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === current));
  };
  async function focus(k) {
    if (moving || dialog.classList.contains('focused')) return; moving = true;
    const from = snaps[k];
    dialog.classList.add('focused'); track.scrollLeft = k * track.clientWidth; current = k; update();
    const target = slideImg(k); await target.decode?.().catch(() => {});
    from.classList.add('away'); dialog.classList.add('flying');
    await fly(dialog, wallImg(k), tilt(k), target, 0);
    dialog.classList.remove('flying'); from.classList.remove('away'); moving = false;
  }
  async function backToWall() {
    if (moving) return; moving = true;
    const k = current, rotated = dialog.classList.contains('photo-only');
    const src = slideImg(k), to = snaps[k];
    // Measure the picture where it is now, then hand it back to its spot on the wall.
    const ghost = src && wallImg(k);
    dialog.classList.add('flying'); to?.classList.add('away');
    const flight = ghost ? flyBack(src, rotated ? 90 : 0, ghost, tilt(k)) : Promise.resolve();
    dialog.classList.remove('focused', 'photo-only'); update();
    await flight; dialog.classList.remove('flying'); to?.classList.remove('away'); moving = false;
  }
  // Same as fly(), but the source must be measured before the viewer is hidden.
  function flyBack(src, srcRot, dst, dstRot) {
    const ms = flightMs(); if (!ms || src.closest('.locked')) return Promise.resolve();
    const a = src.getBoundingClientRect(), sw = src.offsetWidth;
    return new Promise(resolve => requestAnimationFrame(() => {
      const b = dst.getBoundingClientRect(), w = dst.offsetWidth, h = dst.offsetHeight;
      if (!w || !sw) return resolve();
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const clone = el('img', 'av-flying'); clone.src = dst.currentSrc || dst.src; clone.alt = '';
      Object.assign(clone.style, { left: cx - w / 2 + 'px', top: cy - h / 2 + 'px', width: w + 'px', height: h + 'px' });
      dialog.append(clone);
      const from = `translate(${a.left + a.width / 2 - cx}px,${a.top + a.height / 2 - cy}px) rotate(${srcRot}deg) scale(${sw / w})`;
      clone.animate([{ transform: from }, { transform: `rotate(${dstRot}deg)` }], { duration: ms, easing: 'cubic-bezier(.3,.6,.25,1)' })
        .finished.catch(() => {}).then(() => { clone.remove(); resolve(); });
    }));
  }
  track.onscroll = () => requestAnimationFrame(update);
  const leave = () => { dialog.close(); dialog.classList.remove('focused', 'photo-only', 'flying', 'music'); onClose(); };
  $('album-close').onclick = () => { if (moving) return; dialog.classList.contains('focused') ? backToWall() : leave(); };
  $('album-close').setAttribute('aria-label', '關閉回憶相簿');
  dialog.oncancel = event => { event.preventDefault(); $('album-close').click(); };
  dialog.showModal(); showTab('photos');
  if (start >= 0) focus(start);
}

// The finale plays like a film's closing montage: full-screen portrait shots that cross-fade
// with a slow camera drift, subtitles fading in at the bottom, all on one timeline in seconds.
// With the ending theme playing, the timeline follows the music's own clock (so cuts stay on the
// beat); without sound it follows the wall clock. 略過 skips; after the end a tap returns.
// film: { kicker, title, end, shots: [{ img, at, cues: [s], lines: [[speaker, text]], shutter? }] }
export function showFilm(film, onClose, audio = null) {
  const dialog = $('film-dialog'), sub = $('film-sub'), stage = $('film-stage');
  const speed = window.__CAKE_TEST_FAST__ ? 40 : 1;
  const events = film.shots.flatMap((shot, s) => [{ at: shot.at, s, cut: true }, ...shot.lines.map((l, i) => ({ at: shot.cues[i], s, line: l }))]).sort((a, b) => a.at - b.at);
  stage.replaceChildren(...film.shots.map((shot, s) => { const img = el('img', 'film-img' + (s % 2 ? ' drift-out' : '')); img.src = shot.img; img.alt = ''; img.decoding = 'async'; return img; }));
  $('film-title').replaceChildren(el('span', null, film.kicker || ''), el('b', null, film.title));
  let next = 0, raf = 0, t0 = 0, useAudio = false, done = false;
  const clock = () => useAudio && !audio.paused ? audio.currentTime : (performance.now() - t0) / 1000 * speed;
  const fire = ev => {
    if (ev.cut) {
      [...stage.children].forEach((img, i) => img.classList.toggle('on', i === ev.s));
      sub.replaceChildren();
      if (film.shots[ev.s].shutter) { dialog.classList.add('flash'); setTimeout(() => dialog.classList.remove('flash'), 700); }
      return;
    }
    const [speaker, text] = ev.line, row = el('p', speaker === '旁白' ? 'narration' : null);
    if (speaker !== '旁白') row.append(el('small', null, speakerName(speaker)));
    row.append(el('span', null, speaker === '旁白' ? text : '「' + text + '」'));
    sub.replaceChildren(row); dialog.classList.remove('titled');
  };
  const tick = () => {
    const t = clock();
    while (next < events.length && events[next].at <= t) fire(events[next++]);
    if (t >= film.end && !done) { done = true; dialog.classList.add('ended'); sub.replaceChildren(); $('film-hint').textContent = '點一下回到甜點筆記'; $('film-hint').hidden = false; }
    raf = requestAnimationFrame(tick);
  };
  const finish = () => {
    cancelAnimationFrame(raf); dialog.close(); dialog.className = 'film-viewer';
    if (audio) { const fade = setInterval(() => { audio.volume = Math.max(0, audio.volume - .08); if (audio.volume <= 0) { clearInterval(fade); audio.pause(); } }, 60); }
    onClose();
  };
  const start = () => { if (raf) return; t0 = performance.now(); raf = requestAnimationFrame(tick); };
  dialog.className = 'film-viewer'; sub.replaceChildren(); $('film-hint').hidden = true; $('film-hint').textContent = '點一下回到甜點筆記';
  let waiting = false;
  dialog.onclick = event => {
    if (event.target.id === 'film-skip') return;
    if (waiting) { waiting = false; $('film-hint').hidden = true; audio.play().catch(() => start()); return; }
    if (done) finish();
  };
  $('film-skip').onclick = event => { event.stopPropagation(); finish(); };
  dialog.oncancel = event => { event.preventDefault(); finish(); };
  dialog.showModal(); requestAnimationFrame(() => dialog.classList.add('playing', 'titled'));
  if (audio) {
    // Follow the music once it is actually playing; if it can't start (blocked, slow), run silent.
    audio.addEventListener('playing', () => { useAudio = true; start(); }, { once: true });
    // Opened without a tap (e.g. straight from a link): the browser blocks sound until one.
    audio.play().catch(() => { waiting = true; $('film-hint').textContent = '點一下開始播放'; $('film-hint').hidden = false; });
    setTimeout(() => { if (!waiting && !useAudio) start(); }, 2500);
  } else start();
}

// 品嚐故事: four season cards, one after another.
export function renderEasy(entries, isDone, { onPick, onHome }) {
  const list = $('easy-levels'); list.replaceChildren();
  entries.forEach((entry, k) => {
    const done = isDone(k), unlocked = !!window.__CAKE_UNLOCK_ALL__ || done || k === 0 || isDone(k - 1);
    list.append(el('h3', 'menu-chapter', entry.chapter.title));
    const card = el('button', 'menu-card' + (done ? ' done' : '')); card.type = 'button'; card.disabled = !unlocked;
    const art = el('span', 'menu-art'); art.append(done ? plate(entry.level) : el('span', 'menu-number', entry.chapter.mark || entry.chapter.title[0]));
    const copy = el('span', 'menu-copy'); copy.append(el('b', null, unlocked ? entry.level.name : '？？？'), el('span', 'menu-stars', done ? '✓ 完成 · 可以再做一次' : unlocked ? (entry.level.tutorial ? '從這裡開始・學會怎麼玩' : '招牌甜點') : k === 1 ? '完成序章後解鎖' : '完成上一季後解鎖'));
    card.append(art, copy); card.addEventListener('click', () => onPick(entry)); list.append(card);
  });
  $('easy-home').onclick = onHome;
  if (!$('easy-dialog').open) $('easy-dialog').showModal();
}

// The two ways in. The notebook stays tied with her note until the story has been seen; the first time it
// opens, the note lifts away. While locked, a tap gives a little wiggle and her line.
export function renderModes({ easyDone, unlocked, celebrate, stars, maxStars, onEasy, onFull, onAlbum, onExit, inf, onInf, firstVisit }) {
  const dialog = $('mode-dialog'), full = $('mode-full');
  const seasons = ['春', '夏', '秋', '冬'];
  $('mode-easy-progress').replaceChildren(...seasons.map((t, k) => el('i', easyDone[k] ? 'on' : '', t)));
  $('mode-full-progress').textContent = !unlocked ? '' : stars >= maxStars ? `★ ${stars} / ${maxStars}・全部滿分` : `★ ${stars} / ${maxStars}・還差 ${maxStars - stars} 顆星`;
  const face = $('mode-note-face'); face.replaceChildren(createPortrait('苺香', 'wink'));
  full.classList.toggle('locked', !unlocked); full.classList.remove('opening');
  $('mode-hint').textContent = '';
  $('mode-easy').onclick = () => { dialog.close(); onEasy(); };
  full.onclick = () => {
    if (!full.classList.contains('locked')) { dialog.close(); onFull(); return; }
    full.classList.remove('wiggle'); void full.offsetWidth; full.classList.add('wiggle');
    $('mode-hint').textContent = easyDone.every(Boolean) ? '' : '先在「品嚐故事」把四季走一遍吧！';
  };
  $('mode-album').onclick = onAlbum;
  $('mode-exit').onclick = () => { dialog.close(); onExit(); };
  // 無限靈感筆記: appears once the notebook is open; sealed until all 24 notebook desserts are made.
  $('mode-easy').classList.toggle('suggest', !!firstVisit); // first visit: this is where to start
  if (firstVisit) $('mode-hint').textContent = '從「品嚐故事」開始吧！';
  const card = $('mode-inf'); card.hidden = !inf;
  if (inf) {
    card.classList.toggle('sealed', !inf.open); card.classList.toggle('new', !!inf.celebrate);
    $('mode-inf-title').textContent = inf.open ? '無限靈感筆記' : '？？？';
    $('mode-inf-sub').textContent = inf.open ? '想到哪做到哪・挑戰最高分' : unlocked ? '24 款都做過之後……' : '還有更多點子，等著妳……';
    $('mode-inf-progress').textContent = inf.open && inf.best ? `最高 ${inf.best.toLocaleString()} 分` : inf.open || !unlocked ? '' : `${inf.made} / 24`;
    card.onclick = () => {
      if (inf.open) { dialog.close(); onInf(); return; }
      card.classList.remove('wiggle'); void card.offsetWidth; card.classList.add('wiggle');
      $('mode-hint').textContent = unlocked ? '把甜點筆記的 24 款都做一次，就會打開喔。' : '先從「品嚐故事」開始吧！';
    };
    if (inf.celebrate) $('mode-hint').textContent = '新的筆記打開了！無限靈感筆記，想做多少就做多少。';
  }
  dialog.oncancel = event => event.preventDefault();
  if (!dialog.open) dialog.showModal();
  if (celebrate) {
    full.classList.add('locked');
    setTimeout(() => { full.classList.add('opening'); $('mode-hint').textContent = '甜點筆記打開了！24 款四季甜點等妳來做。'; }, window.__CAKE_TEST_FAST__ ? 0 : 700);
    setTimeout(() => full.classList.remove('locked', 'opening'), window.__CAKE_TEST_FAST__ ? 10 : 2100);
  }
}

// 無限靈感筆記 home: the current run, the records, and the way in.
const fmt = n => Number(n || 0).toLocaleString();
export function renderInfinite({ run, best, streak, played }, { onGo, onNew, onHome, onCollection }) {
  const box = $('inf-stats');
  const stat = (label, value, note) => { const d = el('div', 'inf-stat'); d.append(el('small', null, label), el('b', null, value)); if (note) d.append(el('span', null, note)); return d; };
  box.replaceChildren(
    stat('這一輪', run.n ? `${fmt(run.total)} 分` : '還沒開始', run.n ? `已完成 ${run.n} 款` : ''),
    stat('最高總分', best ? `${fmt(best)} 分` : '—'),
    stat('最多連續', streak ? `${streak} 款` : '—', played ? `累計做了 ${played} 款` : ''));
  $('inf-go').textContent = run.spec ? `繼續第 ${run.n + 1} 款` : run.n ? `做第 ${run.n + 1} 款` : '開始想點子';
  $('inf-new').hidden = !run.n && !run.spec;
  $('inf-go').onclick = () => { $('inf-dialog').close(); onGo(); };
  $('inf-new').onclick = onNew; $('inf-home').onclick = onHome; $('inf-collection').onclick = () => { $('inf-dialog').close(); onCollection(); };
  $('inf-dialog').oncancel = event => { event.preventDefault(); onHome(); };
  if (!$('inf-dialog').open) $('inf-dialog').showModal();
}

// 靈感收藏: every endless dessert made (best score each), and the tunes heard so far.
// desserts: [{ name, score, goals, season }] newest first; tunes: [{ key, name, season, heard, playing }]
export function showCollection({ desserts }, { onBack }) {
  const list = $('coll-list'), seasons = ['春', '夏', '秋', '冬'];
  $('coll-count').textContent = desserts.length ? `已收藏 ${desserts.length} 款` : '做完的甜點會收進這裡。';
  list.replaceChildren(...desserts.map(d => {
    const row = el('div', 'menu-card done coll-card'), art = el('span', 'menu-art');
    if (d.thumb) { const i = el('img'); i.src = d.thumb; i.alt = ''; art.append(i); } else art.append(platedDesserts(d));
    const copy = el('span', 'menu-copy'); copy.append(el('b', null, d.name), el('span', 'menu-stars', `${seasons[d.season] || ''} · 最高 ${fmt(d.score)} 分`));
    row.append(art, copy); return row;
  }));
  $('coll-back').onclick = () => { $('coll-dialog').close(); onBack(); };
  $('coll-dialog').oncancel = event => { event.preventDefault(); $('coll-back').click(); };
  if (!$('coll-dialog').open) $('coll-dialog').showModal();
}
