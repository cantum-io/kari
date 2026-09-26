#!/bin/sh
# fresh.sh <videoId> : load a watch page, play, wait out any ad, attach the graph dry (via hold-to-compare), install
# the probe taps. Prints one status line. Run from tools/probe with the server up.
node q.mjs goto "url=https://www.youtube.com/watch?v=$1" >/dev/null; sleep 4
node q.mjs click 'selector=button.ytp-play-button' >/dev/null; sleep 1
node q.mjs iso <<'JS'
const v=document.querySelector('#movie_player video'); if(v.paused){try{await v.play();}catch(e){}}
const pl=document.getElementById('movie_player'); const ad=()=>pl.classList.contains('ad-showing')||pl.classList.contains('ad-interrupting');
let waited=0; while(ad() && waited<45000){ const sk=document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern'); if(sk){sk.click();} await new Promise(r=>setTimeout(r,500)); waited+=500; }
globalThis.__t0=performance.now(); __mimi.audio.setCompare(true); let t=0; while(performance.now()-__t0<8000){ if(__mimi.audio.status.attached && __mimi.audio.ctx?.state==='running'){t=performance.now()-__t0;break;} await new Promise(r=>setTimeout(r,25)); }
await new Promise(r=>setTimeout(r,300)); __mimi.audio.setCompare(false); await new Promise(r=>setTimeout(r,300));
return 'fresh: ad waited '+waited+'ms adNow='+ad()+' attached '+t.toFixed(0)+'ms engine='+__mimi.audio.status.engine+' t='+v.currentTime.toFixed(1)+' paused='+v.paused;
JS
node q.mjs iso < iso-probe.js
