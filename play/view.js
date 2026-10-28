import { contourShell } from './contour-fx.js';
import { SIZE } from './engine.js';
import { DESSERTS, PRISM_ART, GOALS, LABELS, CAKE_LAYERS } from './content.js';
import { animatePlacement, celebrateBirth, stopPiece } from './motion.js';

const pieces = new Map();
let previousIds = [];

export function createCakeIcon(){
  const icon=document.createElement('span');icon.className='dessert-icon cake-art';
  const base=document.createElement('img');base.className='cake-base';base.src=CAKE_LAYERS.base;base.alt='';base.draggable=false;
  const pivot=document.createElement('span');pivot.className='cake-berry';
  const berry=document.createElement('img');berry.src=CAKE_LAYERS.berry;berry.alt='';berry.draggable=false;
  pivot.append(berry);icon.append(base,pivot);return icon;
}

// Static frame previews use the same layered registration as the live sprite.
export function drawDessertIcon(ctx,icon,x,y,w,h){
  if(icon.classList.contains('cake-art')){
    const base=icon.querySelector('.cake-base'),berry=icon.querySelector('.cake-berry img');
    if(base.complete&&base.naturalWidth)ctx.drawImage(base,x,y,w,h);
    if(berry.complete&&berry.naturalWidth)ctx.drawImage(berry,x+w*.126,y+h*.006,w*.79,h*.79);
  }else {const image=icon.matches('.custard-art,.silhouette-art')?icon.querySelector('.contour-food'):icon;if(image.complete&&image.naturalWidth)ctx.drawImage(image,x,y,w,h);}
}

// Chapter 2 obstacle: a sugar-glaze shell over the dessert. Cracking it keeps the same piece.
// Kinds: glaze (winter, 1 layer), burr (autumn chestnut, 2 layers: intact → cracked), gift (winter box, opens into a special).
function syncFrost(node, p) {
  let shell = node.querySelector(':scope > .frost-shell:not(.cracking)');
  if (p.frost && !shell) { shell = document.createElement('span'); shell.className = 'frost-shell'; node.append(shell); node.dataset.frost = '1'; }
  if (p.frost && shell) { shell.dataset.kind = p.frostKind || 'glaze'; shell.dataset.layer = p.frost; }
  else if (!p.frost && shell) {
    delete node.dataset.frost; shell.classList.add('cracking');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || window.__CAKE_TEST_FAST__) shell.remove(); else setTimeout(() => shell.remove(), 520);
  }
}

const ITEM_ART = { mango: 'assets/item-mango-v45.webp' };
export function createPiece(p) {
  if (p.item) {
    const node = document.createElement('span'); node.className = 'dessert-piece item-piece'; node.dataset.pieceId = p.id; node.dataset.special = ''; node.dataset.material = 'firm'; node.dataset.item = p.item;
    const icon = document.createElement('img'); icon.className = 'dessert-icon'; icon.src = ITEM_ART[p.item]; icon.alt = ''; icon.draggable = false; icon.style.cssText = 'width:100%;height:100%;object-fit:contain';
    const shine = document.createElement('span'); shine.className = 'piece-shine'; node.append(icon, shine); return node;
  }
  const dessert = DESSERTS[p.type], node = document.createElement('span');
  node.className = 'dessert-piece'; node.dataset.pieceId = p.id; node.dataset.special = p.special || '';
  node.dataset.material = p.special === 'prism' ? 'firm' : ['cake','custard','choux','cone','donut','tart','macaron'][p.type];
  const shadow = document.createElement('span'); shadow.className = 'piece-shadow'; node.append(shadow);
  if (p.special) { const aura = document.createElement('span'); aura.className = 'special-aura'; aura.style.setProperty('--aura-phase', `${-(p.id % 11) * .37}s`); node.append(aura); }
  const art = p.special === 'prism' ? PRISM_ART : dessert.art;
  const layeredCake=node.dataset.material==='cake';
  const customIcon=layeredCake;
  const icon = layeredCake?createCakeIcon():document.createElement(art.single ? 'img' : 'span');
  if(!customIcon)icon.className = 'dessert-icon';
  if (art.single&&!customIcon) { icon.src = art.url; icon.alt = ''; icon.draggable = false; }
  else if(!customIcon) icon.style.backgroundImage = `url("${art.url}")`;
  if (art.box) {
    const [x,y,w,h] = art.box, scale = .88 / Math.max(w,h), size = art.size * scale;
    icon.style.backgroundSize = `${size * 100}% ${size * 100}%`;
    icon.style.backgroundPosition = `${(0.5-(x+w/2)*scale)/(1-size)*100}% ${(0.5-(y+h/2)*scale)/(1-size)*100}%`;
  }
  else if (art.single) { icon.style.width = '100%'; icon.style.height = '100%'; icon.style.objectFit = 'contain'; }
  else { icon.style.backgroundSize = `${art.columns * 100}% ${art.rows * 100}%`; icon.style.backgroundPosition = `${art.column * 100 / Math.max(1, art.columns - 1)}% ${art.row * 100 / Math.max(1, art.rows - 1)}%`; }
  // Flower and star specials both glow along the dessert's own outline (star: lavender-gold, plus a small inner sparkle).
  const fitted=p.special==='flame';
  node.classList.toggle('contour-piece',fitted);
  node.append(fitted?contourShell(icon,p.id,node.dataset.material):icon);
  const shine = document.createElement('span'); shine.className = 'piece-shine'; node.append(shine);
  // Star special: a small charm of twinkling sparkles in front of the dessert (glow and row/column rays sit behind it).
  if (p.special === 'cross') { const charm = document.createElement('span'); charm.className = 'star-charm'; charm.innerHTML = '<i></i><i></i><i></i><i></i>'; node.querySelector('.special-aura').innerHTML = '<b class="beam-h"></b><b class="beam-v"></b>'; charm.style.setProperty('--charm-phase', `${-(p.id % 5) * .53}s`); node.append(charm); }
  if (p.special) {
    const mark = document.createElement('span'); mark.className = 'special-mark';
    mark.textContent = p.special === 'prism' ? '✦' : p.special === 'cross' ? '✧' : '◎'; node.append(mark);
  }
  return node;
}

export function renderBoard(board, { selected, focused, distances = new Map(), motion = 'none', onLand = () => {}, onBirth = celebrateBirth, dust = null, buds = null, leaves = null }) {
  const root = document.getElementById('board'), previousFocus = root.contains(document.activeElement);
  const changed = board.some((p, index) => previousIds[index] !== p.id), positions = new Map();
  if (changed && motion !== 'none') for (const [id, node] of pieces) positions.set(id, node.getBoundingClientRect());
  if (!root.children.length) {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < SIZE * SIZE; index++) {
      const tile = document.createElement('button'); tile.className = 'tile'; tile.type = 'button'; tile.dataset.index = index; fragment.append(tile);
    }
    root.append(fragment);
  }
  const targets = changed && motion !== 'none' ? [...root.children].map(tile => tile.getBoundingClientRect()) : [];
  const step = targets.length ? targets[SIZE].y - targets[0].y : 0;
  const currentIds = new Set(board.map(p => p.id)), jobs = [], births = [];
  let landed = false;
  for (const [id, node] of pieces) if (!currentIds.has(id)) { stopPiece(node); node.remove(); pieces.delete(id); }
  board.forEach((p, index) => {
    const tile = root.children[index], dessert = DESSERTS[p.type] || { name: '芒果' }, existed = pieces.has(p.id);
    tile.classList.toggle('selected', selected === index);
    tile.classList.toggle('dusted', !!dust?.has(index));
    // Cell marks sit under the dessert: spring cherry buds, autumn fallen leaves.
    const markKind = buds?.has(index) ? 'bud' : leaves?.has(index) ? 'leaf' : '';
    let mark = tile.querySelector(':scope > .cell-mark');
    if (markKind && !mark) { mark = document.createElement('span'); mark.className = 'cell-mark'; tile.prepend(mark); }
    if (mark) { if (markKind) { mark.dataset.kind = markKind; mark.classList.remove('leaving'); } else if (!mark.classList.contains('leaving')) { mark.classList.add('leaving'); const m = mark; setTimeout(() => m.remove(), 480); } }
    if (changed) tile.classList.remove('clearing', 'queued', 'dragging', 'pressed');
    tile.dataset.type = p.type; tile.dataset.special = p.special || ''; tile.dataset.pieceId = p.id;
    tile.tabIndex = index === focused ? 0 : -1;
    const frostName = p.frost ? (p.frostKind === 'gift' ? '，禮物盒，旁邊消除就會打開' : p.frostKind === 'burr' ? '，被栗子殼包住，旁邊消除兩次才會剝開' : '，被糖霜包住，旁邊消除後才能移動') : p.item ? '，要送到最下面一排' : '';
    const specialName = p.special === 'flame' ? '花瓣爆破，配對後消除自身與周圍最多九格' : p.special === 'cross' ? '星光，配對後消除整行與整列' : p.special === 'prism' ? '彩虹糖球，和旁邊任一個甜點交換，消掉全部同款' : '';
    tile.setAttribute('aria-label', `第 ${Math.floor(index / SIZE) + 1} 行第 ${index % SIZE + 1} 格，${p.special === 'prism' ? '彩虹糖球' : dessert.name}${specialName ? '，' + specialName : ''}${frostName}${dust?.has(index) ? '，底下鋪著糖粉' : ''}`);
    tile.setAttribute('aria-pressed', selected === index ? 'true' : 'false');
    let node = pieces.get(p.id);
    if (!node) { node = createPiece(p); pieces.set(p.id, node); }
    syncFrost(node, p);
    const fall = distances.get(p.id) || 0;
    const reposition = node.parentElement !== tile || fall > 0 || motion === 'shuffle';
    // Reposition surviving pieces without cutting off their food/topping response.
    // A new landing replaces that response at contact; removed pieces stop fully.
    if (changed && existed && reposition) stopPiece(node, { keepMaterial: true });
    if (node.parentElement !== tile) tile.append(node);
    if (changed && motion !== 'none' && (reposition || !existed)) {
      const before = positions.get(p.id), after = targets[index];
      const dx = before ? before.x - after.x : 0, dy = before ? before.y - after.y : -fall * step;
      const born = !existed && !!p.special;
      if(born&&p.special==='flame')node.classList.add('birth-forming');
      if (dx || dy || born) jobs.push(animatePlacement(node, { dx, dy, fall, born, stagger: fall ? (index % SIZE) * 10 : 0, shuffle: motion === 'shuffle', onLand: () => { if (!landed) { landed = true; onLand(); } } }));
      if (born) births.push(index);
    }
  });
  previousIds = board.map(p => p.id);
  if (previousFocus) root.children[focused].focus({ preventScroll: true });
  return Promise.all(jobs).then(() => {
    for (const index of births) if (previousIds[index] === board[index].id) onBirth(index,board[index],pieces.get(board[index].id));
  });
}

export function renderStats({ score, best, chapter, busy, sound, goals = GOALS }) {
  const GOALS = goals;
  const $ = id => document.getElementById(id);
  $('score').textContent = score.toLocaleString(); $('best').textContent = best.toLocaleString();
  const current = Math.min(chapter, GOALS.length - 1), goal = GOALS[current];
  const complete = chapter >= GOALS.length;
  const progress = complete ? 100 : Math.min(100, Math.max(0, score / goal * 100));
  $('chapter').textContent = complete ? '✓' : String(chapter + 1).padStart(2, '0');
  $('goal-name').textContent = complete ? '新菜單完成，繼續收集好點子吧' : LABELS[current];
  $('goal-count').textContent = complete ? '自由靈感時間' : `${Math.min(score, goal).toLocaleString()} / ${goal.toLocaleString()}`;
  $('progress-fill').style.width = progress + '%';
  const track = document.querySelector('.progress-track'); track.setAttribute('aria-valuemax', String(goal)); track.setAttribute('aria-valuenow', String(Math.min(score, goal)));
  for (const id of ['hint', 'restart', 'story']) $(id).disabled = busy;
  $('sound-label').textContent = '音效 ' + (sound ? '開' : '關');
  $('sound-icon').src = sound ? 'assets/icon-sound-on-v56.webp' : 'assets/icon-sound-off-v56.webp';
  $('sound').setAttribute('aria-pressed', String(!!sound)); $('sound').setAttribute('aria-label', sound ? '關閉音效' : '開啟音效');
  $('sound').title = sound ? '關閉音效' : '開啟音效';
}

// She introduces herself as 春日苺香 at the end of spring; before that the script calls her 店主.
// game.js tells us when the player has heard her name, and every speaker label follows it.
let ownerNamed = () => false;
export const setOwnerNamed = fn => { ownerNamed = fn; };
export const speakerName = name => name === '店主' && ownerNamed() ? '苺香' : name;
export function createPortrait(name, expression = 'smile') {
  const frame = document.createElement('span'); frame.className = 'portrait-frame'; frame.setAttribute('aria-hidden', 'true');
  const portrait = document.createElement('span'); portrait.className = 'character-portrait';
  portrait.dataset.character = name === '蜜蜜' ? 'mimi' : 'owner'; portrait.dataset.expression = expression;
  frame.append(portrait); return frame;
}

export function renderComment(name, text, expression = 'smile') {
  const conversation = document.querySelector('.conversation'), portrait = conversation.querySelector('.character-portrait');
  document.getElementById('speaker').textContent = speakerName(name); document.getElementById('comment').textContent = text;
  portrait.dataset.character = name === '蜜蜜' ? 'mimi' : 'owner'; portrait.dataset.expression = expression;
  conversation.dataset.mood = expression;
  conversation.classList.remove('reacting'); void conversation.offsetWidth; conversation.classList.add('reacting');
}
