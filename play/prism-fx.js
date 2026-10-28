// Show the Flow flower without additional procedural target lines.
import {boardBounds,prepareFxSurface,deferArt} from './fx-surface.js';
const art=new Image();
let petals;
export const prismArtworkReady=deferArt(art,new URL('assets/prism-flow-v21.webp',import.meta.url).href,3);
// The extra footage is a studio candidate; do not load it during ordinary play.
export function preparePetals(){
  if(!petals){petals=new Image();petals.src=new URL('assets/petals-flow-v17.webp',import.meta.url).href;}
  return petals.decode().then(()=>true,()=>false);
}
export const prismDuration=2000,prismImpactTime=420,petalDuration=2500;
export const prismOpeningDuration=500,prismFadeDuration=350;
export const prismTailRate=(2800-prismOpeningDuration)/(prismDuration-prismOpeningDuration);
export const prismSourceTime=ms=>ms<=prismOpeningDuration?ms:prismOpeningDuration+(ms-prismOpeningDuration)*prismTailRate;
export const prismTimeForSource=ms=>ms<=prismOpeningDuration?ms:prismOpeningDuration+(ms-prismOpeningDuration)/prismTailRate;
const clamp=n=>Math.max(0,Math.min(1,n));
const ready=()=>art.complete&&art.naturalWidth===4608;
const dimensions=ctx=>{const dpr=ctx.getTransform().a||1;return [ctx.canvas.width/dpr,ctx.canvas.height/dpr];};
function plate(ctx,image,ms,count,x,y,size,cellWidth=384,cellHeight=384){
  const cell=Math.min(count-1,Math.floor(ms*24/1000));
  const width=size*cellWidth/cellHeight;
  ctx.drawImage(image,cell%8*cellWidth,Math.floor(cell/8)*cellHeight,cellWidth,cellHeight,x-width/2,y-size/2,width,size);
}
export function drawPrismFrame(ctx,p,targets,ms,useFlow=ready(),bounds=dimensions(ctx)){
  if(ms<0||ms>=prismDuration)return;
  const [w,h]=bounds,fade=1-clamp((ms-(prismDuration-prismFadeDuration))/prismFadeDuration);
  ctx.save();
  if(useFlow){ctx.globalAlpha=.86*fade;plate(ctx,art,prismSourceTime(ms),68,p.x,p.y,Math.max(w,h)*1.1,576,324);}
  else{
    const r=p.size*(.3+clamp(ms/500)*2.4),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
    g.addColorStop(0,'#fff6eb');g.addColorStop(.25,'#ffbfdf');g.addColorStop(1,'#ffbada00');
    ctx.globalAlpha=(1-clamp((ms-400)/800))*fade;ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
export function drawPetalFrame(ctx,ms,bounds=dimensions(ctx)){
  if(ms<0||ms>=petalDuration||!petals?.complete||!petals.naturalWidth)return;
  const [w,h]=bounds;ctx.save();ctx.globalAlpha=.9*clamp(ms/180)*(1-clamp((ms-2150)/350));
  plate(ctx,petals,ms,60,w/2,h/2,Math.max(w,h)*1.08);ctx.restore();
}
let canvas,context,frame=0,expiryTimer=0,bursts=[];
// A viewport-positioned surface escapes board and tray clipping without changing them.
function tick(now){
  frame=0;const layer=document.getElementById('board-effects');
  if(!layer||!bursts.length){clearPrismEffects();return;}
  bursts=bursts.filter(x=>x.age!==undefined||now-x.start<(x.kind==='petals'?petalDuration:prismDuration));
  if(!bursts.length){clearPrismEffects();return;}
  const b=boardBounds();
  if(!canvas?.isConnected){canvas=document.createElement('canvas');canvas.className='prism-fx';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);context=canvas.getContext('2d');}
  prepareFxSurface(canvas,context,b);
  for(const x of bursts){
    const age=x.age??now-x.start;
    if(x.kind==='petals'){
      context.save();context.beginPath();context.rect(0,0,b.width,b.height);context.clip();
      drawPetalFrame(context,age,[b.width,b.height]);context.restore();
    }else{
      const point={x:x.point.x*b.width/x.width,y:x.point.y*b.height/x.height,size:x.point.size*b.width/x.width};
      drawPrismFrame(context,point,x.targets,age,x.useFlow,[b.width,b.height]);
    }
  }
  context.restore();canvas.dataset.art=bursts.some(x=>x.useFlow)?'flow':'fallback';canvas.dataset.bursts=String(bursts.length);
  if(bursts.some(x=>x.age===undefined))frame=requestAnimationFrame(tick);
}
function armExpiry(){
  clearTimeout(expiryTimer);
  const deadlines=bursts.filter(x=>x.age===undefined).map(x=>x.start+(x.kind==='petals'?petalDuration:prismDuration));
  if(deadlines.length)expiryTimer=setTimeout(()=>{cancelAnimationFrame(frame);tick(performance.now());},Math.max(0,Math.max(...deadlines)-performance.now())+8);
}
function add(burst){
  const b=document.getElementById('board-effects')?.getBoundingClientRect();if(!b?.width||!b?.height)return;
  if(bursts.length>=6)bursts.shift();bursts.push({...burst,width:b.width,height:b.height,start:performance.now()});
  armExpiry();if(!frame)frame=requestAnimationFrame(tick);
}
export function startPrism(point,targets){add({point,targets,useFlow:ready()});}
export function showPrismFrame(point,ms){
  cancelAnimationFrame(frame);clearTimeout(expiryTimer);frame=0;
  const b=document.getElementById('board-effects')?.getBoundingClientRect();
  if(!b?.width||!b?.height||ms>=prismDuration){clearPrismEffects();return;}
  bursts=[{point,targets:[],useFlow:ready(),width:b.width,height:b.height,age:ms}];tick(performance.now());
}
// Paused inspection follows page scroll and responsive layout without an idle animation loop.
function repositionStill(){if(bursts.length&&bursts.every(x=>x.age!==undefined))tick(performance.now());}
window.addEventListener('scroll',repositionStill,{passive:true,capture:true});window.addEventListener('resize',repositionStill);
export function startPetalShower(){if(!matchMedia('(prefers-reduced-motion: reduce)').matches)add({kind:'petals',useFlow:true});}
export function clearPrismEffects(){cancelAnimationFrame(frame);clearTimeout(expiryTimer);frame=0;bursts=[];canvas?.remove();canvas=null;context=null;}
