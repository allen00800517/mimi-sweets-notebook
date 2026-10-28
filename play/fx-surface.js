// Final art direction: all large effects stay inside the board.
// Legacy query parameters and stored comparison preferences are deliberately ignored.
export const effectBoundary=()=>'board';
export function boardBounds(){return document.getElementById('board-effects')?.getBoundingClientRect();}
export function scaledPoint(point,original,b){
  return {...point,x:point.x*b.width/original.width,y:point.y*b.height/original.height,size:point.size*b.width/original.width};
}
// Keep the same board coordinates and crop for every effect and inspection frame.
export function prepareFxSurface(canvas,ctx,b){
  const left=Math.max(0,b.left),top=Math.max(0,b.top);
  const width=Math.max(0,Math.min(document.documentElement.clientWidth,b.right)-left);
  const height=Math.max(0,Math.min(document.documentElement.clientHeight,b.bottom)-top);
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.style.cssText=`position:fixed;inset:auto;left:${left}px;top:${top}px;width:${width}px;height:${height}px;pointer-events:none;z-index:50`;
  canvas.dataset.boundary='board';
  const w=Math.round(width*dpr),h=Math.round(height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  ctx.save();ctx.translate(b.left-left,b.top-top);
  ctx.beginPath();ctx.roundRect(0,0,b.width,b.height,13);ctx.clip();
}
// Large Flow atlases (several MB each) load after the page's own art, in priority order,
// so the board, characters and fonts appear first on a slow phone connection.
// A first tap on the board also starts them, in case the player is quick.
const queue = [];
let released = false;
function release() {
  if (released) return; released = true;
  queue.sort((a, b) => a.priority - b.priority).forEach(({ img, url }, k) => setTimeout(() => { img.src = url; }, k * 250));
}
if (typeof window !== 'undefined') {
  const later = () => setTimeout(release, 400);
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
  window.addEventListener('pointerdown', release, { once: true, capture: true });
  setTimeout(release, 6000);
}
export function deferArt(img, url, priority = 1) {
  const done = new Promise(resolve => { img.addEventListener('load', () => resolve(true), { once: true }); img.addEventListener('error', () => resolve(false), { once: true }); });
  if (released) img.src = url; else queue.push({ img, url, priority });
  return done.then(ok => ok && img.decode().then(() => true, () => false));
}
