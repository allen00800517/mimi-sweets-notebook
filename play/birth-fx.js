// Approved four-match birth plus studio-only tail/source candidates.
// Shared bounded playback; no idle rendering or eager decode.
import {boardBounds,prepareFxSurface,scaledPoint} from './fx-surface.js';
export const birthClips={
 birth:{start:1125,duration:1250,rate:2.3,fadeIn:55,fadeOut:250},
 'birth-petals':{start:2250,duration:1750,rate:1,fadeIn:100,fadeOut:250},
 'birth-source':{start:0,duration:4000,rate:1,fadeIn:20,fadeOut:160}
};
export const birthAudioSource=new URL('assets/birth-flow-v34.wav',import.meta.url).href;
export const birthArtworkReady=()=>!!(art?.complete&&art.naturalWidth===3072);
const clamp=n=>Math.max(0,Math.min(1,n));
let art,pending,canvas,context,frame=0,expiryTimer=0,bursts=[];
export function prepareBirth(){
 if(art?.complete&&art.naturalWidth===3072)return Promise.resolve(true);
 if(pending)return pending;
 const next=new Image();next.src=new URL('assets/birth-flow-v34.webp',import.meta.url).href;
 pending=next.decode().then(()=>{if(next.naturalWidth!==3072)throw Error('Birth atlas dimensions');art=next;return true;},()=>false).catch(()=>false).finally(()=>{pending=null;});
 return pending;
}
export const birthSourceTime=(name,ms)=>birthClips[name].start+ms*birthClips[name].rate;
export function drawBirthFrame(ctx,p,ms,name='birth',bounds){
 const clip=birthClips[name];if(!clip||ms<0||ms>=clip.duration||!art?.naturalWidth)return;
 const dpr=ctx.getTransform().a||1,[w,h]=bounds||[ctx.canvas.width/dpr,ctx.canvas.height/dpr];
 const width=name==='birth'?p.size*4:name==='birth-petals'?Math.max(w,h*16/9)*.85:w*.94;
 const height=width*9/16,cell=Math.min(95,Math.floor(birthSourceTime(name,ms)*24/1000));
 const opacity=clamp(ms/clip.fadeIn)*(1-clamp((ms-(clip.duration-clip.fadeOut))/clip.fadeOut));
 ctx.save();ctx.globalAlpha=opacity;
 ctx.drawImage(art,cell%8*384,Math.floor(cell/8)*216,384,216,p.x-width/2,p.y-height/2,width,height);ctx.restore();
}
function tick(now){
 frame=0;bursts=bursts.filter(b=>(b.age!==undefined||now-b.start<birthClips[b.name].duration)&&(!b.owner||b.owner.isConnected&&!b.owner.closest('.clearing')));
 const bounds=boardBounds();if(!bounds?.width||!bursts.length){clearBirthEffects();return;}
 if(!canvas?.isConnected){canvas=document.createElement('canvas');canvas.className='birth-fx';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);context=canvas.getContext('2d');}
 if(!context){clearBirthEffects();return;}prepareFxSurface(canvas,context,bounds);
 for(const b of bursts)drawBirthFrame(context,b.follow?.(bounds)||scaledPoint(b.point,b,bounds),b.age??(now-b.start),b.name,[bounds.width,bounds.height]);
 context.restore();canvas.dataset.art='flow';canvas.dataset.kind=bursts.at(-1).name;canvas.dataset.bursts=String(bursts.length);
 if(bursts.some(b=>b.age===undefined))frame=requestAnimationFrame(tick);
}
function expiry(){
 clearTimeout(expiryTimer);const deadlines=bursts.filter(b=>b.age===undefined).map(b=>b.start+birthClips[b.name].duration);
 if(deadlines.length)expiryTimer=setTimeout(()=>{cancelAnimationFrame(frame);tick(performance.now());},Math.max(0,Math.max(...deadlines)-performance.now())+8);
}
export function startBirth(point,name='birth',{owner,follow}={}){
 const bounds=boardBounds();if(!birthClips[name]||!bounds?.width||!art?.naturalWidth)return false;
 if(bursts.length>=6)bursts.shift();bursts.push({point,name,owner,follow,width:bounds.width,height:bounds.height,start:performance.now()});expiry();
 if(!frame)frame=requestAnimationFrame(tick);return true;
}
export function showBirthFrame(point,age,name='birth'){
 cancelAnimationFrame(frame);clearTimeout(expiryTimer);frame=0;
 const bounds=boardBounds();if(!birthClips[name]||!bounds?.width||age<0||age>=birthClips[name].duration){clearBirthEffects();return;}
 bursts=[{point,name,age,width:bounds.width,height:bounds.height}];tick(performance.now());
}
function repositionStill(){if(bursts.length&&bursts.every(b=>b.age!==undefined))tick(performance.now());}
window.addEventListener('scroll',repositionStill,{passive:true,capture:true});window.addEventListener('resize',repositionStill);
export function clearBirthEffects(){cancelAnimationFrame(frame);clearTimeout(expiryTimer);frame=0;bursts=[];canvas?.remove();canvas=null;context=null;}

export function cancelBirth(owner){
 bursts=bursts.filter(b=>b.owner!==owner);
 if(!bursts.length)clearBirthEffects();else expiry();
}
