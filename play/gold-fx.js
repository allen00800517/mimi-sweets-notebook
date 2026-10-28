// A single bounded, demand-driven canvas: no loop runs while the board is idle.
// Coordinates are CSS pixels relative to #board-effects, like the piece ghosts.
import {boardBounds,prepareFxSurface,scaledPoint,deferArt} from './fx-surface.js';
let canvas, context, frame = 0, expiryTimer=0;
let bursts = [];
const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => 1 - (1-clamp(value)) ** 3;
const flowAtlas = new Image();
const flowCell = 384;
export const goldChargeDuration = 145;
export const goldEffectDuration = 2350;
// Decode early without delaying input. Each explosion locks its renderer once,
// so a late asset load cannot replace the effect midway through its flight.
export const goldArtworkReady = deferArt(flowAtlas, new URL('assets/floral-flow-v12.png', import.meta.url).href, 0);
const flowReady = () => flowAtlas.complete && flowAtlas.naturalWidth === flowCell*8;

function surface() {
  const bounds=boardBounds();
  if (!bounds?.width) return false;
  if (!canvas?.isConnected) {
    canvas = document.createElement('canvas'); canvas.className = 'gold-fx';
    canvas.setAttribute('aria-hidden','true'); document.body.append(canvas);
    context = canvas.getContext('2d');
  }
  if(!context)return false;
  prepareFxSurface(canvas,context,bounds);
  return bounds;
}

function glow(ctx, x, y, radius, opacity) {
  if (radius <= 0 || opacity <= 0) return;
  const gradient = ctx.createRadialGradient(x,y,0,x,y,radius);
  gradient.addColorStop(0,`rgba(255,242,229,${opacity})`);
  gradient.addColorStop(.23,`rgba(250,181,209,${opacity*.72})`);
  gradient.addColorStop(.62,`rgba(213,123,178,${opacity*.18})`);
  gradient.addColorStop(1,'rgba(213,123,178,0)');
  ctx.fillStyle=gradient; ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
}

function arc(ctx,radius,start,length,width,color) {
  ctx.beginPath(); ctx.arc(0,0,Math.max(.01,radius),start,start+length);
  ctx.lineWidth=width; ctx.strokeStyle=color; ctx.stroke();
}

// Pure drawing function is shared by live animation and the frame inspection lab.
// age < 0 is the 145ms anticipation, age >= 0 is the burst and its settling tail.
export function drawProceduralGoldFrame(ctx, point, targets, age) {
  const s=point.size;
  ctx.save(); ctx.translate(point.x,point.y); ctx.lineCap='round';
  if(age<0) {
    const t=clamp((age+145)/145), radius=s*(.72-.4*ease(t));
    glow(ctx,0,0,s*.76,.1+t*.24);
    for(let n=0;n<3;n++) {
      const angle=n*TAU/3+t*1.8;
      arc(ctx,radius,angle,.88,s*.023,'#ffe1ed');
      arc(ctx,radius+s*.035,angle+.12,.55,s*.009,'#d991b2');
    }
    for(let n=0;n<8;n++) {
      const angle=n*TAU/8+t*.75, r=s*(.94-.63*ease(t));
      ctx.globalAlpha=.3+t*.7; ctx.fillStyle=n%2?'#fff0ec':'#f5bed5';
      ctx.beginPath();ctx.ellipse(Math.cos(angle)*r,Math.sin(angle)*r,s*.018,s*.035,angle,0,TAU);ctx.fill();
    }
    ctx.restore(); return;
  }
  // The white-hot core is brief; a hollow, broken wave then exposes the food.
  const core=1-clamp(age/115), wave=clamp(age/285), radius=s*(.16+1.52*ease(wave));
  glow(ctx,0,0,s*(.7+wave*.8),core*.8);
  if(age<75) {
    const t=clamp(age/75); ctx.globalAlpha=(1-t)*.94;ctx.fillStyle='#fff3ea';
    ctx.beginPath();
    for(let n=0;n<16;n++) {
      const angle=n*TAU/16, r=s*(n%2?.16:.43)*(1+t*.45);
      const x=Math.cos(angle)*r,y=Math.sin(angle)*r;
      if(!n)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();ctx.fill();
  }
  if(age<285) {
    ctx.globalAlpha=(1-wave)**.7;
    for(let n=0;n<5;n++) {
      const angle=n*TAU/5+wave*.24;
      // Tapered ribbons have a moving head and a thinner broken trailing edge.
      for(let segment=0;segment<8;segment++) {
        const taper=Math.sin((segment+1)/9*Math.PI), length=(1.02-wave*.3)/8;
        arc(ctx,radius,angle+segment*length,length+.01,s*(.12-.08*wave)*taper,'#e4a0c2');
      }
      arc(ctx,radius-s*.028,angle+.11,.8-wave*.25,s*.025,'#fff0ee');
      arc(ctx,radius+s*.09,angle+.17,.45,s*.012,'#d7b9ed');
    }
  }
  // Stretched trails give way to individual rotating sugar chips, with gravity.
  for(let n=0;n<22;n++) {
    const life=450+(n%5)*42, t=clamp(age/life); if(t>=1)continue;
    const angle=n*2.399963+.17, reach=s*(.88+(n%4)*.24);
    const flight=1-(1-t)**2, x=Math.cos(angle)*reach*flight;
    const y=Math.sin(angle)*reach*flight+s*.5*t*t;
    ctx.globalAlpha=(1-t)**.75;ctx.save();ctx.translate(x,y);
    if(t<.42) {
      ctx.rotate(angle);ctx.fillStyle='#ffd4e5';
      ctx.beginPath();ctx.ellipse(-s*.08*(1-t),0,s*.16*(1-t),s*.019,0,0,TAU);ctx.fill();
    } else ctx.rotate(angle+t*(n%2?4:-3));
    const chip=s*(n%3===0?.06:.038)*(1-t*.5);
    ctx.fillStyle=n%3===0?'#fff1ed':n%3===1?'#e9a3c4':'#c88cbd';
    ctx.beginPath();ctx.moveTo(-chip,-chip*.6);ctx.lineTo(chip*.65,-chip);
    ctx.lineTo(chip,chip*.35);ctx.lineTo(-chip*.5,chip);ctx.closePath();ctx.fill();
    if(n%4===0 && t>.28) {
      const shine=Math.sin(clamp((t-.28)/.55)*Math.PI)*s*.065;
      ctx.fillStyle='#fff4ed';ctx.beginPath();ctx.moveTo(-shine,0);ctx.quadraticCurveTo(0,0,0,-shine*1.7);
      ctx.quadraticCurveTo(0,0,shine,0);ctx.quadraticCurveTo(0,0,0,shine*1.7);ctx.quadraticCurveTo(0,0,-shine,0);ctx.fill();
    }
    ctx.restore();
  }
  // Local contact glints reach each affected cell after the travelling wave.
  for(const target of targets) {
    const elapsed=age-target.delay; if(elapsed<0||elapsed>165)continue;
    const t=elapsed/165,x=target.x-point.x,y=target.y-point.y;
    ctx.globalAlpha=1;glow(ctx,x,y,s*.42,(1-t)*.25);
    ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle='#ffe0ee';ctx.lineWidth=s*.013;
    for(let n=0;n<4;n++) {
      const a=n*TAU/4+.3,r=s*(.08+.2*t);
      ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
      ctx.lineTo(x+Math.cos(a)*(r+s*.09*(1-t)),y+Math.sin(a)*(r+s*.09*(1-t)));ctx.stroke();
    }
  }
  ctx.restore();
}

function drawLoosePetals(ctx, point, age, bounds) {
  if(age<80 || age>=goldEffectDuration)return;
  const ratio=ctx.getTransform().a || 1, [width,height]=bounds||[ctx.canvas.width/ratio,ctx.canvas.height/ratio];
  // Reuse an isolated rose petal from the footage, not a second generated style.
  // Each flight aims at this canvas's edge, including off-centre explosions.
  for(let n=0;n<16;n++) {
    const t=clamp((age-80-(n%4)*22)/1750);if(!t)continue;
    const angle=(n+.35)*TAU/16, dx=Math.cos(angle),dy=Math.sin(angle);
    const edge=Math.min((dx>0?width-point.x:point.x)/Math.abs(dx),(dy>0?height-point.y:point.y)/Math.abs(dy));
    const radius=Math.max(point.size*.4,edge)*(.12+.96*(1-(1-t)**2.4));
    const sway=Math.sin(t*Math.PI)*point.size*.35*(n%2?1:-1),size=point.size*(.36+(n%3)*.065);
    ctx.save();ctx.globalAlpha=clamp((age-80)/160)*(1-clamp((age-1850)/500))*.88;
    ctx.translate(point.x+dx*radius-dy*sway,point.y+dy*radius+dx*sway);
    ctx.rotate(angle+t*(n%2?2.4:-2));ctx.scale(.62+.38*Math.abs(Math.cos(t*4+n)),1);
    const k=flowCell/256;
    ctx.drawImage(flowAtlas,5*flowCell+32*k,5*flowCell+76*k,15*k,22*k,-size*.34,-size*.5,size*.68,size);
    ctx.restore();
  }
}

export function drawGoldFrame(ctx, point, targets, age, useFlow = flowReady(), bounds) {
  if (!useFlow) { drawProceduralGoldFrame(ctx, point, targets, age); return; }
  if (age >= goldEffectDuration) return;
  let cell, scale = 5.7, opacity = 1;
  if (age < 0) {
    const t = clamp((age+145)/145);
    cell = Math.floor(t*19); scale = 3.8+1.9*ease(t); opacity = .4+.6*t;
  } else {
    // The padded footage used to leave the visible flower confined to a few
    // cells. Expand the bloom itself to tray scale, keeping the impact origin.
    // The full-open source frames get the time; almost-empty final frames do not.
    scale = 5.7+7.5*ease(age/420)+1.3*clamp((age-420)/1930);
    cell = Math.floor(age<200 ? 19+age/200*16 : age<1350 ? 35+(age-200)/1150*14 : 49+(age-1350)/1000*14);
    opacity = 1-clamp((age-1850)/500);
  }
  cell = Math.min(63,Math.max(0,cell));
  const size = point.size*scale;
  ctx.save();ctx.globalAlpha=opacity;
  ctx.drawImage(flowAtlas,(cell%8)*flowCell,Math.floor(cell/8)*flowCell,flowCell,flowCell,point.x-size/2,point.y-size/2,size,size);
  ctx.restore();
  drawLoosePetals(ctx,point,age,bounds);
  // A brief local flash makes contact immediate, while the footage unfolds.
  if(age>=0 && age<65) {
    ctx.save();glow(ctx,point.x,point.y,point.size*.95,.72*(1-age/65)**2);ctx.restore();
  }
  // Local glints connect this reusable footage to the actual affected cells.
  for (const target of targets) {
    const elapsed=age-target.delay;
    if(elapsed<0||elapsed>150)continue;
    const t=elapsed/150, s=point.size;
    ctx.save();
    glow(ctx,target.x,target.y,s*.55,.58*(1-t)**2);
    ctx.strokeStyle='#fff0f5';ctx.lineWidth=s*.022;ctx.lineCap='round';ctx.globalAlpha=(1-t)**2;
    for(let n=0;n<4;n++) {
      const angle=n*TAU/4+.3, inner=s*(.08+.28*ease(t)), outer=inner+s*.16*(1-t);
      ctx.beginPath();ctx.moveTo(target.x+Math.cos(angle)*inner,target.y+Math.sin(angle)*inner);
      ctx.lineTo(target.x+Math.cos(angle)*outer,target.y+Math.sin(angle)*outer);ctx.stroke();
    }
    ctx.restore();
  }
}

function tick(now) {
  frame=0;
  bursts=bursts.filter(b=>b.age!==undefined||now-b.impact<goldEffectDuration);
  const bounds=bursts.length&&surface();
  if(!bounds) { clearGoldEffects(); return; }
  for(const b of bursts){
    const point=scaledPoint(b.point,b,bounds),targets=b.targets.map(t=>scaledPoint(t,b,bounds));
    drawGoldFrame(context,point,targets,b.age??(now-b.impact),b.useFlow,[bounds.width,bounds.height]);
  }
  context.restore();
  canvas.dataset.phase=bursts.some(b=>(b.age??(now-b.impact))>=0)?'burst':'charge';
  canvas.dataset.bursts=String(bursts.length);
  canvas.dataset.art=bursts.some(b=>b.useFlow)?'flow':'procedural';
  if(bursts.some(b=>b.age===undefined))frame=requestAnimationFrame(tick);
}
function armExpiry(){
  clearTimeout(expiryTimer);
  const deadlines=bursts.filter(b=>b.age===undefined).map(b=>b.impact+goldEffectDuration);
  if(deadlines.length)expiryTimer=setTimeout(()=>{cancelAnimationFrame(frame);tick(performance.now());},Math.max(0,Math.max(...deadlines)-performance.now())+8);
}

// One clock drives charge, burst and expiry, just like the source audio.
// A delayed Web Animations completion must not delete or restart the burst.
export function startGold(point,targets,started=performance.now()) {
  const bounds=boardBounds();if(!bounds?.width)return null;
  const burst={point,targets,width:bounds.width,height:bounds.height,impact:started+goldChargeDuration,useFlow:flowReady()};
  // All logical explosions still clear normally; visual work has a fixed ceiling.
  if(bursts.length>=12)bursts.shift();
  bursts.push(burst);
  armExpiry();
  if(!frame)frame=requestAnimationFrame(tick);
  return burst;
}

export function showGoldFrame(point,targets,age){
  cancelAnimationFrame(frame);clearTimeout(expiryTimer);frame=0;
  const b=boardBounds();if(!b?.width||age>=goldEffectDuration){clearGoldEffects();return;}
  bursts=[{point,targets,age,width:b.width,height:b.height,impact:0,useFlow:flowReady()}];tick(performance.now());
}
function repositionStill(){if(bursts.length&&bursts.every(b=>b.age!==undefined))tick(performance.now());}
window.addEventListener('scroll',repositionStill,{passive:true,capture:true});window.addEventListener('resize',repositionStill);

export function clearGoldEffects() {
  cancelAnimationFrame(frame);clearTimeout(expiryTimer);frame=0;bursts=[];
  canvas?.remove();canvas=null;context=null;
}
