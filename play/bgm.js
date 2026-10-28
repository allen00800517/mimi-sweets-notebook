// Background music: the user's Flow Music tracks, one (or two) per season (scripts/prepare_bgm_v44.py,
// prepare_bgm_v55.py). Each file opens with its song's real beginning, then loops a section seamlessly.
// play(key) switches tune (the old one fades out, the new one starts from the top; with { cut: true }, as in the
// album's music box, the old one stops at once and the new one starts at full level); restart() plays the
// current tune from the top. It follows the sound toggle, pauses with the tab, and dips under the big
// Flow effects so their original sound stays the focus. Files load only when first needed, and at most
// two decoded tunes are kept (a decoded three-minute song is tens of MB on a phone).
const TRACKS = {
  spring1: { url: new URL('assets/bgm-strawberry-tea-v44.mp3', import.meta.url).href, loop: [1784160 / 48000, 5239745 / 48000] },
  spring2: { url: new URL('assets/bgm-spring2-v55.mp3', import.meta.url).href, loop: [1325208 / 48000, 5421139 / 48000] },
  summer1: { url: new URL('assets/bgm-summer1-v55.mp3', import.meta.url).href, loop: [2660448 / 48000, 6116428 / 48000] },
  summer2: { url: new URL('assets/bgm-summer2-v55.mp3', import.meta.url).href, loop: [3573638 / 48000, 7412472 / 48000] },
  autumn1: { url: new URL('assets/bgm-autumn1-v55.mp3', import.meta.url).href, loop: [2253633 / 48000, 7341854 / 48000] },
  autumn2: { url: new URL('assets/bgm-autumn2-v55.mp3', import.meta.url).href, loop: [2556796 / 48000, 7643553 / 48000] },
  winter1: { url: new URL('assets/bgm-winter1-v55.mp3', import.meta.url).href, loop: [4129435 / 48000, 7777238 / 48000] },
  winter2: { url: new URL('assets/bgm-winter2-v55.mp3', import.meta.url).href, loop: [3227774 / 48000, 7066824 / 48000] },
  // The finale theme (only played from the album's music box): the whole clip, repeated.
  finale: { url: new URL('assets/finale-theme-v49.mp3', import.meta.url).href, loop: null }
};
const LEVEL = .34, DUCKED = .14, KEEP = 2;

export function createMusic(enabled, { contextFactory = () => new (window.AudioContext || window.webkitAudioContext)() } = {}) {
  let ctx, gain, source, playing = null, want = 'spring1', startedAt = 0, quietTimer, on = false, queue = Promise.resolve();
  const buffers = new Map(), loading = new Map();
  const ensure = () => {
    if (ctx) return true;
    try { ctx = contextFactory(); gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination); return true; }
    catch { return false; }
  };
  function load(key) {
    if (buffers.has(key)) { const b = buffers.get(key); buffers.delete(key); buffers.set(key, b); return Promise.resolve(b); } // most recent last
    if (loading.has(key)) return loading.get(key);
    const job = fetch(TRACKS[key].url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error('bgm'))).then(d => ctx.decodeAudioData(d))
      .then(b => { buffers.set(key, b); while (buffers.size > KEEP) buffers.delete([...buffers.keys()].find(k => k !== key && k !== playing)); return b; })
      .catch(() => null).finally(() => loading.delete(key));
    loading.set(key, job); return job;
  }
  function ramp(value, seconds, from) {
    if (!ctx) return; const g = gain.gain, t = ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    if (from !== undefined) g.setValueAtTime(from.value, from.at);
    g.linearRampToValueAtTime(value, (from?.at ?? t) + seconds);
  }
  // Each tune has its own fader, so a crossfade never fights the master level (sound toggle, ducking).
  function stopCurrent(fade) {
    if (!source) return; const t = ctx.currentTime, { node, fader } = source;
    fader.gain.cancelScheduledValues(t); fader.gain.setValueAtTime(fader.gain.value, t); fader.gain.linearRampToValueAtTime(0, t + fade);
    try { node.stop(t + fade + .05); } catch {} source = null; playing = null;
  }
  async function apply(fromTop, cut) {
    if (!enabled()) { on = false; ramp(0, .35); quietTimer = setTimeout(() => { if (!enabled()) ctx?.suspend().catch(() => {}); }, 450); return; }
    const switching = source && playing !== want;
    if (on && !fromTop && !switching && ctx.state === 'running') return; // already playing: taps must not undo a duck
    if (cut && source) stopCurrent(.03);                                       // music box: silence the old tune at the tap
    const key = want, buffer = await load(key); if (!buffer || !enabled() || key !== want) return;
    let at = ctx.currentTime;
    if (source && switching) stopCurrent(.9);                                   // crossfade into the new tune
    else if (source && fromTop && at - startedAt > 1) { stopCurrent(.18); at += .2; } // same tune, from the top
    if (!source) {
      const loop = TRACKS[key].loop, node = ctx.createBufferSource(), fader = ctx.createGain();
      node.buffer = buffer; node.loop = true; if (loop) { node.loopStart = loop[0]; node.loopEnd = loop[1]; }
      fader.gain.setValueAtTime(0, at); fader.gain.linearRampToValueAtTime(1, at + (cut ? .02 : 1.2));
      node.connect(fader); fader.connect(gain); node.start(at, 0);
      source = { node, fader }; startedAt = at; playing = key;
    }
    if (!on || gain.gain.value < LEVEL * .9) ramp(LEVEL, cut ? .02 : .4);
    on = true;
  }
  // Resume inside the tap (iOS), then apply changes one at a time so two taps never start two copies.
  function sync(fromTop = false, cut = false) {
    clearTimeout(quietTimer);
    if (enabled() && ensure() && ctx.state !== 'running') ctx.resume().catch(() => {});
    queue = queue.then(() => apply(fromTop, cut)).catch(() => {});
    return queue;
  }
  // Switch to a tune (from the top). The same tune keeps playing unless fromTop is asked for.
  function play(key, fromTop = false, { cut = false } = {}) {
    if (!TRACKS[key]) return queue;
    const changed = key !== want; want = key;
    return sync(fromTop || changed, cut);
  }
  // Warm up the next tune's download (not decoded) so a switch doesn't wait on the network.
  const prefetch = key => { if (TRACKS[key]) fetch(TRACKS[key].url).catch(() => {}); };
  // Download and decode a tune ahead (the title theme while 「點一下畫面開始」 waits), so the tap starts it at once.
  // The audio context made here stays suspended until a tap resumes it (sync).
  const preload = key => { if (TRACKS[key] && enabled() && ensure()) void load(key); };
  function duck(seconds) {
    if (!ctx || !source || !enabled()) return; const g = gain.gain, t = ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(DUCKED, t + .12);
    g.setValueAtTime(DUCKED, t + seconds); g.linearRampToValueAtTime(LEVEL, t + seconds + .9);
  }
  // Leaving the app: silence at once, then stop the (shared) audio clock. Cutting it off mid-sound made iOS
  // hold the last sliver of audio as a tone while the app went to the home screen.
  const pause = () => {
    clearTimeout(quietTimer); on = false; if (!ctx) return;
    gain.gain.cancelScheduledValues(0); gain.gain.value = 0;
    if (ctx.state === 'running') ctx.suspend().catch(() => {});
  };
  return { sync, play, prefetch, preload, restart: () => sync(true), duck, pause,
    state: () => ({ playing: !!source && ctx?.state === 'running', track: playing, want, level: gain?.gain.value ?? 0, position: source ? (ctx.currentTime - startedAt) : 0 }) };
}
