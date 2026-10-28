import {birthClips,startBirth,cancelBirth,clearBirthEffects} from './birth-fx.js';
import { startGold, goldChargeDuration, clearGoldEffects } from './gold-fx.js';
import { startCross, clearCrossEffects, crossImpactTime } from './cross-fx.js';
import { startPrism, clearPrismEffects, prismImpactTime } from './prism-fx.js';
// Movement and effects are separate from the match rules and artwork.
const boardRoot = () => document.getElementById('board');
const shortMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const motionTime = ms => window.__CAKE_TEST_FAST__ ? 2 : shortMotion() ? 1 : ms;
let dragPair = null;
let effectGeneration = 0;
const placements = new WeakMap();
const birthReveals=new Map();
function stopBirthReveal(node){clearTimeout(birthReveals.get(node));birthReveals.delete(node);node.classList.remove('birth-forming','birth-awakening');cancelBirth(node);}

export function stopPiece(node, { keepMaterial = false } = {}) {
  placements.get(node)?.cancel();
  if(!keepMaterial)stopBirthReveal(node);
  node.getAnimations().forEach(animation => animation.cancel());
  if (!keepMaterial) node.querySelector('.dessert-icon')?.getAnimations({subtree:true}).filter(a=>!a.animationName?.startsWith('contour-')).forEach(animation => animation.cancel());
  node.classList.remove('moving');
  node.style.transform = ''; node.style.opacity = '';
}

// Start every material response from its visible pose, then absorb the force.
// Segment easing keeps the final wiggles from being rushed by one global ease-out.
function flex(node,poses,duration,origin='50% 82%'){
  const from=getComputedStyle(node).transform;
  node.getAnimations().forEach(animation=>animation.cancel());
  const times=[.085,.30,.52,.72,.88];
  const frames=[{transform:from,transformOrigin:origin,offset:0,easing:'ease-out'},
    ...poses.map((transform,i)=>({transform,transformOrigin:origin,offset:times[i],easing:'cubic-bezier(.37,0,.63,1)'})),
    {transform:'scale(1) rotate(0deg)',transformOrigin:origin,offset:1}];
  void animate(node,frames,duration,{easing:'linear'});
}
const dessertProfiles={
  macaron:{duration:410,origin:'50% 82%',poses:[[1.095,.91,-4],[.958,1.055,3.1],[1.022,.978,-1.7],[.993,1.012,.65],[1.003,.997,-.15]]},
  choux:{duration:430,origin:'50% 82%',poses:[[1.13,.86,-2.8],[.947,1.077,2.3],[1.031,.97,-1.25],[.989,1.014,.5],[1.003,.997,-.12]]},
  cone:{duration:500,origin:'28% 87%',poses:[[1,1,-9],[1,1,6.8],[1,1,-3.6],[1,1,1.5],[1,1,-.4]]},
  donut:{duration:450,origin:'50% 75%',poses:[[1.14,.85,5.5],[.94,1.086,-4.2],[1.038,.966,2.25],[.985,1.02,-.85],[1.004,.996,.22]]},
  tart:{duration:360,origin:'50% 82%',poses:[[1.035,.969,-5.2],[.995,1.013,3.5],[1.011,.992,-1.7],[.998,1.003,.6],[1,1,-.13]]},
  custard:{duration:460,origin:'50% 85%',poses:[[1.19,.81,-3.8],[.92,1.11,3],[1.054,.955,-1.9],[.978,1.03,.9],[1.008,.99,-.25]]},
  cake:{duration:340,origin:'50% 84%',poses:[[1.065,.94,-1.8],[.978,1.039,1.5],[1.013,.985,-.8],[.995,1.008,.28],[1.001,.999,-.06]]}
};
function materialMotion(node,kind,{direction=1,weight=1}={}){
  if(shortMotion()||window.__CAKE_TEST_FAST__)return;
  const profile=dessertProfiles[node.dataset.material],icon=node.querySelector('.dessert-icon');
  if(!profile||!icon)return;
  const landing=kind==='land',amount=(landing?1:.62)*weight;
  flex(icon,profile.poses.map(([x,y,angle])=>`scale(${1+(x-1)*amount},${1+(y-1)*amount}) rotate(${angle*amount*direction}deg)`),landing?profile.duration:profile.duration*.82,profile.origin);
  const berry=icon.querySelector('.cake-berry');
  if(berry){
    const from=getComputedStyle(berry).transform;berry.getAnimations().forEach(animation=>animation.cancel());
    const angle=(landing?20:14)*direction;
    void animate(berry,[
      {transform:from,offset:0,easing:'ease-in-out'},
      {transform:`rotate(${-angle}deg)`,offset:.20,easing:'ease-in-out'},
      {transform:`rotate(${angle*.68}deg)`,offset:.43,easing:'ease-in-out'},
      {transform:`rotate(${-angle*.34}deg)`,offset:.65,easing:'ease-in-out'},
      {transform:`rotate(${angle*.13}deg)`,offset:.83,easing:'ease-in-out'},
      {transform:'rotate(0deg)',offset:1}
    ],landing?560:420,{delay:landing?22:12,easing:'linear'});
  }
}

async function animate(node, frames, ms, { hold = false, delay = 0, easing = 'cubic-bezier(.2,.75,.25,1)', deadline } = {}) {
  const animation = node.animate(frames, { duration: motionTime(ms), delay: delay ? motionTime(delay) : 0, easing, fill: 'both' });
  let timer;
  try {
    // Source audio and canvas VFX have a wall-clock deadline. The browser may
    // deliver animation.finished much later when its rendering is throttled.
    await (deadline === undefined ? animation.finished : Promise.race([
      animation.finished, new Promise(resolve => { timer=setTimeout(resolve,Math.max(0,deadline-performance.now())); })
    ]));
  } catch { return; } finally { clearTimeout(timer); }
  if (hold) node.style.transform = frames.at(-1).transform;
  animation.cancel();
}

function pairNodes(a, b) {
  const tiles = boardRoot().children;
  const first = tiles[a]?.querySelector('.dessert-piece'), second = tiles[b]?.querySelector('.dessert-piece');
  if (!first || !second) return null;
  const start = tiles[a].getBoundingClientRect(), end = tiles[b].getBoundingClientRect();
  return { first, second, dx: end.x - start.x, dy: end.y - start.y, a, b };
}

export function previewDrag(a, b, progress) {
  if (dragPair && (dragPair.a !== a || dragPair.b !== b)) clearDrag(false);
  const pair = pairNodes(a, b); if (!pair) return;
  dragPair = pair; const amount = Math.min(.88, Math.max(0, progress));
  for (const [node, sign] of [[pair.first, 1], [pair.second, -1]]) {
    if (placements.has(node)) stopPiece(node, { keepMaterial: true });
    node.closest('.tile').classList.add('dragging');
    node.style.transform = `translate(${pair.dx * amount * sign}px,${pair.dy * amount * sign}px) rotate(${amount * sign * 6}deg) scale(1.045)`;
  }
}

export function clearDrag(returnSmoothly = true) {
  const pair = dragPair; dragPair = null; if (!pair) return;
  for (const node of [pair.first, pair.second]) {
    node.closest('.tile')?.classList.remove('dragging');
    if (returnSmoothly) {
      const from = getComputedStyle(node).transform; node.style.transform = '';
      void animate(node, [{ transform: from }, { transform: 'translate(0,0)' }], 110);
    } else stopPiece(node);
  }
}

export async function animateSwap(a, b, valid) {
  const pair = pairNodes(a, b); if (!pair) return;
  const dragged = dragPair?.a === a && dragPair?.b === b;
  dragPair = null; const moving = [[pair.first, 1], [pair.second, -1]];
  for (const [node] of moving) node.closest('.tile').classList.remove('selected', 'dragging');
  await Promise.all(moving.map(([node, sign]) => {
    materialMotion(node, 'swap', { direction: (Math.sign(pair.dx || pair.dy) || 1) * sign });
    const from = getComputedStyle(node).transform; node.getAnimations().forEach(animation => animation.cancel());
    // A released drag finishes from its current position without stepping backwards.
    if (dragged) return animate(node, [
      { transform: from },
      { transform: `translate(${pair.dx * sign}px,${pair.dy * sign}px)` }
    ], 105, { hold: true, easing: 'cubic-bezier(.2,.7,.3,1)' });
    return animate(node, [
      { transform: from },
      { transform: `translate(${pair.dx * sign * .76}px,${pair.dy * sign * .76 - sign * 3}px) rotate(${sign * 6}deg)`, offset: .60 },
      { transform: `translate(${pair.dx * sign}px,${pair.dy * sign}px)` }
    ], 155, { hold: true, easing: 'cubic-bezier(.22,.65,.28,1)' });
  }));
  if (valid) return;
  await Promise.all(moving.map(([node, sign]) => animate(node, [
    { transform: `translate(${pair.dx * sign}px,${pair.dy * sign}px)` },
    { transform: `translate(${-pair.dx * sign * .045}px,${-pair.dy * sign * .045}px)`, offset: .85 },
    { transform: 'translate(0,0)' }
  ], 125, { hold: true })));
  for (const [node] of moving) node.style.transform = '';
}

export function animatePlacement(node, { dx = 0, dy = 0, fall = 0, born = false, shuffle = false, stagger = 0, onLand = () => {} } = {}) {
  placements.get(node)?.cancel();
  const descent = fall ? Math.min(260, 72 + Math.sqrt(fall) * 62) : 0;
  const firm = fall > 0 && node.dataset.material !== 'custard';
  const weight = Math.min(1,Math.sqrt(fall)/2.5);
  const ms = shuffle ? 280 : fall ? descent + 115 : 200;
  const contact = fall ? descent / ms : .76;
  let frame = 0, landed = false, resolveContact;
  const settled = fall ? new Promise(resolve => { resolveContact = resolve; }) : null;
  node.classList.add('moving');
  const animation = node.animate([
    { transform: `translate(${dx}px,${dy}px) scale(${born ? '.65' : '1'})`, opacity: born ? .55 : 1, easing: fall ? 'cubic-bezier(.32,0,.72,.45)' : 'cubic-bezier(.2,.75,.25,1)' },
    { transform: `translate(0,${fall ? 1.5 : 0}px) scale(${born && !fall ? '1.1' : '1'})`, opacity: 1, offset: contact, easing: 'ease-out' },
    { transform: `translate(0,${fall ? firm ? -1.8*weight : -.5 : 0}px) scale(${fall ? firm ? '1' : '.99,1.015' : '1'})`, opacity: 1, offset: contact + (1-contact)*(firm ? .45 : .55), easing:firm ? 'ease-in' : 'linear' },
    { transform: 'translate(0,0) scale(1)', opacity: 1 }
  ], { duration: motionTime(ms), delay: stagger ? motionTime(stagger) : 0, easing: 'linear', fill: 'both' });
  const job = { cancel() { cancelAnimationFrame(frame); animation.cancel(); } };
  placements.set(node, job);
  const land = () => {
    if (landed || !fall || placements.get(node) !== job) return;
    landed = true; materialMotion(node, 'land', { direction: Number(node.dataset.pieceId || 0) % 2 ? -1 : 1, weight: .75 + .3 * weight }); onLand(); resolveContact();
  };
  // The same animation clock drives contact, sound, deformation and refill.
  // A wall-clock timer can fire before the browser has drawn the landing frame.
  const observeContact = () => {
    if (placements.get(node) !== job || animation.playState === 'idle') return;
    if (Number(animation.currentTime) >= (stagger ? motionTime(stagger) : 0) + motionTime(ms) * contact) land();
    else frame = requestAnimationFrame(observeContact);
  };
  if (fall) frame = requestAnimationFrame(observeContact);
  const finished = animation.finished.then(land, () => {}).finally(() => {
    cancelAnimationFrame(frame); animation.cancel();
    if (placements.get(node) === job) { placements.delete(node); node.classList.remove('moving'); }
  });
  // The grid can continue at contact; the small settling tail stays decorative.
  // Cancellation also resolves the race, so reset cannot leave a turn pending.
  return settled ? Promise.race([settled, finished]) : finished;
}

const effectsRoot = () => document.getElementById('board-effects');
function effect(name, x, y, properties = {}) {
  const layer = effectsRoot(); if (!layer) return null;
  const node = document.createElement('span'); node.className = 'board-effect ' + name;
  node.style.left = `${x}px`; node.style.top = `${y}px`;
  for (const [key, value] of Object.entries(properties)) node.style.setProperty(key, value);
  node.addEventListener('animationend', () => node.remove(), { once: true }); layer.append(node); return node;
}

function center(index) {
  const rect = boardRoot().children[index].getBoundingClientRect(), origin = effectsRoot().getBoundingClientRect();
  return { x: rect.x - origin.x + rect.width / 2, y: rect.y - origin.y + rect.height / 2, size: rect.width };
}

export function celebrateBirth(index,p,node=boardRoot()?.children[index]?.querySelector('.dessert-piece')) {
  node?.classList.remove('birth-forming');
  if (shortMotion() || window.__CAKE_TEST_FAST__ || !effectsRoot()) return false;
  const point=center(index);
  if((p?.special??node?.dataset.special)==='flame'&&node&&startBirth(point,'birth',{owner:node,follow:bounds=>{
    const rect=node.getBoundingClientRect(),tile=node.closest('.tile').getBoundingClientRect();
    return {x:rect.x-bounds.x+rect.width/2,y:rect.y-bounds.y+rect.height/2,size:tile.width};
  }})){
    clearTimeout(birthReveals.get(node));node.classList.add('birth-awakening');
    birthReveals.set(node,setTimeout(()=>{birthReveals.delete(node);node.classList.remove('birth-awakening');},birthClips.birth.duration));
    return true;
  }
  effect('birth-ring',point.x,point.y,{'--size':`${point.size*1.3}px`});return false;
}

export async function animateClear(board, plan, { prismOrigins = [], gained = 0, chain = 1, onPhase = () => {} } = {}) {
  const generation = effectGeneration;
  const flames = [...plan.triggered].filter(index => board[index]?.special === 'flame');
  const crosses = [...plan.triggered].filter(index => board[index]?.special === 'cross');
  const prisms = [...new Set([...prismOrigins, ...[...plan.triggered].filter(i => board[i]?.special === 'prism')])];
  const started = performance.now();
  const fullMotion = !shortMotion() && !window.__CAKE_TEST_FAST__;
  const points = new Map([...new Set([...plan.remove, ...plan.triggered, ...plan.creations.keys(), ...prisms])].map(i => [i, center(i)]));
  const impacts = new Map();
  // Prism hits retain a short readable silhouette, then gather in a restrained
  // ripple. No extra rays or particles compete with the submitted Flow footage.
  for(const origin of prisms)for(const target of plan.remove){
    const distance=Math.hypot(Math.floor(target/8)-Math.floor(origin/8),target%8-origin%8);
    const delay=Math.min(72,distance*12);
    if(!impacts.has(target)||delay<impacts.get(target).delay)impacts.set(target,{origin:points.get(origin),delay,prism:true});
  }
  if(fullMotion)for(const origin of prisms)startPrism(points.get(origin),[...plan.remove].map(i=>points.get(i)));
  for(const origin of crosses){
    if(fullMotion)startCross(points.get(origin));
    for(const target of plan.remove){
      const dr=Math.floor(target/8)-Math.floor(origin/8),dc=target%8-origin%8;
      if(dr&&dc)continue;
      const delay=(Math.abs(dr)+Math.abs(dc))*12;
      if(!impacts.has(target)||delay<impacts.get(target).delay)impacts.set(target,{origin:points.get(origin),delay,cross:true});
    }
  }
  for (const origin of flames) for (const target of plan.remove) {
    const dr = Math.floor(target / 8) - Math.floor(origin / 8), dc = target % 8 - origin % 8;
    if (Math.abs(dr) > 1 || Math.abs(dc) > 1) continue;
    const delay = Math.hypot(dr, dc) * 38;
    if (!impacts.has(target) || delay < impacts.get(target).delay) impacts.set(target, { origin: points.get(origin), delay });
  }
  // Reserve removed pieces before anticipation; surviving pieces still accept queued input.
  for (const index of plan.remove) boardRoot().children[index]?.classList.add('clearing');
  if (flames.length) {
    onPhase('charge', chain);
    if(fullMotion)flames.forEach(index => {
      const point = points.get(index);
      const targets = [...plan.remove].filter(target => Math.abs(Math.floor(target/8)-Math.floor(index/8))<=1 && Math.abs(target%8-index%8)<=1)
        .map(target => ({...points.get(target),delay:Math.hypot(Math.floor(target/8)-Math.floor(index/8),target%8-index%8)*38}));
      startGold(point,targets,started);
    });
    await Promise.all(flames.map(index => {
      const node = boardRoot().children[index]?.querySelector('.dessert-piece');
      return node && animate(node, [
        { transform: 'scale(1)', filter: 'brightness(1)' },
        { transform: 'translateY(1px) scale(1.07,.91)', filter: 'brightness(1.04)', offset: .38 },
        { transform: 'translateY(1px) scale(.82,.88)', filter: 'brightness(1.3)' }
      ], goldChargeDuration, { hold: true, easing: 'cubic-bezier(.5,0,1,.5)', deadline: started+motionTime(goldChargeDuration) });
    }));
    if (generation !== effectGeneration) return;
    onPhase('impact', chain);
  } else if (!crosses.length && !prisms.length && plan.creations.size) onPhase('birth', chain);
  else if (!crosses.length && !prisms.length) onPhase('match', chain);
  if(crosses.length){
    await Promise.all(crosses.map(index=>animate(boardRoot().children[index].querySelector('.dessert-piece'),[
      {transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(.9,1.08)',filter:'brightness(1.35)'}
    ],Math.max(1,crossImpactTime-(performance.now()-started)),{hold:true})));
    if(generation!==effectGeneration)return;
    onPhase('cross',chain);
  }
  if(prisms.length){
    await Promise.all(prisms.map(index=>animate(boardRoot().children[index].querySelector('.dessert-piece'),[
      {transform:'scale(1)'},{transform:'scale(.88)',filter:'brightness(1.3)'}
    ],Math.max(1,prismImpactTime-(performance.now()-started)),{hold:true})));
    if(generation!==effectGeneration)return;
    onPhase('prism',chain);
  }
  const layer = effectsRoot();
  if (layer && fullMotion) {
    const bounds = boardRoot().getBoundingClientRect(), base = layer.getBoundingClientRect();
    if (flames.length) void animate(boardRoot(), [
      { transform: 'translate(0,0)' }, { transform: 'translate(1px,3px)', offset: .12 },
      { transform: 'translate(-1px,-2px)', offset: .36 }, { transform: 'translate(0,1px)', offset: .64 }, { transform: 'translate(0,0)' }
    ], 190);
    const indices = [...plan.remove];
    for (const index of indices.filter((_, position) => !flames.length && position % Math.max(1, Math.ceil(indices.length / 6)) === 0)) {
      const point = center(index);
      const direction = index % 2 ? 1 : -1;
      effect('sugar-spark', point.x, point.y, { '--dx': `${direction * (8 + point.size * .22)}px`, '--dy': `${-12 - point.size * .22}px` });
    }
    if (indices.length) {
      const points = indices.map(center), point = points.reduce((p, q) => ({ x: p.x + q.x / points.length, y: p.y + q.y / points.length }), { x: 0, y: 0 });
      const score = effect('floating-score' + (chain > 1 ? ' chain-score' : ''), Math.max(55, Math.min(base.width - 55, point.x)), Math.max(55, point.y));
      if (chain > 1) { score.textContent = `${chain} 連鎖`; const gain = document.createElement('span'); gain.className = 'score-gain'; gain.textContent = `+${gained}`; score.append(gain); }
      else score.textContent = `+${gained}`;
    }
  }
  return Promise.all([...plan.remove].map(index => {
    const tile = boardRoot().children[index], original = tile?.querySelector('.dessert-piece'); if (!original) return;
    tile.classList.add('clearing');
    // Keep the artwork's disappearance independent of the live piece grid.
    // Once the silhouette has broken up, falling pieces can already refill it.
    let node = original, ghost;
    if (fullMotion && layer) {
      const point = points.get(index);
      ghost = document.createElement('span'); ghost.className = 'clear-ghost';
      ghost.style.cssText = `left:${point.x-point.size/2}px;top:${point.y-point.size/2}px;width:${point.size}px;height:${point.size}px`;
      node = original.cloneNode(true); node.classList.remove('moving');
      node.removeAttribute('data-piece-id'); node.style.cssText = '';
      const originals = original.querySelectorAll('.dessert-icon,.cake-berry');
      node.querySelectorAll('.dessert-icon,.cake-berry').forEach((part,i) => {
        const pose = getComputedStyle(originals[i]);
        part.style.transform = pose.transform; part.style.transformOrigin = pose.transformOrigin;
      });
      node.querySelector('.special-aura')?.remove();
      ghost.append(node); layer.append(ghost);
      // A live landing animation must not override the hidden original's opacity.
      stopPiece(original); original.style.opacity = '0';
    }
    const finish = (frames, duration, options = {}, release = duration) => {
      const animation = animate(node, frames, duration, options).then(() => { if (ghost) ghost.remove(); else original.style.opacity = '0'; });
      if (!ghost) return animation;
      let timer;
      const ready = new Promise(resolve => { timer = setTimeout(resolve, motionTime(release + (options.delay || 0))); });
      return Promise.race([animation, ready]).finally(() => clearTimeout(timer));
    };
    // A newly formed ability gathers its matching ingredients into its own cell.
    const destination = plan.triggered.size ? undefined : [...plan.creations.keys()].filter(target =>
      board[target].type === board[index].type && (Math.floor(target / 8) === Math.floor(index / 8) || target % 8 === index % 8)
    ).sort((a, b) => Math.abs(a - index) - Math.abs(b - index))[0];
    if (destination !== undefined) {
      const start = center(index), end = center(destination);
      return finish([
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.09)', opacity: 1, offset: .22 },
        { transform: `translate(${end.x - start.x}px,${end.y - start.y}px) scale(.18)`, opacity: 0 }
      ], 175, {}, 150);
    }
    const impact = impacts.get(index), origin = impact?.origin;
    if(impact?.prism)return finish([
      {transform:'scale(1)',opacity:1,filter:'brightness(1)'},
      {transform:'translateY(-2px) scale(1.12)',opacity:1,filter:'brightness(1.65) drop-shadow(0 0 2px #f9c8e5)',offset:.18},
      {transform:'translateY(-2px) scale(1.12)',opacity:1,filter:'brightness(1.45)',offset:.32},
      {transform:'translateY(-1px) scale(.3)',opacity:.12,filter:'brightness(1.15)',offset:.76},
      {transform:'scale(.05)',opacity:0,filter:'brightness(1)'}
    ],210,{delay:impact.delay,easing:'cubic-bezier(.25,.55,.35,1)'},145);
    const point = origin && points.get(index),push=impact?.cross ? .10 : .4, dx = point ? (point.x - origin.x) * push : 0, dy = point ? (point.y - origin.y) * push : 0;
    if (origin) return finish([
      { transform: flames.includes(index) ? 'scale(.82,.88)' : 'scale(1)', opacity: 1, filter: 'brightness(1)' },
      { transform: `translate(${dx*.14}px,${dy*.14}px) scale(1.26,.86)`, opacity: 1, filter: 'brightness(1.95) drop-shadow(0 0 3px #ffd5e9)', offset: .12 },
      { transform: `translate(${dx*.7}px,${dy*.7-3}px) scale(.86,1.12) rotate(${dx>0?12:-12}deg)`, opacity: .8, filter: 'brightness(1.2)', offset: .43 },
      { transform: `translate(${dx}px,${dy}px) scale(.35) rotate(${dx>0?28:-28}deg)`, opacity: 0, filter: 'brightness(1)', offset: .86 },
      { transform: `translate(${dx*1.1}px,${dy*1.1}px) scale(.2)`, opacity: 0 }
    ], 235, { delay: impact.delay, easing: 'cubic-bezier(.2,.65,.3,1)' }, 145);
    const ripple = [...plan.remove].indexOf(index) % 5 * 14;
    return finish([
      { transform:'scale(1)',opacity:1,filter:'brightness(1)',offset:0,easing:'ease-out' },
      { transform:'scale(.96,1.04)',opacity:1,filter:'brightness(1.05)',offset:.16,easing:'ease-out' },
      { transform:'translateY(-3px) scale(1.16,.94)',opacity:1,filter:'brightness(1.22)',offset:.38,easing:'ease-in' },
      { transform:`translateY(-5px) scale(.28) rotate(${index%2?12:-12}deg)`,opacity:.16,filter:'brightness(1.15)',offset:.82,easing:'ease-out' },
      { transform:'translateY(-6px) scale(.04)',opacity:0,filter:'brightness(1)',offset:1 }
    ],230,{delay:ripple,easing:'linear'},165);

  }));
}

export function clearEffects() {
  effectGeneration++;
  for(const node of [...birthReveals.keys()])stopBirthReveal(node);clearBirthEffects();
  clearGoldEffects();
  clearCrossEffects();
  clearPrismEffects();
  const layer = effectsRoot();
  layer?.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  layer?.replaceChildren();
  if (boardRoot()) { stopPiece(boardRoot()); boardRoot().querySelectorAll('.dessert-piece').forEach(stopPiece); }
  clearDrag(false);
}
