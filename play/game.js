import { SIZE, makeBoard, findGroups, moves, clearPlan, swapPlan, refill, reshuffle, adjacent } from './engine.js';
import { GOALS as FREE_GOALS, PAGES, ART, INTRO, TUTORIAL, TALK, RECIPE_CHAPTERS, DESSERTS, FINALE, EASY, TRACKS, SEASON_TRACK, INFINITE, TIPS } from './content.js';
import { makeDessert, dessertScore, nextSeason, fill, moveLimit } from './infinite.js';
import { renderMenu, showLevelIntro, renderHud, showTasting, showChapterEnd, starsFor, preloadArt, showAlbum, showScene, showFilm, renderEasy, renderModes, renderInfinite, showCollection } from './recipe-ui.js';
import { piece } from './engine.js';
import { renderBoard, renderStats, renderComment, createPortrait, setOwnerNamed, speakerName, createPiece } from './view.js';
import {prepareBirth,birthAudioSource} from './birth-fx.js';
import { createChimes } from './audio.js';
import { createComparisonAudio } from './comparison-audio.js';
import { createMusic } from './bgm.js';
import { animateSwap, animateClear, previewDrag, clearDrag, clearEffects, celebrateBirth } from './motion.js';

const $ = id => document.getElementById(id);
// List dialogs focus themselves when opened (not their first card), so no keyboard focus ring sits
// on a card as if it were already chosen; Tab still moves into the cards.
const nativeShowModal = HTMLDialogElement.prototype.showModal;
HTMLDialogElement.prototype.showModal = function () { nativeShowModal.call(this); if (this.hasAttribute('autofocus')) this.focus({ preventScroll: true }); };
const RECORD_KEY = window.__CAKE_RECORD_KEY__ || 'mimi-cake-inspiration-v1'; // the installed 全開版 keeps its own save
let record = { best: 0, completed: false, sound: true, recipes: {}, chapters: {}, inf: null };
try { record = { ...record, ...JSON.parse(localStorage.getItem(RECORD_KEY) || '{}') }; } catch {}
record.best = Number.isFinite(record.best) && record.best >= 0 ? record.best : 0;
// 無限靈感筆記: run = the current endless run (spec = the dessert in progress, replayed from its start on return);
// played = desserts ever made there (new tunes appear at 3, 6, 9, 12); heard = tunes heard anywhere.
const freshInf = () => ({ run: { n: 0, total: 0, season: -1, spec: null, track: null }, best: 0, streak: 0, played: 0, bestDessert: 0, heard: [], collection: {} });
record.inf = { ...freshInf(), ...(record.inf && typeof record.inf === 'object' ? record.inf : {}) };
// 全開版 (preview build): everything unlocked, starts at the notebook; stars still earned normally.
if (window.__CAKE_UNLOCK_ALL__) record.completed = true;
// First visit follows the story path with a guided start; ?tutorial=1 / 0 forces it for testing.
const tutorialParam = new URLSearchParams(location.search).get('tutorial');
const wantsTutorial = () => tutorialParam === '1' || (tutorialParam !== '0' && !record.completed);
let guide = null, refillRandom = Math.random, GOALS = FREE_GOALS;
// Normal mode: { level, chapter, index, need: {type: left}, bloom: left } while trying a recipe.
let recipe = null;
let board = openingBoard(), score = 0, selected = -1, focused = 0, busy = false, chapter = 0, epoch = 0, turns = 0;
let pendingChapters = [], pointer = null, queuedInput = null, ignoreClickUntil = 0, hintTimer, toastTimer;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CROSS_HOLD = 1500; // ms from the clear's start; the 2.4s Flow beams are near full spread here
const delay = ms => new Promise(resolve => setTimeout(resolve, window.__CAKE_TEST_FAST__ || reduceMotion ? 2 : ms));
// Progress is kept in the browser AND, on the private Claude page, in the viewer's own cloud save
// (the phone app's browser storage is not reliable). Saves merge: stars only go up.
let cloud = null, cloudTimer = 0;
const save = () => {
  try { localStorage.setItem(RECORD_KEY, JSON.stringify(record)); } catch {}
  if (cloud) { clearTimeout(cloudTimer); cloudTimer = setTimeout(() => cloud.set({ record: JSON.stringify(record), at: Date.now() }).catch(() => {}), 400); }
};
function mergeRecord(other) {
  if (!other || typeof other !== 'object') return false;
  let changed = false;
  if (other.completed && !record.completed) { record.completed = true; changed = true; }
  if (Number(other.best) > record.best) { record.best = Number(other.best); changed = true; }
  for (const key of ['recipes', 'chapters']) for (const [id, v] of Object.entries(other[key] || {})) {
    const mine = record[key][id];
    if (key === 'recipes' ? Number(v) > (mine || 0) : v && !mine) { record[key][id] = key === 'recipes' ? Number(v) : true; changed = true; }
  }
  const o = other.inf, me = record.inf;
  if (o && typeof o === 'object') {
    for (const k of ['best', 'streak', 'played', 'bestDessert']) if (Number(o[k]) > me[k]) { me[k] = Number(o[k]); changed = true; }
    for (const t of o.heard || []) if (!me.heard.includes(t)) { me.heard.push(t); changed = true; }
    for (const [name, d] of Object.entries(o.collection || {})) if (!me.collection[name] || d.score > me.collection[name].score) { me.collection[name] = d; changed = true; }
    if (o.run && (o.run.n > me.run.n || (o.run.n === me.run.n && o.run.spec && !me.run.spec))) { me.run = o.run; changed = true; }
  }
  return changed;
}
async function connectCloud() {
  try {
    const [db, user] = await Promise.all([window.claude?.use?.('db'), window.claude?.use?.('user')]);
    const uid = db && user && await user.id(); if (!uid) return;
    cloud = db.doc('data/users/' + uid + '/progress');
    const snap = await cloud.get();
    let stored = null; try { stored = snap.exists ? JSON.parse(snap.data().record) : null; } catch {}
    const before = record.completed;
    if (mergeRecord(stored)) {
      // Cloud save knew more: a player who already finished the story goes straight to the notebook.
      if (!before && record.completed && !busy && !recipe && $('intro-dialog').open && !$('start').dataset.started) { guide = null; $('intro-dialog').close(); render(); openHub(); }
      else if ($('menu-dialog').open) openMenu();
      else if ($('mode-dialog').open) openHub();
      updateUI();
    }
    save();
  } catch {}
}
const hasDialog = () => !!document.querySelector('dialog[open]');
const announce = message => { $('announcer').textContent = message; };

// One AudioContext for every sound (iOS handles a single context far better when the app is sent to the background).
let sharedAudio = null;
const contextFactory = () => sharedAudio ||= new (window.AudioContext || window.webkitAudioContext)();
const sound = createChimes(() => record.sound && !document.hidden, { contextFactory });
const flowSound=createComparisonAudio(()=>record.sound&&!document.hidden,{versions:['flow'],contextFactory});
const birthSound=createComparisonAudio(()=>record.sound&&!document.hidden,{versions:['flow'],sources:{'birth-flow':birthAudioSource},contextFactory});
// Start loading in a user gesture; a missing asset must never delay a move.
const music=createMusic(()=>record.sound&&!document.hidden,{contextFactory});
// Every tune heard anywhere is remembered for the 靈感收藏 tune list.
function playTune(key, fromTop = true, opts) {
  if (!record.inf.heard.includes(key)) { record.inf.heard.push(key); save(); }
  return music.play(key, fromTop, opts);
}
const prepareFlow=()=>{void music.sync();void prepareBirth();if(record.sound)try{void flowSound.ready().catch(()=>{});void birthSound.ready().catch(()=>{});}catch{}};
function playFlow(effect){try{return flowSound.play(effect,'flow')>0;}catch{return false;}}

function openingBoard() {
  if (Array.isArray(window.__CAKE_TEST_BOARD__)) { guide = null; return window.__CAKE_TEST_BOARD__.map(([type, special]) => piece(type, special || null)); } // QA only
  // Guided openings: 序章 (TUTORIAL) and the story seasons with a guide (EASY[].guide) start on a fixed
  // board, and the refill queue makes the falls after the guided moves exactly what the guide expects.
  const plan = recipe?.level.tutorial ? TUTORIAL : recipe?.level.guide;
  if (plan) {
    const b = guidedBoard(plan);
    for (const i of recipe.level.mango?.at || []) b[i] = { ...piece(-1), item: 'mango' };
    if (recipe.level.mango) recipe.mangoSpawned = recipe.level.mango.at.length;
    return b;
  }
  if (recipe) {
    guide = null; refillRandom = Math.random; GOALS = FREE_GOALS;
    for (let attempt = 0; attempt < 40; attempt++) {
      const L = recipe.level, b = makeBoard();
      for (const i of L.frost || []) b[i] = { ...b[i], frost: 1, frostKind: 'glaze' };
      for (const i of L.burr || []) b[i] = { ...b[i], frost: 2, frostKind: 'burr' };
      for (const i of L.gift || []) b[i] = { ...b[i], frost: 1, frostKind: 'gift' };
      for (const i of L.mango?.at || []) b[i] = { ...piece(-1), item: 'mango' };
      if (L.mango) recipe.mangoSpawned = L.mango.at.length;
      for (const sp of L.start || []) if (b[sp.at] && !b[sp.at].frost && !b[sp.at].item) b[sp.at] = piece(b[sp.at].type, sp.special);
      if (moves(b).length >= 3) return b;
    }
    return makeBoard();
  }
  if (!wantsTutorial()) { guide = null; refillRandom = Math.random; GOALS = FREE_GOALS; return startingBoard(); }
  GOALS = TUTORIAL.goals; // the story path is a short visit; free play keeps the longer pacing
  const queue = [...TUTORIAL.refill];
  guide = { step: 0, plan: TUTORIAL }; refillRandom = () => queue.length ? (queue.shift() + .5) / 7 : Math.random();
  return TUTORIAL.board.map(type => piece(type));
}

// A guided part's fixed tray (with any special already on it) and its refill queue.
function guidedBoard(plan) {
  const queue = [...plan.refill]; guide = { step: 0, plan };
  refillRandom = () => queue.length ? (queue.shift() + .5) / 7 : Math.random();
  return plan.board.map((type, i) => piece(type, plan.specials?.[i] || null));
}
// 序章's next part starts on a fresh tray once the story page between the parts is closed — or, when no
// page sits between them (C → D), a moment after the part ends, as part of the same go.
function nextPartSoon() {
  const part = pendingPart; if (!part || pendingChapters.length) return;
  const go = () => { if (pendingPart !== part) return; if (busy) return setTimeout(go, 200); void startPart(part); };
  setTimeout(go, window.__CAKE_TEST_FAST__ ? 0 : 1800);
}
let pendingPart = null;
async function startPart(plan) {
  pendingPart = null; board = guidedBoard(plan); selected = -1;
  clearTimeout(toastTimer); $('board-toast').classList.remove('visible');
  const dropping = render(new Map(board.map(p => [p.id, SIZE])), 'fall'); showGuide(); await dropping; // the new tray drops in, already pointing at the move
  // The landing squash cancels the hint bounce on the icons; start it again once they have settled.
  await delay(650); if (guide?.plan === plan && guide.step === 0 && !busy) showGuide(true);
}
const isGuidedSwap = (a, b) => { const [x, y] = guide.plan.steps[guide.step].swap; return (a === x && b === y) || (a === y && b === x); };
function showGuide(quiet = false) {
  document.querySelectorAll('.guided').forEach(x => x.classList.remove('guided'));
  if (!guide) return;
  void $('board').offsetWidth; // a fresh bounce even if the same tiles were pointed at before
  const plan = guide.plan, step = plan.steps[guide.step];
  if (!step) {
    guide = null; talk(plan.done.talk, true); $('game-status').textContent = plan.done.status;
    if (recipe?.level.tutorial && plan.page !== undefined && !recipe.pages.has(plan.page)) { recipe.pages.add(plan.page); pendingChapters.push(plan.page); }
    if (recipe?.level.tutorial && plan.next) pendingPart = plan.next;
    return;
  }
  for (const i of step.swap) $('board').children[i]?.classList.add('guided');
  if (!quiet) talk(step.talk, true); $('game-status').textContent = step.status;
}

function startingBoard() {
  const initial = makeBoard();
  // Put the gift on a matchable interior cell, so the first hint can demonstrate it.
  const candidates = moves(initial).flatMap(([a,b]) => swapPlan(initial,a,b).groups.flatMap(group =>
    [...group.cells].map(target => ({a,b,target,distance:Math.abs(Math.floor(target/SIZE)-3.5)+Math.abs(target%SIZE-3.5)}))
  )).sort((a,b)=>a.distance-b.distance);
  const {a,b,target} = candidates[0];
  const source = target === a ? b : target === b ? a : target;
  // Rename two food types uniformly: all existing match/move relationships remain.
  // This iteration's opening gift lets the player try the new custard immediately.
  const giftType = initial[source].type;
  for (const p of initial) p.type = p.type === giftType ? 1 : p.type === 1 ? giftType : p.type;
  initial[source] = { ...initial[source], special: 'flame' };
  return initial;
}

function toast(message, duration = 900) {
  clearTimeout(toastTimer); $('board-toast').textContent = message; $('board-toast').classList.add('visible');
  toastTimer = setTimeout(() => $('board-toast').classList.remove('visible'), duration);
}

// After the spring promise (end of 春), the shop owner is called by her name, 苺香.
const named = () => !!(window.__CAKE_UNLOCK_ALL__ || record.chapters?.ch1 || record.chapters?.['easy:ch1']);
setOwnerNamed(named);
const comment = (name, ...rest) => renderComment(name, ...rest);
// Story beats seen once: 'open:<chapter>', 'mid:<chapter>', 'finale' (kept with chapter progress, cloud-merged).
const seen = key => !!record.chapters[key];
const mark = key => { record.chapters[key] = true; save(); };
const finalePending = () => RECIPE_CHAPTERS.every(c => record.chapters[c.id]) && !seen('finale');
function showFinale(then) {
  mark('finale');
  // The ending theme replaces the shop music for the finale, then the shop music comes back.
  let theme = null;
  if (record.sound && FINALE.music) { theme = new Audio(FINALE.music); theme.volume = .9; music.pause(); }
  showFilm(FINALE, () => { void music.sync(); then(); }, theme);
}
function endChapter(chapter) {
  showChapterEnd(chapter, () => finalePending() ? showFinale(openMenu) : openMenu());
  if (finalePending()) $('chapter-close').textContent = '繼續';
}
function withMid(level, chapter, then) {
  return () => {
    const mid = chapter.mid;
    if (!mid || mid.after !== level.id || seen('mid:' + chapter.id)) return then();
    mark('mid:' + chapter.id); showScene({ kicker: chapter.title + ' · 插曲', ...mid }, then);
  };
}
// Two-line exchanges play out like a conversation; a newer moment replaces an unfinished one.
let talkTimer = 0, talking = false;
const used = new Map();
// Lines play one after another on a timer. Guided tutorial lines (manual) wait instead: a ▼ shows there is
// more, a tap on the bubble moves on, and the last line stays until the step is done.
let talkQueue = [];
function talk(lines, manual = false) {
  clearTimeout(talkTimer); const [first, ...rest] = lines; talkQueue = [];
  document.querySelector('.conversation').classList.remove('more');
  if (!first) { talking = false; return; }
  talking = true; comment(...first);
  if (manual) { talkQueue = rest; document.querySelector('.conversation').classList.toggle('more', rest.length > 0); if (!rest.length) talking = false; return; }
  talkTimer = setTimeout(() => rest.length ? talk(rest) : (talking = false), rest.length ? 1900 : 2600);
}
// Tap the bubble: next line; on the last line of a guided step, hear the step again from the start.
document.querySelector('.conversation').addEventListener('click', () => {
  if (talkQueue.length) talk(talkQueue, true); else if (guide && !busy && !hasDialog()) showGuide();
});
function pick(key, list) { const n = used.get(key) ?? Math.floor(Math.random() * list.length); used.set(key, n + 1); return list[n % list.length]; }
function chatAfterTurn({ chain, made, fired, prism, cleared }) {
  if (prism) return talk(pick('prism', TALK.prism));
  if (fired.has('flame')) return talk(pick('flame', TALK.flame));
  if (fired.has('cross') || made.has('cross')) return talk(pick('cross', TALK.cross));
  if (chain >= 3) return talk(pick('chain', TALK.chain));
  if (made.has('flame')) return talk(pick('flameMade', TALK.flameMade));
  if (talking) return; // let a running exchange finish before small talk
  let top = -1, most = 0; cleared.forEach((n, type) => { if (n > most) { most = n; top = type; } });
  const winter = recipe?.chapter?.id === 'ch2';
  const autumn = recipe?.chapter?.id === 'cha';
  if (top >= 0) talk(winter ? pick('w' + top, TALK.winter[top]) : autumn ? pick('a' + top, TALK.autumn[top]) : pick('d' + top, TALK.desserts[top]));
}

function render(distances = new Map(), motion = 'none', onLand = () => {}, onBirth=celebrateBirth) {
  const settled = renderBoard(board, { selected, focused, distances, motion, onLand, onBirth, dust: recipe?.dust, buds: recipe?.buds, leaves: recipe?.leaves });
  markQueuedInput();
  updateUI();
  return settled;
}

function updateUI() {
  renderStats({ score, best: record.best, chapter, busy, sound: record.sound, goals: GOALS });
  if (recipe && !busy) syncFrost();
  renderHud(recipe?.level, recipe?.need, recipe?.bloom, turns, recipe?.frostLeft, recipe?.dust?.size, recipe && { buds: recipe.buds.size, mango: Math.max(0, (recipe.level.mango?.total || 0) - recipe.mangoGot), leaves: Math.max(0, (recipe.level.leaves?.goal || 0) - recipe.swept) });
  const title = recipe?.easy ? '品嚐故事' : recipe?.inf ? '無限靈感筆記' : recipe ? '甜點筆記' : '甜點靈感';
  if ($('mode-title').textContent !== title) { $('mode-title').textContent = title; $('mode-title').classList.toggle('long', title.length > 4); }
}

function select(index) {
  if (hasDialog()) return;
  if (busy) { queueSelection(index); return; }
  prepareFlow();clearHints(); focused = index;
  if (selected === index) { selected = -1; render(); return; }
  if (selected >= 0 && adjacent(selected, index)) { attempt(selected, index); return; }
  selected = index; render(); sound.effect('select');
  // A rainbow orb works by swapping it with a neighbour: light up the neighbours so a tap shows what to do.
  if (board[index]?.special === 'prism') {
    for (const n of [index - SIZE, index + SIZE, index % SIZE ? index - 1 : -1, index % SIZE < SIZE - 1 ? index + 1 : -1])
      if (n >= 0 && n < board.length && board[n] && !board[n].frost) $('board').children[n].classList.add('hinted');
    toast('和旁邊任一個甜點交換，就會消掉全部同款！', 1800);
    hintTimer = setTimeout(clearHints, 2600);
  }
}

function markQueuedInput() {
  const ids = queuedInput?.ids || [];
  for (const tile of $('board').children) tile.classList.toggle('queued', ids.includes(Number(tile.dataset.pieceId)));
}

function queueSelection(index) {
  if (!board[index] || $('board').children[index]?.classList.contains('clearing')) return;
  const previous = queuedInput?.kind === 'select' ? board.findIndex(p => p.id === queuedInput.ids[0]) : -1;
  queuedInput = previous >= 0 && previous !== index && adjacent(previous, index)
    ? { kind: 'swap', ids: [board[previous].id, board[index].id] }
    : { kind: 'select', ids: [board[index].id] };
  markQueuedInput(); sound.effect('select');
}

function drainQueuedInput() {
  const action = queuedInput; queuedInput = null; markQueuedInput();
  if (!action || hasDialog()) return;
  const indices = action.ids.map(id => board.findIndex(p => p.id === id));
  if (indices.some(index => index < 0)) return;
  if (action.kind === 'select') { selected = indices[0]; focused = selected; render(); }
  else if (adjacent(...indices)) void attempt(...indices);
}

async function attempt(a, b) {
  if (hasDialog() || !adjacent(a, b) || pendingPart) return false; // between 序章 parts the next tray is on its way
  if (busy) {
    if ([a,b].some(index => $('board').children[index]?.classList.contains('clearing'))) return false;
    queuedInput = { kind: 'swap', ids: [board[a].id, board[b].id] }; markQueuedInput(); sound.effect('select'); return false;
  }
  if (guide && !isGuidedSwap(a, b)) {
    const ticket = epoch; busy = true; selected = -1; render(); await animateSwap(a, b, false);
    if (ticket !== epoch) return false; busy = false;
    talk([guide.plan.nudge || TUTORIAL.nudge]); sound.effect('invalid'); render(); showGuide(true); return false;
  }
  const ticket = epoch; busy = true; selected = -1; focused = b; clearHints(); updateUI();
  const result = swapPlan(board, a, b);
  const prismOrigins = [a, b].filter(index => board[index].special === 'prism').map(index => index === a ? b : a);
  prepareFlow();sound.effect('swap');
  await animateSwap(a, b, !!result);
  if (ticket !== epoch) return false;
  if (!result) {
    $('game-status').textContent = '這兩個先留著，找找能湊成三個的甜點。';
    if (board[a]?.frost || board[b]?.frost) talk([board[a], board[b]].some(p => p?.frostKind === 'gift') ? TALK.giftLocked : [board[a], board[b]].some(p => p?.frostKind === 'burr') ? TALK.burrLocked : TALK.frosted); else if (!talking) talk(TALK.invalid);
    sound.effect('invalid');
    busy = false; render(); drainQueuedInput(); return false;
  }
  board = result.board; render();
  if (result.transform) { // rainbow orb × special: the whole kind turns into that special, then they all go off
    const { special, cells } = result.transform;
    for (const i of cells) board[i] = piece(board[i].type, special);
    toast(special === 'cross' ? '彩虹糖球 × 星光！' : '彩虹糖球 × 花瓣爆破！', 1300); sound([523, 784, 1047, 1318], .05);
    // The light birth ring for each (not the full petal-burst birth film, which is for one piece at a time).
    await render(new Map(), 'fall', () => {}, (i, p, node) => celebrateBirth(i, { ...p, special: 'cross' }, node));
    if (ticket !== epoch) return false;
    await delay(window.__CAKE_TEST_FAST__ ? 0 : 380); if (ticket !== epoch) return false;
  }
  let groups = result.groups, forced = result.forced, preferred = result.preferred, chain = 0, cleared = 0;
  if (!groups.length && !forced.length) { // a mango moved by hand: it may land in the bottom row
    if (!await collectMangos(ticket)) return false; groups = findGroups(board);
  }
  const made = new Set(), fired = new Set(), clearedTypes = new Map();
  try {
    while (groups.length || forced.length) {
      chain++;
      const plan = clearPlan(board, groups, preferred, forced);
      if (!plan.remove.size) break;
      const gained = plan.remove.size * 10 * Math.min(chain, 6) + plan.creations.size * 25;
      $('combo').textContent = ''; // One score cue at the clear location; no duplicate banner.
      for (const p of plan.creations.values()) made.add(p.special);
      for (const i of plan.triggered) fired.add(board[i].special);
      for (const i of plan.remove) if (board[i] && !board[i].special) clearedTypes.set(board[i].type, (clearedTypes.get(board[i].type) || 0) + 1);
      if (result.prism && chain === 1 && !result.transform) toast('彩虹糖球！');
      else if (plan.triggered.size || chain >= 2) { clearTimeout(toastTimer); $('board-toast').classList.remove('visible'); }
      else if (plan.creations.size) {
        const special = [...plan.creations.values()][0].special;
        toast(special === 'prism' ? '彩虹糖球 · 消掉同款' : special === 'cross' ? '星光 · 整行整列' : '花瓣爆破 · 周圍九格');
      }
      const createsFlower=[...plan.creations.values()].some(p=>p.special==='flame');
      const flowing=new Set();
      if(result.prism&&chain===1&&playFlow('prism'))flowing.add('prism');
      for(const effect of new Set([...plan.triggered].map(i=>board[i]?.special))){
        if(['flame','cross','prism'].includes(effect)&&!flowing.has(effect)&&playFlow(effect))flowing.add(effect);
      }
      if(flowing.size)music.duck(2.6);
      // Star cross: keep its row and column visibly empty while the light beams sweep, then refill.
      const clearStart = performance.now(), crossFired = [...plan.triggered].some(i => board[i]?.special === 'cross');
      await animateClear(board, plan, { prismOrigins: chain === 1 ? [...prismOrigins] : [], gained, chain, onPhase: (phase,level)=>{
        if(phase==='birth'&&createsFlower)return;
        if(phase==='prism'){if(!flowing.has('prism')){sound([523,659,784,1047],.05);sound.effect('match',level);}}
        else if(phase==='cross'){if(!flowing.has('cross')){sound([659,988,1318],.05);sound.effect('match',level);}}
        else if(!flowing.has('flame')||!['charge','impact'].includes(phase))sound.effect(phase,level);
      } });
      if (ticket !== epoch) return false;
      if (crossFired) { const wait = CROSS_HOLD - (performance.now() - clearStart); if (wait > 0) await delay(wait); if (ticket !== epoch) return false; }
      if (recipe) countRecipe(plan);
      score += gained; cleared += plan.remove.size;
      record.best = Math.max(record.best, score); save();
      // Mango: a match right beside it (left or right) squeezes it one row down (a clear below lets it fall anyway).
      const bumps = [];
      for (let m = 0; m < 56; m++) if (board[m]?.item && [m % SIZE ? m - 1 : -1, m % SIZE < SIZE - 1 ? m + 1 : -1].some(j => j >= 0 && plan.remove.has(j)) && !plan.remove.has(m + SIZE) && !board[m + SIZE]?.frost) bumps.push(m);
      for (const i of plan.remove) board[i] = null;
      for (const [i, p] of plan.creations) board[i] = p;
      for (const m of bumps) [board[m], board[m + SIZE]] = [board[m + SIZE], board[m]];
      for (const i of plan.unfrost || []) {
        const p = board[i]; if (!p) continue;
        if (p.frostKind === 'gift') { const r = Math.random(); board[i] = piece(p.type, r < .06 ? 'prism' : r < .45 ? 'cross' : 'flame'); if (recipe) recipe.giftNews = true; toast('禮物打開了！', 1000); }
        else board[i] = { ...p, frost: p.frost - 1 };
      }
      const before = new Set(board.filter(Boolean).map(p => p.id));
      const filled = refill(board, refillRandom); board = filled.board; spawnMango(before);
      await render(filled.distances, 'fall', () => {
        if (ticket === epoch) sound.effect('land', chain);
      },(index,p,node)=>{
        if(ticket!==epoch)return;const flow=celebrateBirth(index,p,node);
        if(p.special==='flame'){let played=false;if(flow)try{played=birthSound.play('birth','flow')>0;}catch{}if(played)music.duck(1.3);if(!played)sound.effect('birth',chain);}
      }); if (ticket !== epoch) return false;
      if (!await collectMangos(ticket)) return false;
      groups = findGroups(board); forced = []; preferred = [];
      if (chain >= 100) { board = makeBoard(); break; }
    }
    turns++;
    if (recipe?.level.leaves && turns % recipe.level.leaves.every === 0 && recipe.swept < recipe.level.leaves.goal) dropLeaf();
    if (!moves(board).length) {
      toast('換個角度想想！', 1200); $('game-status').textContent = '暫時沒有配對，把甜點重新排一下。';
      await delay(180); if (ticket !== epoch) return false;
      board = reshuffle(board); await render(new Map(), 'shuffle');
    }
    $('game-status').textContent = '慢慢來，好點子值得多想一下。';
    announce(`消除了 ${cleared} 個甜點，${chain} 次連鎖。目前 ${score} 分。`);
    if (guide) { guide.step++; showGuide(); }
    else if (recipe?.giftNews && !recipe.giftTalked) { recipe.giftNews = false; recipe.giftTalked = true; talk(TALK.giftOpen); }
    else if (recipe?.mangoNews && !recipe.mangoTalked) { recipe.mangoNews = false; recipe.mangoTalked = true; talk(TALK.mangoGot); }
    else if (recipe?.budNews && !recipe.budTalked) { recipe.budNews = false; recipe.budTalked = true; talk(TALK.budBloom); }
    else if (recipe?.leafNews && !recipe.leafTalked) { recipe.leafNews = false; recipe.leafTalked = true; talk(TALK.leafFall); }
    else if (recipe?.frostNews) { recipe.frostNews = false; talk(recipe.level.burr ? TALK.burrCrack : TALK.frostCrack); }
    else if (recipe && recipe.dustTalk !== true && recipe.level.dust && recipe.dust.size < recipe.level.dust.length) { recipe.dustTalk = true; talk(TALK.dustClear); }
    else chatAfterTurn({ chain, made, fired, prism: result.prism, cleared: clearedTypes });
    $('combo').textContent = '';
    if (!recipe) while (chapter < GOALS.length && score >= GOALS[chapter]) { pendingChapters.push(chapter); chapter++; }
    if (chapter === 3 && !record.completed) { record.completed = true; save(); window.dispatchEvent(new CustomEvent('mimi-easter-egg-complete', { detail: { id: 'cake-shop', score, recipe: '莓果布丁下午茶' } })); }
  } catch (error) {
    console.error(error); guide = null; refillRandom = Math.random; showGuide(); board = makeBoard(); $('game-status').textContent = '把點心桌整理好了，可以繼續想點子。';
  } finally {
    if (ticket === epoch) { busy = false; syncFrost(); render(); if (recipeDone()) finishRecipe(); else if (outOfMoves()) failInfinite(); else { nextPartSoon(); showNextChapter(); drainQueuedInput(); noteTips(boardTips()); } armIdle(); }
  }
  return true;
}

// ---- Normal mode「試做新甜點」 ----
// A mango in the bottom row is collected; the gap refills (which may bring a new mango from the top).
async function collectMangos(ticket) {
  while (recipe && board.slice(-8).some(p => p?.item)) {
    for (let i = 56; i < 64; i++) if (board[i]?.item) { board[i] = null; recipe.mangoGot++; sound.effect('note'); toast(recipe.mangoGot >= recipe.level.mango.total ? '芒果全部收齊了！' : '收到一顆芒果！', 1000); recipe.mangoNews = true; }
    updateUI(); await delay(260); if (ticket !== epoch) return false;
    const seen = new Set(board.filter(Boolean).map(p => p.id)); const again = refill(board, refillRandom); board = again.board; spawnMango(seen);
    await render(again.distances, 'fall'); if (ticket !== epoch) return false;
  }
  return true;
}

function countRecipe(plan) {
  for (const i of plan.remove) {
    const p = board[i]; if (!p || p.special === 'prism' || recipe.need[p.type] === undefined) continue;
    if (--recipe.need[p.type] === 0) toast(`${DESSERTS[p.type].name} 準備好了！`, 1100);
  }
  for (const i of plan.triggered) if (board[i]?.special === 'flame' && recipe.bloom > 0 && --recipe.bloom === 0) toast('靈感開花，擺盤完成！', 1100);
  if (plan.unfrost?.size && recipe.frostLeft > 0) { recipe.frostLeft = Math.max(0, recipe.frostLeft - plan.unfrost.size); if (!recipe.frostLeft) toast('糖霜全部敲開了！', 1100); else if (!recipe.frostTalked) { recipe.frostTalked = true; recipe.frostNews = true; } }
  if (recipe.dust?.size) { const before = recipe.dust.size; for (const i of plan.remove) recipe.dust.delete(i); if (before && !recipe.dust.size) toast('糖粉清乾淨了！', 1100); }
  for (const i of plan.remove) {
    if (recipe.buds.delete(i)) { recipe.budNews = true; blossomAt(i); if (!recipe.buds.size) toast('櫻花全部開了！', 1100); }
    if (recipe.leaves.delete(i)) { recipe.swept++; if (recipe.swept === recipe.level.leaves.goal) toast('落葉掃乾淨了！', 1100); }
  }
  updateUI();
}
const syncFrost = () => { if (recipe) recipe.frostLeft = board.filter(p => p?.frost && p.frostKind !== 'gift').length; };
// Summer mango: keep as many on the board as the level starts with, until the total has been dropped in.
function spawnMango(before) {
  const M = recipe?.level.mango; if (!M) return;
  const onBoard = board.filter(p => p?.item).length;
  if (onBoard >= M.at.length || recipe.mangoSpawned >= M.total) return;
  const fresh = [...Array(8).keys()].filter(i => board[i] && !before.has(board[i].id) && !board[i].special);
  if (!fresh.length) return;
  const i = fresh[Math.floor(Math.random() * fresh.length)]; board[i] = { ...board[i], type: -1, item: 'mango' }; recipe.mangoSpawned++;
}
// Autumn leaves drift onto the tray every few moves (never onto a leaf, a mango or a frosted piece).
function dropLeaf() {
  const L = recipe.level.leaves; if (recipe.leaves.size >= (L.cap || 10)) return;
  const free = [...Array(64).keys()].filter(i => !recipe.leaves.has(i) && !board[i]?.item && !board[i]?.frost);
  if (!free.length) return;
  recipe.leaves.add(free[Math.floor(Math.random() * free.length)]); recipe.leafNews = true; render();
}
function blossomAt(index) {
  const tile = $('board').children[index], fx = $('board-effects'); if (!tile || !fx || reduceMotion || window.__CAKE_TEST_FAST__) return;
  const a = tile.getBoundingClientRect(), b = fx.getBoundingClientRect(), img = document.createElement('img');
  img.className = 'blossom-pop'; img.src = 'assets/blossom-v45.webp'; img.alt = '';
  img.style.cssText = `left:${a.left - b.left + a.width / 2}px;top:${a.top - b.top + a.height / 2}px;width:${a.width * 1.1}px`;
  fx.append(img); setTimeout(() => img.remove(), 1100);
}
// 序章: PAGES[0] after part A, PAGES[1] after part B (each followed by the next part's tray); PAGES[2] is its ending.
let prologueEnding = false;
function finishPrologue() {
  mark('easy:pro'); if (!record.completed) { record.completed = true; save(); }
  sound([523, 659, 784, 1047]);
  window.dispatchEvent(new CustomEvent('mimi-easter-egg-complete', { detail: { id: 'cake-shop', recipe: '莓果布丁下午茶' } }));
  recipe = null; prologueEnding = true; pendingChapters = [2];
  setTimeout(showNextChapter, window.__CAKE_TEST_FAST__ ? 0 : 700);
}
const recipeDone = () => !!recipe && !recipe.finished && !(recipe.level.tutorial && (guide || pendingPart)) && Object.values(recipe.need).every(n => n <= 0) && recipe.bloom <= 0 && !recipe.frostLeft && !recipe.dust?.size && !recipe.buds.size
  && recipe.mangoGot >= (recipe.level.mango?.total || 0) && recipe.swept >= (recipe.level.leaves?.goal || 0);

function finishRecipe() {
  recipe.finished = true; queuedInput = null; markQueuedInput(); clearHints();
  if (recipe.easy) return recipe.level.tutorial ? finishPrologue() : finishEasy();
  if (recipe.inf) return finishInfinite();
  const { level, chapter, index } = recipe, stars = starsFor(level, turns), before = record.recipes[level.id] || 0;
  record.recipes[level.id] = Math.max(before, stars);
  const chapterDone = chapter.levels.every(l => record.recipes[l.id]) && !record.chapters[chapter.id];
  if (chapterDone) record.chapters[chapter.id] = true;
  save(); sound([523, 659, 784, 1047]);
  window.dispatchEvent(new CustomEvent('mimi-cake-recipe-complete', { detail: { id: level.id, name: level.name, stars, moves: turns } }));
  const next = chapter.levels[index + 1];
  setTimeout(() => showTasting(level, stars, turns, before, {
    onNext: next && !chapterDone ? withMid(level, chapter, () => startLevel(next, chapter)) : null,
    onMenu: withMid(level, chapter, chapterDone ? () => endChapter(chapter) : openMenu)
  }), window.__CAKE_TEST_FAST__ ? 0 : 700);
}

// ── Two ways in ──────────────────────────────────────────────────────────────
// 品嚐故事 (story mode): the tutorial, then one showpiece dessert per season with its opening and ending,
// then the finale — about 15 minutes. 甜點筆記 (the full 24 desserts, stars, interludes) stays tied up
// with a ribbon until the story has been seen once; saves that already have notebook stars count as opened.
const PROLOGUE = { id: 'pro', title: '序章 · 那天的午後', mark: '序' };
const EASY_LEVELS = EASY.map(e => {
  if (e.prologue) return { chapter: PROLOGUE, level: { id: 'easy-pro', easy: true, tutorial: true, name: '莓果布丁下午茶', art: 'assets/afternoon-tea.webp', intro: e.intro, taste: [], stars: [99, 99], goals: e.goals } };
  const chapter = RECIPE_CHAPTERS.find(c => c.id === e.chapter), base = chapter.levels.find(l => l.id === e.from);
  const { goals, bloom, buds, mango, burr, leaves, frost, dust, gift, start, guide } = e;
  return { chapter, level: { id: 'easy-' + base.id, easy: true, name: base.name, art: base.art, intro: e.intro || base.intro, taste: base.taste, stars: [99, 99], goals, bloom, buds, mango, burr, leaves, frost, dust, gift, start, guide } };
});
const easyDone = id => seen('easy:' + id) || (id === 'pro' && (!!record.completed || seen('easy:ch1'))); // older saves finished the tutorial before 序章 was a level
const fullUnlocked = () => !!window.__CAKE_UNLOCK_ALL__ || seen('finale') || Object.values(record.recipes).some(v => v > 0);
let introBack = () => openMenu();
// 回到餐廳: hand control back to the main 蜜蜜餐廳 app. Progress is already saved. The main app listens for
// 'mimi-easter-egg-exit' and calls preventDefault() once it closes the game; on its own (this test page)
// the game goes back to its title screen instead.
function leaveGame() {
  save(); music.pause();
  const handled = !window.dispatchEvent(new CustomEvent('mimi-easter-egg-exit', { detail: { id: 'cake-shop' }, cancelable: true }));
  if (!handled) { closeDialogs(); showTitle(); }
}
function openHub(celebrate = false) {
  closeDialogs();
  if (celebrate !== 'inf' && infUnlocked() && !window.__CAKE_UNLOCK_ALL__ && !seen('inf-open')) { mark('inf-open'); return showScene(INFINITE.unlock, () => openHub('inf'), '打開新的筆記'); }
  const fresh = celebrate === true && !seen('notebook-opened');
  if (fresh) mark('notebook-opened');
  renderModes({
    easyDone: EASY_LEVELS.filter(e => e.chapter.id !== 'pro').map(e => easyDone(e.chapter.id)), unlocked: fullUnlocked(), celebrate: fresh, firstVisit: !easyDone('pro'),
    stars: Object.values(record.recipes).reduce((a, v) => a + (v || 0), 0), maxStars: RECIPE_CHAPTERS.reduce((a, c) => a + c.levels.length * 3, 0),
    onEasy: openEasy, onFull: openMenu, onAlbum: () => { $('mode-dialog').close(); openAlbum(); }, onExit: leaveGame,
    inf: { open: infUnlocked(), celebrate: celebrate === 'inf', best: record.inf.best, made: notebookMade() }, onInf: openInfinite
  });
}
function playEasy({ level, chapter }) {
  closeDialogs(); prepareFlow(); introBack = openEasy;
  const go = () => { preloadArt(level); if (chapter.art) preloadArt({ art: chapter.art }); showLevelIntro(level, chapter, -1, () => { void playTune(SEASON_TRACK[chapter.id] || 'spring1'); prepareFlow(); recipe = { level, chapter, easy: true }; reset(); }); };
  if (chapter.open && !seen('open:' + chapter.id)) { mark('open:' + chapter.id); showScene({ kicker: chapter.title + ' · 開場', ...chapter.open }, go); } else go();
}
// Straight on to the next season (story mode is meant to be played through in one go).
function nextEasy(id) {
  const k = EASY_LEVELS.findIndex(e => e.chapter.id === id), next = EASY_LEVELS[k + 1];
  next ? playEasy(next) : openEasy();
}
function openEasy() {
  closeDialogs(); guide = null;
  // The next story the player is likely to pick: its opening scene, header and tray.
  const next = EASY_LEVELS.find(e => !easyDone(e.chapter.id)) || EASY_LEVELS[0];
  warm(next.level.tutorial ? PAGES.map(p => p.art) : chapterArt(next.chapter), next.level.art);
  renderEasy(EASY_LEVELS, k => easyDone(EASY_LEVELS[k].chapter.id), {
    onPick: entry => { $('easy-dialog').close(); playEasy(entry); },
    onHome: openHub
  });
}
function finishEasy() {
  const { level, chapter } = recipe, last = chapter.id === EASY_LEVELS.at(-1).chapter.id, firstTime = !easyDone(chapter.id);
  mark('easy:' + chapter.id); sound([523, 659, 784, 1047]);
  window.dispatchEvent(new CustomEvent('mimi-cake-recipe-complete', { detail: { id: level.id, name: level.name, stars: 0, moves: turns, mode: 'story' } }));
  const finale = last && (firstTime || !seen('finale'));
  const after = () => {
    if (!last) return nextEasy(chapter.id);
    if (finale) return showFinale(() => { window.dispatchEvent(new CustomEvent('mimi-cake-story-complete')); openHub(true); });
    openEasy();
  };
  setTimeout(() => showTasting(level, 0, turns, 0, { onNext: null, onMenu: () => {
    recipe = null; showChapterEnd(chapter, after);
    $('chapter-close').textContent = finale ? '繼續' : last ? '回到品嚐故事' : '下一季';
    if (!last) { $('chapter-alt').hidden = false; $('chapter-alt').onclick = () => { $('chapter-dialog').close(); openEasy(); }; }
  } }), window.__CAKE_TEST_FAST__ ? 0 : 700);
}
const closeDialogs = () => document.querySelectorAll('dialog[open]').forEach(d => d.close());
// Where 「筆記」 / back buttons lead: the story list while in story mode, else the notebook (or the hub before it opens).
const openHome = () => recipe?.easy || !fullUnlocked() ? openEasy() : recipe?.inf ? openInfinite() : fullUnlocked() ? openMenu() : openHub();

function startLevel(level, chapter) {
  introBack = openMenu;
  preloadArt(level); preloadArt({ art: chapter.art });
  showLevelIntro(level, chapter, chapter.levels.indexOf(level), () => {
    void playTune(SEASON_TRACK[chapter.id]); prepareFlow(); recipe = { level, chapter, index: chapter.levels.indexOf(level) }; reset();
  }, record.recipes[level.id] > 0);
}

// Photo-wall snapshots are cropped close-ups of each scene (different framings and shapes), so the
// wall doesn't read as nine copies of the same two-shot; tapping still opens the whole picture.
const WALL_THUMBS = { 'assets/shop-v4.webp': 'assets/thumb-opening-v51.webp', 'assets/story-berry-v44.webp': 'assets/thumb-berry-v51.webp',
  'assets/story-puff-v44.webp': 'assets/thumb-puff-v51.webp', 'assets/story-serve-v44.webp': 'assets/thumb-serve-v51.webp',
  'assets/chapter1-end-v44.webp': 'assets/thumb-spring-v51.webp', 'assets/chapter-summer-end-v84.webp': 'assets/thumb-summer-v84.webp',
  'assets/chapter-autumn-end-v46.webp': 'assets/thumb-autumn-v51.webp', 'assets/chapter2-end-v45.webp': 'assets/thumb-winter-v51.webp' };
function albumEntries() {
  const all = !!window.__CAKE_UNLOCK_ALL__;
  const seasonDone = c => c.levels.every(l => record.recipes[l.id] > 0);
  const story = record.completed;
  const entries = [
    { img: ART.shop, group: 'prologue', kicker: '開場 · 商店街的午後', label: '開場 · 商店街的午後', title: INTRO.title, scene: INTRO.scene, unlocked: true, lockHint: '',
      lines: INTRO.lines.map(l => [l.speaker, l.text, l.speaker === '蜜蜜' ? 'excited' : 'thoughtful']) },
    ...PAGES.map((p, i) => ({ img: p.art, group: 'prologue', kicker: p.kicker, label: p.kicker.split(' · ').pop(), title: p.title, scene: p.scene, lines: p.lines, unlocked: all || story, lockHint: `看完故事第 ${i + 1} 頁後收藏` })),
    // Each season: its opening and interlude scenes, then its ending.
    ...RECIPE_CHAPTERS.flatMap(c => {
      const season = c.title.split(' · ')[0], started = c.levels.some(l => record.recipes[l.id] > 0);
      const midAt = c.mid ? c.levels.findIndex(l => l.id === c.mid.after) : -1;
      const beat = (scene, kind, unlocked, lockHint) => scene?.art ? [{ img: scene.art, thumb: scene.thumb, group: c.id, groupLabel: c.title,
        kicker: `${c.title} · ${kind}`, label: `${season} · ${scene.title}`, title: scene.title, lines: scene.lines, unlocked: all || unlocked, lockHint }] : [];
      return [
        ...beat(c.open, '開場', seen('open:' + c.id) || started, `開始「${season}」後收藏`),
        ...beat(c.mid, '插曲', seen('mid:' + c.id) || (midAt >= 0 && record.recipes[c.mid.after] > 0), `完成「${season}」第 ${midAt + 1} 款後收藏`),
        { img: c.art, group: c.id, groupLabel: c.title, kicker: c.title + ' · 結局', label: season + ' · ' + c.end.title, title: c.end.title, lines: c.end.lines, unlocked: all || seasonDone(c) || easyDone(c.id),
          lockHint: `完成「${season}」全部甜點後收藏` }
      ];
    }),
    { img: FINALE.portrait, group: 'finale', tall: true, kicker: FINALE.kicker, label: FINALE.title, title: FINALE.title, lines: FINALE.lines, unlocked: all || seen('finale'), lockHint: '走完春夏秋冬四季後收藏', play: () => showFinale(openAlbum) },
    { img: INFINITE.unlock.art, thumb: 'assets/thumb-inf-unlock-v60.webp', group: 'inf', groupLabel: '番外 · 無限靈感筆記', kicker: INFINITE.unlock.kicker, label: INFINITE.unlock.title, title: INFINITE.unlock.title, lines: INFINITE.unlock.lines,
      unlocked: all || seen('inf-open') || infUnlocked(), lockHint: '甜點筆記 24 款全部做完後收藏' }
  ];
  entries.forEach(e => { e.thumb ||= WALL_THUMBS[e.img]; });
  return entries.filter(e => e.img);
}
// The album opens from the hub only: photos, and the 音樂盒 with every tune heard so far. Leaving puts back
// the tune that was playing before.
function openAlbum() {
  const before = music.state().want, all = !!window.__CAKE_UNLOCK_ALL__;
  const tunes = Object.entries(TRACKS).map(([key, t]) => ({ key, name: t.name, cover: t.cover, season: t.season, hidden: !!t.hidden, heard: all || record.inf.heard.includes(key), playing: false,
    hint: t.hidden ? '在無限靈感筆記裡遇見它' : `玩到「${['春', '夏', '秋', '冬'][t.season]}」就會收藏` }));
  // The finale theme sits last, once the finale has been seen.
  tunes.push({ key: 'finale', name: FINALE.tune.name, cover: FINALE.tune.cover, season: 4, hidden: false, heard: all || seen('finale'), playing: false, hint: '走完春夏秋冬四季後收藏' });
  showAlbum(albumEntries(), () => { if (music.state().want !== before) void music.play(before, true); openHub(); }, -1,
    { tunes, onPlay: key => { void playTune(key, true, { cut: true }); prepareFlow(); } });
}

function openMenu() {
  if (!fullUnlocked()) return openHub();
  if (finalePending()) return showFinale(openMenu);
  if (infUnlocked() && !window.__CAKE_UNLOCK_ALL__ && !seen('inf-open')) { mark('inf-open'); return showScene(INFINITE.unlock, () => openHub('inf'), '打開新的筆記'); }
  renderMenu(RECIPE_CHAPTERS, record.recipes, {
    onPick: (level, chapter) => {
      $('menu-dialog').close(); prepareFlow();
      const go = () => startLevel(level, chapter);
      if (chapter.open && !seen('open:' + chapter.id)) { mark('open:' + chapter.id); showScene({ kicker: chapter.title + ' · 開場', ...chapter.open }, go); }
      else go();
    },
    onFree: () => { $('menu-dialog').close(); void playTune('spring1'); prepareFlow(); recipe = null; reset(); },
  });
  $('menu-home').onclick = openHub;
}

// ── 無限靈感筆記 ──────────────────────────────────────────────────────────────
// Opens once all 24 notebook desserts have been made. An endless run of named desserts that slowly get
// richer (infinite.js); from the 11th dessert each has a move limit (running out = make it again, the
// run's score is kept). Each dessert scores board points + a finishing bonus + a bonus per
// move under par; records keep the best run total and the longest run. Each dessert plays a season's
// tune (never the same season twice running); the four hidden tunes first appear at desserts 3, 6, 9, 12.
const notebookMade = () => RECIPE_CHAPTERS.reduce((a, c) => a + c.levels.filter(l => record.recipes[l.id] > 0).length, 0);
const infUnlocked = () => !!window.__CAKE_UNLOCK_ALL__ || RECIPE_CHAPTERS.every(c => c.levels.every(l => record.recipes[l.id] > 0));
const HIDDEN_TUNES = Object.keys(TRACKS).filter(k => TRACKS[k].hidden);
// No finished-dessert pictures exist for endless desserts, so each one shows its season's story scenes.
const seasonArt = (season, n) => { const c = RECIPE_CHAPTERS.find(ch => ch.id === INFINITE.chapters[season]), beat = (n % 2 ? c.mid : c.open) || c.open; return { art: beat.art, thumb: beat.thumb }; };
function nextTune(prevSeason) {
  const inf = record.inf, heard = new Set(inf.heard);
  if ((inf.played + 1) % 3 === 0) {
    const reveal = HIDDEN_TUNES.find(k => !heard.has(k) && TRACKS[k].season !== prevSeason) || HIDDEN_TUNES.find(k => !heard.has(k));
    if (reveal) return reveal;
  }
  const pool = Object.keys(TRACKS).filter(k => (!TRACKS[k].hidden || heard.has(k)) && TRACKS[k].season !== prevSeason && k !== inf.run.track);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : SEASON_TRACK[INFINITE.chapters[nextSeason(prevSeason)]];
}
function openInfinite() {
  closeDialogs(); recipe = null;
  const inf = record.inf;
  renderInfinite(inf, {
    onGo: startInfinite, onHome: () => { $('inf-dialog').close(); openHub(); },
    onNew: () => {
      confirmAction = () => { inf.run = { ...freshInf().run, season: inf.run.season, track: inf.run.track }; save(); openInfinite(); };
      $('confirm-dialog').querySelector('h2').textContent = '重新開始一輪？';
      $('confirm-dialog').querySelector('p').textContent = `這一輪的 ${inf.run.total.toLocaleString()} 分會清掉，最高紀錄和靈感收藏都會保留。`;
      $('cancel-restart').textContent = '先不要'; $('confirm-restart').textContent = '重新開始';
      $('inf-dialog').close(); $('confirm-dialog').showModal();
    },
    onCollection: openCollection
  });
}
function startInfinite() {
  const inf = record.inf, run = inf.run;
  if (!run.spec) { const track = nextTune(run.season); run.season = TRACKS[track].season; run.track = track; run.spec = makeDessert(run.n, run.season); save(); }
  if (run.spec.limit === undefined) { run.spec.limit = moveLimit(run.spec, run.n); save(); } // a dessert saved before limits existed
  const limit = run.spec.limit, firstLimit = limit && !seen('inf-limit');
  const level = { ...run.spec, kicker: `無限靈感筆記 · 第 ${run.n + 1} 款 · ${INFINITE.seasons[run.spec.season]}`,
    rule: limit ? `限 ${limit} 步 · ${run.spec.par} 步內完成有省步加分` : `不會失敗 · ${run.spec.par} 步內完成有省步加分`, backLabel: '回無限靈感筆記', taste: [], ...seasonArt(run.spec.season, run.n),
    ...(firstLimit ? { intro: INFINITE.limitIntro.map(([who, text, face]) => [who, text.replace('{limit}', limit), face]) } : {}) };
  const chapter = { id: INFINITE.chapters[level.season], title: '無限靈感筆記' };
  introBack = openInfinite; prepareFlow(); music.prefetch(run.track);
  preloadArt(level);
  showLevelIntro(level, chapter, run.n, () => {
    if (firstLimit) mark('inf-limit');
    const fresh = !inf.heard.includes(run.track);
    void playTune(run.track); prepareFlow(); recipe = { level, chapter, inf: true }; reset();
    if (fresh && TRACKS[run.track].hidden) setTimeout(() => toast(INFINITE.newTune + TRACKS[run.track].name, 3200), window.__CAKE_TEST_FAST__ ? 0 : 900);
  }, true);
}
function finishInfinite() {
  const { level } = recipe, inf = record.inf, run = inf.run, n = run.n;
  const s = dessertScore(level, n, score, turns);
  run.total += s.total; run.n = n + 1; run.spec = null; inf.played++;
  if (n === 0) run.startBest = inf.best; // the record to beat is the one from before this run
  const before = run.startBest ?? inf.best, newBest = before > 0 && run.total > before && run.total - s.total <= before, newStreak = run.n > inf.streak && run.n > 1, bestDessert = s.total > inf.bestDessert && inf.played > 1;
  inf.best = Math.max(inf.best, run.total); inf.streak = Math.max(inf.streak, run.n); inf.bestDessert = Math.max(inf.bestDessert, s.total);
  const kept = inf.collection[level.name];
  if (!kept || s.total > kept.score) inf.collection[level.name] = { score: s.total, goals: level.goals, season: level.season, at: inf.played, thumb: level.thumb };
  else kept.at = inf.played;
  const names = Object.keys(inf.collection);
  if (names.length > 300) delete inf.collection[names.sort((a, b) => inf.collection[a].score - inf.collection[b].score)[0]];
  save(); sound([523, 659, 784, 1047]);
  window.dispatchEvent(new CustomEvent('mimi-cake-recipe-complete', { detail: { id: level.id, name: level.name, stars: 0, moves: turns, mode: 'infinite', score: s.total, run: run.total } }));
  const lines = fill(newStreak && run.n % 5 === 0 ? INFINITE.streak : bestDessert ? INFINITE.best : INFINITE.done[Math.floor(Math.random() * INFINITE.done.length)], level.name);
  const parts = [`盤面 ${s.points.toLocaleString()}`, `完成 ${s.finish.toLocaleString()}`]; if (s.speed) parts.push(`省步 ${s.speed.toLocaleString()}`);
  setTimeout(() => showTasting(level, 0, turns, 0, {
    custom: { headline: `＋${s.total.toLocaleString()} 分`, detail: `${turns} 步完成（${parts.join(' ＋ ')}）・這一輪 ${run.total.toLocaleString()} 分${newBest ? ' · 新紀錄！' : ''}`,
      lines, menuLabel: '休息一下', nextLabel: `第 ${run.n + 1} 款` },
    onNext: () => { recipe = null; startInfinite(); }, onMenu: openInfinite
  }), window.__CAKE_TEST_FAST__ ? 0 : 700);
}
// Out of moves in a limited dessert: make it again (same dessert, the run's score so far is kept) or rest.
const outOfMoves = () => !!recipe?.inf && !recipe.finished && recipe.level.limit > 0 && turns >= recipe.level.limit;
function failInfinite() {
  recipe.finished = true; queuedInput = null; markQueuedInput(); clearHints();
  const { level } = recipe, t = INFINITE.outOfMoves, total = record.inf.run.total;
  sound([523, 440, 349]);
  window.dispatchEvent(new CustomEvent('mimi-cake-recipe-failed', { detail: { id: level.id, name: level.name, moves: turns, mode: 'infinite' } }));
  setTimeout(() => {
    confirmAction = () => { recipe = null; startInfinite(); };
    $('confirm-dialog').querySelector('h2').textContent = t.title;
    $('confirm-dialog').querySelector('p').textContent = t.text.replace('{name}', level.name).replace('{total}', total.toLocaleString());
    $('cancel-restart').textContent = t.rest; $('confirm-restart').textContent = t.retry;
    $('confirm-dialog').showModal();
  }, window.__CAKE_TEST_FAST__ ? 0 : 500);
}
function openCollection() {
  const desserts = Object.entries(record.inf.collection).map(([name, d]) => ({ name, ...d })).sort((a, b) => (b.at || 0) - (a.at || 0));
  showCollection({ desserts }, { onBack: openInfinite });
}

function storyLine([speaker, text, expression]) {
  const row = document.createElement('div'); row.className = 'intro-line';
  const p = document.createElement('p'), b = document.createElement('b'); b.textContent = speakerName(speaker); p.append(b, document.createTextNode('「' + text + '」'));
  row.append(createPortrait(speaker, expression), p); return row;
}

function showNextChapter() {
  if (!pendingChapters.length || hasDialog()) return;
  const index = pendingChapters.shift(), page = PAGES[index];
  $('recipe-kicker').textContent = page.kicker; $('recipe-title').textContent = page.title; $('recipe-scene').textContent = page.scene || ''; $('recipe-lines').replaceChildren(...page.lines.map(storyLine)); $('recipe-note').textContent = page.note;
  $('continue').textContent = index === 2 ? '繼續' : '繼續想點子'; $('continue').dataset.last = index === 2 && !pendingChapters.length ? '1' : '0';
  if (prologueEnding && index === 2) $('continue').textContent = '開始春天的新點子';
  $('recipe-dialog').querySelector('.scene-tag').textContent = index === 2 ? '新菜單完成' : '好點子記下來了';
  const art = $('recipe-dialog').querySelector('.scene-art'); art.hidden = !page.art;
  if (page.art) { art.querySelector('img').removeAttribute('data-retried'); art.querySelector('img').src = page.art; art.querySelector('img').alt = page.alt || ''; }
  $('recipe-dialog').showModal(); sound([523, 659, 784]);
}

// Stuck for a while: the two friends nudge gently, in conversation, once per idle spell.
let idleTimer = 0;
function armIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (busy || hasDialog() || guide || selected >= 0) return armIdle();
    const lines = pick('idle', TALK.idle); hint(); talk(lines);
  }, 10000);
}
for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, armIdle, { passive: true });

function clearHints() { clearTimeout(hintTimer); document.querySelectorAll('.hinted').forEach(x => x.classList.remove('hinted')); }
function hint() {
  if (busy || hasDialog()) return;
  if (guide) { showGuide(); return; }
  const available = moves(board); if (!available.length) return;
  if (recipe) {
    const value = ([a, b]) => {
      const r = swapPlan(board, a, b); if (!r) return -1; const plan = clearPlan(r.board, r.groups, r.preferred, r.forced); let v = Math.random() * .3;
      for (const i of plan.remove) { const p = r.board[i]; if (p && recipe.need[p.type] > 0) v += 1; if (recipe.dust.has(i) || recipe.buds.has(i) || recipe.leaves.has(i)) v += 1;
        for (let k = i - 8; k >= 0; k -= 8) if (r.board[k]?.item) { v += 1.5; break; }
        if ((i % SIZE && r.board[i - 1]?.item) || (i % SIZE < SIZE - 1 && r.board[i + 1]?.item)) v += 1.5; }
      v += (plan.unfrost?.size || 0) * 1.4 + plan.creations.size * 1.2;
      if (recipe.bloom > 0) for (const i of plan.triggered) if (r.board[i]?.special === 'flame') v += 3;
      return v;
    };
    const best = available.map(m => [value(m), m]).sort((x, y) => y[0] - x[0])[0][1];
    clearHints(); $('board').children[best[0]].classList.add('hinted'); $('board').children[best[1]].classList.add('hinted');
    $('game-status').textContent = '這兩個點心，交換一下試試。'; announce('可交換的兩個甜點已標示。');
    talk([['蜜蜜', '嗯……先做哪一個好呢？', 'thoughtful'], ['店主', '這兩個換換看，剛好用得上。', 'smile']]);
    hintTimer = setTimeout(clearHints, 2600); return;
  }
  const specialMove = available.filter(([a, b]) => {
    const result = swapPlan(board, a, b);
    const plan = clearPlan(result.board, result.groups, result.preferred, result.forced);
    return [...plan.triggered].some(index => result.board[index].special === 'flame');
  }).sort(() => Math.random() - .5)[0];
  clearHints(); const [a, b] = specialMove || available[Math.floor(Math.random() * available.length)];
  $('board').children[a].classList.add('hinted'); $('board').children[b].classList.add('hinted');
  $('game-status').textContent = '這兩個點心，交換一下試試。'; announce('可交換的兩個甜點已標示。');
  talk(specialMove ? [['蜜蜜', '那顆發光的，要配什麼好呢？', 'thoughtful'], ['店主', '讓它跟同款湊在一起試試。', 'smile']] : [['蜜蜜', '嗯……妳覺得哪兩個搭？', 'thoughtful'], ['店主', '這兩個換換看，味道應該合得來。', 'smile']]);
  hintTimer = setTimeout(clearHints, 2600);
}

// ── Tips: each special piece / seasonal mechanic gets a small card when it is on the board.
// 品嚐故事 is the lasting tutorial: there, every visit to a level shows its cards again (once per visit,
// not again on 重新試做). In the notebook and infinite mode each card shows only the first time ever.
const tipQueue = [];
const TIP_PIECES = { flame: 1, cross: 4, prism: 3 }; // dessert type each special is shown on (prism ignores it)
// [columns, rows, shapes]: four in a row; a T and an L shown in turn (any row joined to a column makes a star); five in a row.
const TIP_SHAPES = { flame: [4, 1, [[0, 1, 2, 3]]], cross: [3, 3, [[0, 1, 2, 4, 7], [0, 3, 6, 7, 8]]], prism: [5, 1, [[0, 1, 2, 3, 4]]] };
let tipShapeTimer = 0;
const MECHANICS = ['buds', 'bloom', 'dust', 'mango', 'burr', 'leaves', 'frost', 'gift'];
function noteTips(keys) {
  const story = !!recipe?.easy, shown = story ? (recipe.tipsShown ??= new Set()) : null;
  for (const k of keys) {
    if (!TIPS[k] || tipQueue.includes(k)) continue;
    if (story ? shown.has(k) : seen('tip:' + k)) continue;
    shown?.add(k); tipQueue.push(k);
  }
  showTip();
}
function boardTips() { return [...new Set(board.filter(p => p?.special).map(p => p.special))]; }
function showTip() {
  if (window.__CAKE_NO_TIPS__) { tipQueue.length = 0; return; } // QA scripts that test other flows
  if (!tipQueue.length || hasDialog() || busy || recipe?.finished) return;
  const k = tipQueue.shift(), t = TIPS[k]; mark('tip:' + k);
  // Special pieces are shown as the real board piece (same glow and sparkles as in play), not as an icon.
  const live = TIP_PIECES[k];
  $('tip-img').hidden = !!live; if (!live) $('tip-img').src = t.img;
  $('tip-live').hidden = !live; $('tip-live').replaceChildren();
  if (live) {
    // A tiny recipe drawn with the real pieces: the shape to make → the special it turns into.
    const tile = (type, special = null, n = 0) => { const t = document.createElement('span'); t.className = 'tile'; t.append(createPiece({ id: 900 + n, type, special })); return t; };
    const [cols, rows, shapes] = TIP_SHAPES[k], grid = document.createElement('span');
    grid.className = 'tip-shape'; grid.style.setProperty('--cols', cols); grid.style.setProperty('--rows', rows);
    const used = [...new Set(shapes.flat())];
    for (let i = 0; i < cols * rows; i++) grid.append(used.includes(i) ? tile(live, null, 10 + i) : document.createElement('i'));
    let turn = 0;
    const showShape = () => [...grid.children].forEach((cell, i) => cell.classList.toggle('off', !shapes[turn % shapes.length].includes(i)));
    showShape(); clearInterval(tipShapeTimer);
    if (shapes.length > 1) tipShapeTimer = setInterval(() => { turn++; showShape(); }, 2400);
    const arrow = document.createElement('b'); arrow.className = 'tip-arrow'; arrow.textContent = '→';
    const made = tile(live, k, 1); made.classList.add('tip-made');
    $('tip-live').append(grid, arrow, made);
  }
  $('tip-kicker').textContent = recipe?.easy ? '這一關會用到・小提示' : '第一次遇到・小提示';
  $('tip-title').textContent = t.name; $('tip-text').textContent = t.text;
  $('tip-ok').onclick = () => { clearInterval(tipShapeTimer); $('tip-dialog').close(); setTimeout(showTip, 150); };
  $('tip-dialog').oncancel = event => { event.preventDefault(); $('tip-ok').click(); };
  $('tip-dialog').showModal(); sound([659, 784]);
}

// Each season dresses the game screen: its own tray border and its own picture of the shop above the board.
// 序章 keeps the shop's strawberry tray and the everyday picture.
const SEASON_TRAYS = ['spring', 'summer', 'autumn', 'winter'];
const SEASON_HEADERS = ['assets/header-spring-v60.webp', 'assets/header-summer-v60.webp', 'assets/header-autumn-v60.webp', 'assets/header-winter-v60.webp'];
const recipeSeason = () => !recipe || recipe.level.tutorial ? -1 : recipe.inf ? recipe.level.season : INFINITE.chapters.indexOf(recipe.chapter?.id);
// Pictures that are about to appear are fetched and decoded ahead, one at a time while the phone is idle,
// so a scene, a season's header or tray, or the finale shows at once instead of drawing in a moment later.
const warmed = new Map(), warmQueue = [];
const idle = fn => (window.requestIdleCallback || (f => setTimeout(f, 60)))(fn, { timeout: 800 });
function warm(...srcs) {
  for (const src of srcs.flat()) if (src && !warmed.has(src) && !warmQueue.includes(src)) warmQueue.push(src);
  if (warmQueue.length && !warm.busy) { warm.busy = true; idle(warmNext); }
}
function warmNext() {
  const src = warmQueue.shift(); if (!src) { warm.busy = false; return; }
  const img = new Image(); img.decoding = 'async'; img.src = src; warmed.set(src, img);
  while (warmed.size > 14) warmed.delete(warmed.keys().next().value);   // keep phone memory in check
  (img.decode ? img.decode() : Promise.resolve()).catch(() => {}).then(() => idle(warmNext));
}
const TRAY_ART = { shop: 'assets/tray-wood-v58.webp', elegant: 'assets/tray-elegant-v58.webp', spring: 'assets/tray-spring-v60.webp', summer: 'assets/tray-summer-v60.webp', autumn: 'assets/tray-autumn-v60.webp', winter: 'assets/tray-winter-v60.webp' };
// Everything a season's chapter will show: header, tray, opening, interlude and ending scenes.
const chapterArt = c => { const s = INFINITE.chapters.indexOf(c?.id); return c ? [SEASON_HEADERS[s], TRAY_ART[SEASON_TRAYS[s]], c.open?.art, c.mid?.art, c.art] : []; };
function dressForSeason() {
  const season = recipeSeason(), scene = document.querySelector('.shop-scene');
  document.querySelector('.board-frame').dataset.tray = recipe?.level.tutorial ? 'shop' : season < 0 ? 'elegant' : SEASON_TRAYS[season];
  const header = season < 0 ? 'assets/shop-v4.webp' : SEASON_HEADERS[season];
  if (!scene.src.endsWith(header)) scene.src = header;
  // While this level plays, get ready what comes next: this season's scenes, and the finale after the last season.
  if (recipe?.level.tutorial) warm(PAGES.map(p => p.art));
  if (recipe?.chapter) warm(chapterArt(recipe.chapter), recipe.chapter.id === RECIPE_CHAPTERS.at(-1).id ? FINALE.shots.map(s => s.img) : []);
}
function reset() {
  pendingPart = null;
  dressForSeason();
  tipQueue.length = 0; // cards left over from a level the player walked away from
  clearTimeout(toastTimer); $('board-toast').classList.remove('visible'); $('board-toast').textContent = '';
  if (recipe) { recipe.need = { ...recipe.level.goals }; recipe.bloom = recipe.level.bloom || 0; recipe.frostLeft = recipe.level.frost?.length || 0; recipe.dust = new Set(recipe.level.dust || []); recipe.buds = new Set(recipe.level.buds || []); recipe.leaves = new Set(recipe.level.leaves?.at || []); recipe.swept = 0; recipe.mangoGot = 0; recipe.mangoSpawned = 0; recipe.finished = false; recipe.pages = new Set(); }
  epoch++; clearTimeout(talkTimer); talking = false; clearEffects(); sound.stop(); flowSound.stop(); birthSound.stop(); queuedInput = null; pointer = null; busy = false; board = openingBoard(); score = 0; selected = -1; focused = 0; chapter = 0; turns = 0; pendingChapters = [];
  $('combo').textContent = ''; $('game-status').textContent = '點兩個相鄰甜點交換，也可以直接滑動。';
  talk(recipe ? recipe.level.intro : [['蜜蜜', '一起想份吃完會微笑的新菜單吧！', 'excited'], ['店主', '嗯，今天就麻煩妳囉。', 'smile']]);
  if (recipe) $('game-status').textContent = `試做「${recipe.level.name}」：收集上方的甜點。`;
  clearHints(); render(); showGuide(); refit();
  if (recipe) setTimeout(() => noteTips([...MECHANICS.filter(k => k === 'bloom' ? recipe?.level.bloom : recipe?.level[k] && (recipe.level[k].length ?? 1)), ...boardTips()]), window.__CAKE_TEST_FAST__ ? 0 : 450);
}

$('board').addEventListener('click', event => {
  if (performance.now() < ignoreClickUntil) return;
  const target = event.target.closest('.tile'); if (target) select(Number(target.dataset.index));
});
$('board').addEventListener('pointerdown', event => {
  const target = event.target.closest('.tile'); if (!target || hasDialog()) return;
  pointer = { id: event.pointerId, index: Number(target.dataset.index), pieceId: Number(target.dataset.pieceId), x: event.clientX, y: event.clientY };
  target.classList.add('pressed');
  target.setPointerCapture?.(event.pointerId);
});
$('board').addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId || busy || hasDialog()) return;
  if (board[pointer.index]?.frost) return;
  const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 5) return;
  const horizontal = Math.abs(dx) > Math.abs(dy), direction = horizontal ? Math.sign(dx) : Math.sign(dy) * SIZE;
  const target = pointer.index + direction;
  if (target < 0 || target >= board.length || !adjacent(pointer.index, target)) { clearDrag(); return; }
  const size = $('board').children[pointer.index].getBoundingClientRect().width;
  previewDrag(pointer.index, target, Math.max(Math.abs(dx), Math.abs(dy)) / (size + 2));
});
$('board').addEventListener('pointerup', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const origin = pointer; pointer = null;
  $('board').children[origin.index]?.classList.remove('pressed');
  const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) { clearDrag(); return; }
  ignoreClickUntil = performance.now() + 220;
  const horizontal = Math.abs(dx) > Math.abs(dy), direction = horizontal ? Math.sign(dx) : Math.sign(dy) * SIZE;
  const source = board.findIndex(p => p.id === origin.pieceId), target = source + direction;
  if (source >= 0 && target >= 0 && target < SIZE * SIZE && adjacent(source, target)) void attempt(source, target);
  else clearDrag();
});
$('board').addEventListener('pointercancel', () => {
  if (pointer) $('board').children[pointer.index]?.classList.remove('pressed');
  pointer = null; clearDrag();
});
$('board').addEventListener('keydown', event => {
  const target = event.target.closest('.tile'); if (!target || hasDialog()) return;
  const index = Number(target.dataset.index), direction = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -SIZE, ArrowDown: SIZE }[event.key];
  if (direction === undefined) { if (event.key === 'Escape') { selected = -1; render(); } return; }
  event.preventDefault(); const next = index + direction;
  if (next < 0 || next >= SIZE * SIZE || !adjacent(index, next)) return;
  if (event.shiftKey) attempt(index, next);
  else { focused = next; for (const tile of $('board').children) tile.tabIndex = Number(tile.dataset.index) === next ? 0 : -1; $('board').children[next].focus(); }
});
// Bottom 「‹ 返回」 buttons do what the top back link does (the top can sit under an app's toolbar).
document.addEventListener('click', event => { const b = event.target.closest('[data-proxy]'); if (b) $(b.dataset.proxy)?.click(); });
$('hint').addEventListener('click', hint);
$('how-to').addEventListener('click', () => { $('pause-dialog').close(); $('help-dialog').showModal(); });
// 選單: pause panel with 繼續 / 重新開始 / 玩法說明 / back to the list this dessert came from.
const leaveLabel = () => recipe?.easy ? '回品嚐故事' : recipe?.inf ? '回無限靈感筆記' : fullUnlocked() ? '回甜點筆記' : '回選擇模式';
function openPause() {
  if (hasDialog()) return;
  clearHints();
  $('pause-kicker').textContent = recipe ? $('mode-title').textContent : '自由想點子';
  $('pause-title').textContent = recipe ? recipe.level.name : '休息一下';
  $('pause-note').textContent = recipe ? `目前 ${turns} 步` + (recipe.level.limit ? `（限 ${recipe.level.limit} 步）` : '') + (recipe.inf ? `・這一輪 ${record.inf.run.total.toLocaleString()} 分` : '') : `這一局 ${score.toLocaleString()} 分`;
  $('restart').textContent = recipe ? '重新開始這一款' : '重新開始';
  $('pause-leave').textContent = leaveLabel();
  $('pause-best').hidden = !!recipe;
  $('pause-dialog').showModal();
}
$('story').addEventListener('click', openPause);
$('pause-resume').addEventListener('click', () => $('pause-dialog').close());
$('pause-leave').addEventListener('click', () => {
  $('pause-dialog').close(); guide = null; openHome();
});
$('level-back').addEventListener('click', () => { $('level-dialog').close(); introBack(); });
$('level-dialog').addEventListener('cancel', event => { event.preventDefault(); $('level-dialog').close(); introBack(); });
for (const id of ['taste-dialog', 'chapter-dialog']) $(id).addEventListener('cancel', event => event.preventDefault());

$('start').addEventListener('click', () => { $('start').dataset.started = '1'; $('intro-dialog').close(); if ($('start').textContent !== '回到點心桌') void playTune('spring1'); prepareFlow(); sound([392, 523, 659]); showNextChapter(); });
// Closing the last story page unlocks the dessert notebook (normal mode).
$('continue').addEventListener('click', () => { const last = $('continue').dataset.last === '1'; $('recipe-dialog').close();
  if (pendingPart && !pendingChapters.length && recipe?.level.tutorial) { void startPart(pendingPart); return; } if (last && prologueEnding) { prologueEnding = false; nextEasy('pro'); } else if (last && !guide) { recipe = null; openHub(); } else showNextChapter(); });
for (const id of ['intro-dialog', 'recipe-dialog']) $(id).addEventListener('cancel', event => event.preventDefault());
$('restart').addEventListener('click', () => {
  $('pause-dialog').close(); confirmAction = null;
  $('confirm-dialog').querySelector('h2').textContent = recipe ? `重新試做「${recipe.level.name}」？` : '重新想一份新菜單？';
  $('confirm-dialog').querySelector('p').textContent = recipe?.inf ? '這一款的步數和分數會歸零，這一輪前面的分數會保留。' : recipe ? '步數和收集進度會歸零，已拿到的星星會保留。' : '本次分數會歸零，最佳紀錄會保留。';
  $('cancel-restart').textContent = '繼續這一局'; $('confirm-restart').textContent = '重新開始';
  $('confirm-dialog').showModal();
});
let confirmAction = null;
$('cancel-restart').addEventListener('click', () => { $('confirm-dialog').close(); if (confirmAction) { confirmAction = null; openInfinite(); } });
$('confirm-dialog').addEventListener('cancel', event => { if (confirmAction) event.preventDefault(); }); // the infinite-mode questions need an answer
$('confirm-restart').addEventListener('click', () => { $('confirm-dialog').close(); const act = confirmAction; confirmAction = null; act ? act() : reset(); });
$('sound').addEventListener('click', () => { record.sound = !record.sound; sound.sync(); flowSound.sync(); birthSound.sync(); void music.sync(); prepareFlow(); save(); updateUI(); sound([523, 659]); });
document.addEventListener('visibilitychange', () => { if(document.hidden){sound.stop();flowSound.stop();birthSound.stop();music.pause();} else if (!$('film-dialog').open) void music.sync(); });

window.addEventListener('pagehide',()=>{sound.stop();flowSound.stop();birthSound.stop();music.pause();});
// iPhone home-screen app: the swipe home takes the app's focus away well before the page counts as hidden, and
// iOS freezes the sound mid-play in between (heard as a held 'ding'). So go quiet the moment focus leaves, and
// come back when it returns (a half swipe that is cancelled just resumes).
if (navigator.standalone || window.matchMedia?.('(display-mode: standalone)').matches) {
  window.addEventListener('blur', () => { sound.stop(); flowSound.stop(); birthSound.stop(); music.pause(); });
  window.addEventListener('focus', () => { if (!document.hidden && !$('film-dialog').open) void music.sync(); });
}

// Read-only state and normal input entrypoint for QA and future main-game integration.
window.CakeGame = { getState: () => ({ recipe: recipe && { id: recipe.level.id, need: { ...recipe.need }, bloom: recipe.bloom, frost: recipe.frostLeft, dust: recipe.dust?.size || 0, buds: recipe.buds?.size || 0, mango: recipe.mangoGot, leaves: recipe.swept, moves: turns }, music: music.state(), guideStep: guide ? guide.step : null, board: board.map(p => ({ ...p })), score, best: record.best, chapter, busy, completed: record.completed, turns, hasDialog: hasDialog(), queued: !!queuedInput, inf: { n: record.inf.run.n, total: record.inf.run.total, played: record.inf.played, heard: [...record.inf.heard], track: record.inf.run.track, level: recipe?.inf ? recipe.level : null } }), getMoves: () => moves(board), play: attempt };
$('speaker').textContent = speakerName('店主'); // the page's placeholder line before the first chat
$('intro-dialog').querySelector('img').src = ART.shop;
$('recipe-dialog').querySelector('img').src = ART.finishedRecipe;
$('intro-dialog').querySelector('h2').textContent = INTRO.title;
$('intro-lines').replaceChildren(...(INTRO.scene ? [Object.assign(document.createElement('p'), { className: 'recipe-scene narration', textContent: INTRO.scene })] : []), ...INTRO.lines.map(line => {
  const row = document.createElement('div'); row.className = 'intro-line';
  const p = document.createElement('p'), b = document.createElement('b'); b.textContent = speakerName(line.speaker); p.append(b, document.createTextNode('「' + line.text + '」'));
  row.append(createPortrait(line.speaker, line.speaker === '蜜蜜' ? 'excited' : 'thoughtful'), p); return row;
}));
if (guide) $('intro-dialog').querySelector('.scene-instruction').textContent = TUTORIAL.instruction;
if (new URLSearchParams(location.search).get('dev') === '1') document.body.classList.add('dev');
record.recipes ||= {}; record.chapters ||= {};
void connectCloud();
// Story/chapter illustrations: retry a failed download once, otherwise hide the frame instead of a broken icon.
document.addEventListener('error', event => {
  const img = event.target; if (!(img instanceof HTMLImageElement) || img.closest('.taste-art')) return;
  const src = img.getAttribute('src'); if (!src) return;
  if (!img.dataset.retried) { img.dataset.retried = '1'; setTimeout(() => { img.src = src.split('?')[0] + '?r=' + Date.now(); }, 600); }
  else img.closest('.scene-art')?.setAttribute('hidden', '');
}, true);
for (const page of PAGES) if (page.art) { const i = new Image(); i.src = page.art; }
render(); showGuide();
// The play screen always fits one phone screen (Safari bars, the Claude app's toolbar, short phones):
// the shop picture takes whatever height is left over; when there's none, the title tucks up and
// the board shrinks a little rather than pushing the buttons off screen.
// v87 · In the home-screen version the page also runs under the (translucent) status bar: the shop picture may
// sit beneath it, but the title row and everything else stay below it (--sat, measured by a probe).
const safeProbe = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'safe-probe' }));
const safeTop = () => safeProbe.offsetHeight, safeBottom = () => safeProbe.offsetWidth;
function fitLayout() {
  // (see below) the picture's crop moves up to the shelves when it is only a strip, so no face is cut at the eyes
  const shell = document.querySelector('.game-shell'), scene = shell.querySelector('.shop-scene'), frame = shell.querySelector('.board-frame');
  const vh = Math.round(window.visualViewport?.height || innerHeight), w = shell.clientWidth, sat = safeTop();
  shell.classList.remove('compact'); frame.style.width = ''; scene.style.height = '0px'; shell.style.paddingTop = '';
  let room = vh - shell.getBoundingClientRect().height - sat; // what is left below the status bar
  scene.style.objectPosition = room < w * .34 ? 'center 6%' : '';
  if (room >= w * .16) { scene.style.height = Math.min(w * .61, room) + sat + 'px'; return; }
  shell.classList.add('compact');
  room = vh - shell.getBoundingClientRect().height - sat;
  // Fill the screen (no dark strip left under the buttons). In Safari, whose bars leave only a sliver, a strip of
  // picture that thin just looks cut off, so the shop picture steps aside and the spare room stays plain cream.
  if (room >= w * .12) { scene.style.height = room + sat + 'px'; scene.style.objectPosition = 'center 6%'; return; }
  if (room >= 0) { shell.style.paddingTop = room + sat + 'px'; return; }
  if (sat) shell.style.paddingTop = sat + 'px';
  frame.style.width = Math.max(w * .7, frame.getBoundingClientRect().width + room) + 'px';
}
var fitTimer = 0; // hoisted: reset() may refit before this line has run
function refit() { cancelAnimationFrame(fitTimer); fitTimer = requestAnimationFrame(() => { fitLayout(); document.querySelector('.game-shell').classList.add('ready'); }); }
window.addEventListener('resize', refit); window.visualViewport?.addEventListener('resize', refit);
document.fonts?.ready.then(refit); refit();
// Title screen (v87): the same entrance as the series' other games (八百屋篇・麻將篇). The cover shows first with
// 「點一下畫面開始」; that tap starts the music (and unlocks sound on phones) and the logo pops in on it while desserts
// from the board fly out; 開始 then slides up and leads to the menu. Coming back to the title later (when no host app
// takes the 「回到餐廳」 exit) skips the tap: the music is already playing.
const afterTitle = () => openHub(); // the main app's surprise animation already told the opening; the game starts at its menu
// Same numbers as the 麻將篇／八百屋篇 logo pop: elastic overshoot over 0.9 s, tilted -10.3° and straightening as it lands.
const TITLE_POP = { musicWait: 1200, artWait: 2500, dur: 900, startAt: 750, startDur: 350, tilt: -10.3 };
const TITLE_BURST = ['cake-v24.png', 'macaron-v30.png', 'choux-v29.png', 'donut-v29.png', 'tart-v29.png', 'cone-v29.png', 'pudding-v5.png', 'cake-v24.png', 'macaron-v30.png', 'tart-v29.png'];
const elastic = t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1;
function logoPopFrames(n = 36) {
  const f = [];
  for (let i = 0; i <= n; i++) { const k = i / n, rot = (1 - Math.min(1, k * 1.4)) * TITLE_POP.tilt; f.push({ offset: k, transform: `rotate(${rot.toFixed(2)}deg) scale(${elastic(k).toFixed(4)})` }); }
  return f;
}
let titleTapped = false, titleRaf = 0, titleTimer = 0, titleAnims = [];
// Desserts from the board (and a few gold sparks) fly out of the logo under gravity; speeds follow 八百屋篇,
// scaled by the screen width (its canvas was ~390 px wide).
function titleBurst(dialog) {
  const box = dialog.querySelector('.title-burst'), host = dialog.getBoundingClientRect(), logo = dialog.querySelector('.title-logo-box').getBoundingClientRect();
  const fw = host.width, u = fw / 390, cx = logo.left - host.left + logo.width / 2, cy = logo.top - host.top + logo.height / 2, rand = Math.random;
  const parts = TITLE_BURST.map(src => {
    const a = -Math.PI * .5 + (rand() - .5) * Math.PI * 1.7, sp = (260 + rand() * 300) * u, size = fw * (.13 + rand() * .05);
    return { src, x: cx + (rand() - .5) * logo.width * .5, y: cy + (rand() - .5) * logo.height * .3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120 * u, g: 620 * u, size, rot: rand() * 6, vr: (rand() - .5) * 9, life: 1.7 + rand() * .5 };
  });
  for (let i = 0; i < 14; i++) { const a = rand() * Math.PI * 2, sp = (160 + rand() * 220) * u; parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .7, g: 200 * u, size: (10 + rand() * 12) * u, rot: 0, vr: 0, life: .7 }); }
  let live = parts.map(p => {
    const n = document.createElement(p.src ? 'img' : 'i'); n.className = 'title-p ' + (p.src ? 'dessert' : 'spark');
    if (p.src) { n.src = 'assets/' + p.src; n.alt = ''; n.draggable = false; }
    n.style.width = n.style.height = p.size + 'px'; box.append(n); return { p, n };
  });
  const t0 = performance.now();
  const step = now => {
    const t = (now - t0) / 1000;
    live = live.filter(({ p, n }) => {
      if (t >= p.life || !dialog.open) { n.remove(); return false; }
      const left = 1 - t / p.life, x = p.x + p.vx * t, y = p.y + p.vy * t + .5 * p.g * t * t;
      n.style.transform = `translate(${(x - p.size / 2).toFixed(1)}px,${(y - p.size / 2).toFixed(1)}px) rotate(${(p.rot + p.vr * t).toFixed(3)}rad) scale(${p.src ? Math.min(1, t * 8).toFixed(3) : 1})`;
      n.style.opacity = (p.src ? Math.max(0, Math.min(1, left * 3)) : Math.max(0, left)).toFixed(3); return true;
    });
    titleRaf = live.length ? requestAnimationFrame(step) : 0;
  };
  titleRaf = requestAnimationFrame(step);
}
function popTitle(dialog) {
  if (!dialog.open || dialog.classList.contains('popping') || dialog.classList.contains('popped')) return;
  const pop = dialog.querySelector('.title-pop');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !pop.animate) { dialog.classList.add('popped'); return; }
  dialog.classList.add('popping'); dialog.dataset.popAt = String(Math.round(performance.now()));
  titleAnims = [pop.animate(logoPopFrames(), { duration: TITLE_POP.dur, easing: 'linear', fill: 'both' }),
  $('title-start').animate([{ opacity: 0, translate: '0 22px' }, { opacity: 1, translate: '0 0' }], { duration: TITLE_POP.startDur, delay: TITLE_POP.startAt, easing: 'ease-out', fill: 'backwards' })];
  titleBurst(dialog);
  titleTimer = setTimeout(() => { dialog.classList.remove('popping'); dialog.classList.add('popped'); }, TITLE_POP.dur);
}
// v88 · Cover layout (see style.css): on a screen taller than the 9:16 cover it is fitted almost whole from the top,
// with a blurred copy below; the buttons move into that room when it is at least a button tall.
const TITLE_RATIO = 900 / 1600, TITLE_CROP = .02;
function layoutTitle() {
  const d = $('title-dialog'); if (!d.open) return;
  const W = d.clientWidth, H = d.clientHeight, tall = W / H < TITLE_RATIO - .002;
  d.classList.toggle('tall', tall);
  if (!tall) { d.classList.remove('dock'); return; }
  const fw = Math.min(W / (1 - 2 * TITLE_CROP), H * TITLE_RATIO), fh = fw / TITLE_RATIO;
  d.style.setProperty('--fw', fw.toFixed(1) + 'px'); d.style.setProperty('--fh', fh.toFixed(1) + 'px');
  d.classList.toggle('dock', H - fh - safeBottom() >= 82);
}
window.addEventListener('resize', layoutTitle); window.visualViewport?.addEventListener('resize', layoutTitle);
function showTitle() {
  const dialog = $('title-dialog'), bg = dialog.querySelector('.title-bg'), logo = dialog.querySelector('.title-logo');
  clearTimeout(titleTimer); cancelAnimationFrame(titleRaf); dialog.querySelector('.title-burst').replaceChildren();
  titleAnims.forEach(a => a.cancel()); titleAnims = []; // replay the pop when coming back
  dialog.classList.remove('popping', 'popped', 'ready', 'leaving');
  const tapFirst = !titleTapped; dialog.classList.toggle('await-tap', tapFirst);
  $('title-start').onclick = () => {
    if (!dialog.classList.contains('popped') || dialog.classList.contains('leaving')) return;
    dialog.classList.add('leaving'); void music.sync();
    setTimeout(() => { dialog.close(); dialog.classList.remove('leaving'); afterTitle(); }, window.__CAKE_TEST_FAST__ ? 0 : 420);
  };
  dialog.oncancel = event => event.preventDefault();
  dialog.showModal(); layoutTitle();
  // The prompt appears only once the cover is on screen, never over an empty background; the pop waits for the
  // cover and the logo to be decoded (at most 2.5 s) so it is never spent on a blank screen.
  const shown = () => dialog.classList.add('ready');
  if (bg.complete && bg.naturalWidth) shown(); else { bg.addEventListener('load', shown, { once: true }); setTimeout(shown, 5000); }
  const art = Promise.race([Promise.all([bg, logo].map(i => i.decode ? i.decode().catch(() => {}) : null)), new Promise(r => setTimeout(r, TITLE_POP.artWait))]);
  for (const src of new Set(TITLE_BURST)) { const i = new Image(); i.src = 'assets/' + src; }
  if (!tapFirst) { art.then(() => popTitle(dialog)); $('title-start').focus({ preventScroll: true }); return; }
  if (record.sound) music.preload('spring1'); // decoded while the prompt waits, so the tap starts it at once
  const go = () => {
    if (!dialog.classList.contains('await-tap') || !dialog.classList.contains('ready')) return;
    titleTapped = true; dialog.classList.remove('await-tap'); dialog.removeEventListener('click', go);
    // The tap starts the shop theme from its beginning (no fade), and the logo pops as it comes in.
    const theme = record.sound ? music.play('spring1', true, { cut: true }) : null;
    const heard = Promise.race([theme, new Promise(r => setTimeout(r, theme ? TITLE_POP.musicWait : 0))]);
    Promise.all([art, heard]).then(() => popTitle(dialog));
  };
  dialog.addEventListener('click', go);
  $('title-tap').focus({ preventScroll: true });
}
if (new URLSearchParams(location.search).get('finale') === '1') showFinale(afterTitle); // preview link for the finale
else if (new URLSearchParams(location.search).get('title') === '0') afterTitle();
else showTitle();
armIdle();
