// Home-screen app helper (scripts/build_pwa.py): keeps the offline copy, and shows how far the download is.
// In Safari it only installs the small core; opened from the home screen it saves the whole game (about 50 MB)
// and says so once. After an update the page reloads once so it never mixes old and new files.
(() => {
  if (!('serviceWorker' in navigator)) return;
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const sw = new URL('sw.js', location.href), key = 'mimi-pwa-ready:' + sw.pathname;
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloading) { reloading = true; location.reload(); } });
  let pill = null, hideTimer = 0;
  const show = (text, stay) => {
    if (!pill) {
      pill = document.createElement('div');
      pill.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);transform:translateX(-50%);z-index:2147483647;padding:8px 16px;border-radius:999px;background:#7a2a35ee;color:#fff3df;font:600 13px/1.3 system-ui,sans-serif;letter-spacing:.04em;box-shadow:0 4px 14px #0005;pointer-events:none;transition:opacity .5s;white-space:nowrap';
      document.body.append(pill);
    }
    pill.textContent = text; pill.style.opacity = '1'; clearTimeout(hideTimer);
    if (!stay) hideTimer = setTimeout(() => { pill.style.opacity = '0'; }, 3200);
  };
  let ready = false; try { ready = localStorage.getItem(key) === '1'; } catch {}
  navigator.serviceWorker.addEventListener('message', ({ data }) => {
    if (data?.type !== 'fill' || !standalone) return;
    if (data.finished) { if (!ready) show('已經存進手機，沒有網路也能玩'); else if (pill) show('更新好了'); ready = true; try { localStorage.setItem(key, '1'); } catch {} return; }
    if ('finished' in data) { show('還有一部分沒存好，下次連上網路打開會繼續'); return; }
    if (data.done < data.total) show(`${ready ? '正在更新' : '正在把遊戲存進手機'}… ${Math.floor(data.done / data.total * 100)}%`, true);
  });
  addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register(sw.href);
      if (!standalone) return;
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage('fill');
    } catch {}
  });
})();
