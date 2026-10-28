// The horizontal Flow plate and its rotated copy share one source-time clock.
import {boardBounds,prepareFxSurface,scaledPoint,deferArt} from './fx-surface.js';
const art=new Image();
export const crossPlaybackRate=1.12;
export const crossDuration=2400, crossImpactTime=375/crossPlaybackRate;
export const crossFadeDuration=500, crossOpeningDuration=1000;
export const crossTailRate=(4750-crossOpeningDuration*crossPlaybackRate)/(crossDuration-crossOpeningDuration);
// Preserve the opening; move through the trailing footage faster after full expansion.
export const crossSourceTime=ms=>ms<=crossOpeningDuration?ms*crossPlaybackRate:
  crossOpeningDuration*crossPlaybackRate+(ms-crossOpeningDuration)*crossTailRate;
export const crossTimeForSource=ms=>ms<=crossOpeningDuration*crossPlaybackRate?ms/crossPlaybackRate:
  crossOpeningDuration+(ms-crossOpeningDuration*crossPlaybackRate)/crossTailRate;
export const crossArtworkReady=deferArt(art,new URL('assets/starline-flow-v14.webp',import.meta.url).href,2);
const ready=()=>art.complete&&art.naturalWidth===3072;
let canvas,context,frame=0,expiryTimer=0,bursts=[];
const clamp=n=>Math.max(0,Math.min(1,n));
let feathered,featherContext,featherCell=-1;
function sourcePlate(cell){
  if(!feathered){feathered=document.createElement('canvas');feathered.width=384;feathered.height=216;featherContext=feathered.getContext('2d');}
  if(featherCell!==cell){
    const c=featherContext;c.clearRect(0,0,384,216);c.globalCompositeOperation='source-over';
    c.drawImage(art,cell%8*384,Math.floor(cell/8)*216,384,216,0,0,384,216);
    // Only soften the original footage's cut ends, keeping all elements together.
    const fade=c.createLinearGradient(0,0,384,0);
    fade.addColorStop(0,'#0000');fade.addColorStop(.16,'#000');fade.addColorStop(.84,'#000');fade.addColorStop(1,'#0000');
    c.globalCompositeOperation='destination-in';c.fillStyle=fade;c.fillRect(0,0,384,216);c.globalCompositeOperation='source-over';featherCell=cell;
  }
  return feathered;
}
export function drawCrossFrame(ctx,p,ms,useFlow=ready(),bounds) {
  if(ms<0||ms>=crossDuration)return;
  const dpr=ctx.getTransform().a||1,[w,h]=bounds||[ctx.canvas.width/dpr,ctx.canvas.height/dpr];
  const edge=Math.max(w,h)*.22;
  const alpha=1-clamp((ms-(crossDuration-crossFadeDuration))/crossFadeDuration);
  ctx.save();
  if(useFlow){
    const cell=Math.min(113,Math.floor(crossSourceTime(ms)*24/1000)),plate=sourcePlate(cell);
    const thickness=p.size*4.6;
    // Split at the source centre so the crossing follows any triggered cell,
    // including corners. Keep the full plate outside the board; the shared surface
    // applies the optional board crop without changing beam size between modes.
    ctx.globalAlpha=.88*alpha;
    ctx.drawImage(plate,0,0,192,216,-edge,p.y-thickness/2,p.x+edge,thickness);
    ctx.drawImage(plate,192,0,192,216,p.x,p.y-thickness/2,w-p.x+edge,thickness);
    ctx.translate(p.x,p.y);ctx.rotate(Math.PI/2);ctx.globalAlpha=.78*alpha;
    ctx.drawImage(plate,0,0,192,216,-p.y-edge,-thickness/2,p.y+edge,thickness);
    ctx.drawImage(plate,192,0,192,216,0,-thickness/2,h-p.y+edge,thickness);
  }else{
    const strength=1-clamp((ms-350)/550);ctx.globalAlpha=strength;
    ctx.strokeStyle='#ffe4f0';ctx.lineWidth=p.size*(.10+.13*(1-clamp(ms/500)));ctx.shadowColor='#dc8fc5';ctx.shadowBlur=p.size*.3;
    ctx.beginPath();ctx.moveTo(0,p.y);ctx.lineTo(w,p.y);ctx.moveTo(p.x,0);ctx.lineTo(p.x,h);ctx.stroke();
  }
  ctx.restore();
}
function tick(now){
  frame=0;const b=boardBounds();bursts=bursts.filter(x=>x.age!==undefined||now-x.start<crossDuration);
  if(!b?.width||!bursts.length){clearCrossEffects();return;}
  if(!canvas?.isConnected){canvas=document.createElement('canvas');canvas.className='cross-fx';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);context=canvas.getContext('2d');}
  prepareFxSurface(canvas,context,b);
  for(const x of bursts)drawCrossFrame(context,scaledPoint(x.point,x,b),x.age??now-x.start,x.useFlow,[b.width,b.height]);
  context.restore();
  canvas.dataset.art=bursts.some(x=>x.useFlow)?'flow':'fallback';canvas.dataset.bursts=String(bursts.length);
  if(bursts.some(x=>x.age===undefined))frame=requestAnimationFrame(tick);
}
export function startCross(point){
  const b=boardBounds();if(!b?.width)return;
  if(bursts.length>=6)bursts.shift();bursts.push({point,width:b.width,height:b.height,start:performance.now(),useFlow:ready()});
  clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>{cancelAnimationFrame(frame);tick(performance.now());},crossDuration+8);
  if(!frame)frame=requestAnimationFrame(tick);
}
export function showCrossFrame(point,age){
  cancelAnimationFrame(frame);clearTimeout(expiryTimer);frame=0;
  const b=boardBounds();if(!b?.width||age>=crossDuration){clearCrossEffects();return;}
  bursts=[{point,age,width:b.width,height:b.height,useFlow:ready()}];tick(performance.now());
}
function repositionStill(){if(bursts.length&&bursts.every(b=>b.age!==undefined))tick(performance.now());}
window.addEventListener('scroll',repositionStill,{passive:true,capture:true});window.addEventListener('resize',repositionStill);
export function clearCrossEffects(){cancelAnimationFrame(frame);clearTimeout(expiryTimer);frame=0;bursts=[];canvas?.remove();canvas=null;context=null;}
