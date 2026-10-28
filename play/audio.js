// CC0 samples; source credits and reproducible edits are in qa/v32.
const assets={
select:['assets/sfx-select-1-v32.wav','assets/sfx-select-2-v32.wav','assets/sfx-select-3-v32.wav'],
swap:['assets/sfx-swap-v32.wav'],match:['assets/sfx-match-1-v32.wav','assets/sfx-match-2-v32.wav'],
land:['assets/sfx-land-1-v32.wav','assets/sfx-land-2-v32.wav'],birth:['assets/sfx-birth-v32.wav'],
invalid:['assets/sfx-invalid-v32.wav'],note:['assets/sfx-note-v32.wav'],
charge:['assets/sfx-charge-v10.wav'],impact:['assets/sfx-impact-v10.wav']
};
const urls=Object.fromEntries(Object.entries(assets).map(([kind,paths])=>[kind,paths.map(path=>new URL(path,import.meta.url).href)]));
const files=new Map();
function request(url){
  if(!files.has(url))files.set(url,fetch(url).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null));
  return files.get(url);
}
Object.values(urls).flat().forEach(request);
export function createChimes(enabled,{contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)()}={}){
  let audio,output,ready,inFlight=false,retryAfter=0;
  const buffers=new Map(),voices=new Set(),last=new Map(),sequence=new Map();
  function loadMissing(){
    const missing=Object.values(urls).flat().filter(url=>!buffers.has(url));
    if(!missing.length)return Promise.resolve(true);
    if(inFlight||(ready&&performance.now()<retryAfter))return ready;
    inFlight=true;
    ready=Promise.all(missing.map(async url=>{
      try{
        const data=await request(url);if(!data){files.delete(url);return false;}
        buffers.set(url,await audio.decodeAudioData(data.slice(0)));return true;
      }catch{files.delete(url);return false;}
    })).then(results=>{const complete=results.every(Boolean);retryAfter=complete?0:performance.now()+3000;return complete;}).finally(()=>{inFlight=false;});
    return ready;
  }
  function context(){
    if(!audio){
      audio=contextFactory();output=audio.createGain();output.gain.value=.74;
      // Preserve transient detail; only dense peaks reach this soft limiter.
      const limiter=audio.createDynamicsCompressor();limiter.threshold.value=-7;limiter.knee.value=4;limiter.ratio.value=4;
      limiter.attack.value=.008;limiter.release.value=.085;
      output.connect(limiter);limiter.connect(audio.destination);
    }
    if(audio.state!=='running'&&audio.state!=='closed'&&audio.resume&&!audio.startRendering)void audio.resume().catch(()=>{}); // also iOS 'interrupted'
    void loadMissing();return audio;
  }
  function stopVoice(v){try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();voices.delete(v);}
  function track(source,gain,kind){
    while(voices.size>=14)stopVoice([...voices].find(v=>v.kind==='land'||v.kind==='select')||voices.values().next().value);
    const v={source,gain,kind};voices.add(v);source.onended=()=>{source.disconnect();gain.disconnect();voices.delete(v);};return v;
  }
  function tone(frequency,at,duration,volume,kind){
    const source=audio.createOscillator(),gain=audio.createGain();source.type='sine';source.frequency.value=frequency;
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.004);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    source.connect(gain);gain.connect(output);track(source,gain,kind);source.start(at);source.stop(at+duration+.01);
  }
  function play(kind,at,pitch=1,level=1){
    const bank=(urls[kind]||[]).map(url=>buffers.get(url)).filter(Boolean),serial=sequence.get(kind)||0;sequence.set(kind,serial+1);
    if(!bank.length){tone(kind==='impact'?220:kind==='land'?440:880,at,.075,.025*level,kind);return;}
    const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=bank[serial%bank.length];
    const variation=['select','land','swap'].includes(kind)?[1,1.025,.98,1.012][serial%4]:1;
    source.playbackRate.value=pitch*variation;gain.gain.value=level/Math.sqrt(1+Math.max(0,voices.size-4)*.18);
    source.connect(gain);gain.connect(output);track(source,gain,kind);source.start(at);
  }
  function chime(notes=[523],volume=.045){
    if(!enabled())return;
    try{context();notes.forEach((f,i)=>play('note',audio.currentTime+i*.09,Math.max(.65,Math.min(2,f/659)),Math.min(.8,volume/.06)));}catch{}
  }
  chime.effect=(kind,chain=1)=>{
    if(!enabled())return;
    try{
      context();const time=audio.currentTime,gap={select:.04,swap:.05,land:.055,match:.055,charge:.08,impact:.09}[kind]||.04;
      if(time-(last.get(kind)??-Infinity)<gap)return;last.set(kind,time);
      const pitch=['match','birth'].includes(kind)?[1,1.12246,1.25992,1.33484,1.49831][Math.min(4,Math.max(0,chain-1))]:1;
      play(kind,time,pitch,({select:1.1,swap:.7,match:1.15,land:.72,birth:.9})[kind]??1);
    }catch{}
  };
  chime.stop=()=>{for(const v of [...voices])stopVoice(v);last.clear();};
  chime.sync=()=>{if(!enabled())chime.stop();};
  chime.ready=()=>{context();return loadMissing();};
  chime.inspect=()=>({loaded:buffers.size,expected:Object.values(urls).flat().length,active:voices.size,phases:[...voices].map(v=>v.kind)});
  return chime;
}
