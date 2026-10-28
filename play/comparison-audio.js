// Shared bounded playback: game loads Flow only; studio also loads the comparison.
const urls={
  'prism-flow':new URL('assets/ab-prism-flow-v19.wav',import.meta.url).href,
  'flame-flow':new URL('assets/ab-flame-flow-v13.wav',import.meta.url).href,
  'flame-current':new URL('assets/ab-flame-current-v13.wav',import.meta.url).href,
  'cross-flow':new URL('assets/ab-cross-flow-v16.wav',import.meta.url).href,
  'cross-current':new URL('assets/ab-cross-current-v16.wav',import.meta.url).href
};
export function createComparisonAudio(enabled,{contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),versions=['flow','current'],sources=urls}={}) {
  let audio,output,ready,inFlight=false,retryAfter=0;
  const buffers=new Map(),voices=new Set();
  function loadMissing(){
    const missing=Object.entries(sources).filter(([key])=>versions.some(version=>key.endsWith('-'+version))&&!buffers.has(key));
    if(!missing.length)return Promise.resolve();
    if(inFlight||(ready&&performance.now()<retryAfter))return ready;
    inFlight=true;
    ready=Promise.allSettled(missing.map(async([key,url])=>{
      const r=await fetch(url);if(!r.ok)throw Error('比較音效載入失敗');
      buffers.set(key,await audio.decodeAudioData(await r.arrayBuffer()));
    })).then(results=>{
      if(results.some(result=>result.status==='rejected')){retryAfter=performance.now()+3000;throw Error('比較音效載入失敗');}
      retryAfter=0;
    }).finally(()=>{inFlight=false;});
    // Recovery is attempted on a later user interaction, only for missing cues.
    ready.catch(()=>{});return ready;
  }
  function stopVoice(v){try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();voices.delete(v);}
  function context(){
    if(!audio){
      audio=contextFactory();output=audio.createGain();output.gain.value=.8;
      const limiter=audio.createDynamicsCompressor();limiter.threshold.value=-9;limiter.knee.value=6;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.18;
      output.connect(limiter);limiter.connect(audio.destination);
    }
    if(audio.state!=='running'&&audio.state!=='closed'&&audio.resume&&!audio.startRendering)void audio.resume().catch(()=>{}); // also iOS 'interrupted'
    void loadMissing().catch(()=>{});return audio;
  }
  return {
    ready(){context();return loadMissing();},
    play(effect,version,delay=0){
      if(!enabled())return 0;
      context();const buffer=buffers.get(`${effect}-${version}`);if(!buffer)throw Error('比較音效尚未載入');
      while(voices.size>=6)stopVoice(voices.values().next().value);
      const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;gain.gain.value=1;
      source.connect(gain);gain.connect(output);const voice={source,gain};voices.add(voice);
      source.onended=()=>{source.disconnect();gain.disconnect();voices.delete(voice);};
      source.start(audio.currentTime+Math.max(0,delay));return buffer.duration;
    },
    stop(){for(const v of [...voices])stopVoice(v);},
    sync(){if(!enabled())this.stop();},
    inspect(){return {loaded:buffers.size,active:voices.size};}
  };
}
