#!/bin/sh
# Re-shoot the Chrome Web Store images with the current build on a Creative Commons performance video.
VID="${1:-i0riJz2U6Zs}"   # Illinois Brass Band - De Falla, Ritual Fire Dance [Creative Commons]
shot() { node q.mjs mouse x=640 y=300 >/dev/null; node q.mjs mouse x=660 y=310 >/dev/null; sleep 0.7; node q.mjs "shot?name=$1" >/dev/null; echo "shot $1"; }
setS() { node q.mjs iso <<JS
const cur=(await chrome.storage.sync.get('kari.settings'))['kari.settings']||{}; await chrome.storage.sync.set({'kari.settings': Object.assign(cur, $1)}); await new Promise(r=>setTimeout(r,500)); __kari.dock && __kari.dock.render(); return 'settings '+JSON.stringify($1);
JS
}
./fresh.sh "$VID"
# theater mode: the player fills the frame and YouTube's recommendations (other people's thumbnails) move below the fold
node q.mjs iso <<'JS'
if (!document.querySelector('ytd-watch-flexy[theater]')) { document.querySelector('button.ytp-size-button')?.click(); }
await new Promise(r=>setTimeout(r,1500)); window.scrollTo(0,0); return 'theater='+!!document.querySelector('ytd-watch-flexy[theater]');
JS
node q.mjs iso <<'JS'
const v=document.querySelector('#movie_player video'); const t0=Date.now(); while(Date.now()-t0<15000){ const sp=document.querySelector('.ytp-spinner'); const shown=sp&&getComputedStyle(sp).display!=='none'; if(!v.paused && v.readyState>=4 && !shown && v.currentTime>6) break; await new Promise(r=>setTimeout(r,300)); }
return 'video t='+v.currentTime.toFixed(1)+' rs='+v.readyState+' title='+document.title.slice(0,60);
JS
setS '{skin:"org",mimiColor:"blue",kariColor:"blue",cap:false,shades:false,shoes:false,plush:true,collapsed:false,fullControl:false,seenIntro:true}'
node q.mjs iso <<'JS'
await __kari.apply({st:-2,cents:0,tempo:-20,range:50,keyLock:true}); await new Promise(r=>setTimeout(r,1500)); __kari.dock.render(); return 'params: engine '+__kari.audio.status.engine+' av '+__kari.audio.status.avOffsetMs;
JS
shot 01-dock
setS '{fullControl:true}'; shot 02-full-control
setS '{fullControl:false,collapsed:true,mimiColor:"pink",kariColor:"pink",cap:true}'; sleep 0.6; shot 03-kari-folded
setS '{collapsed:false,skin:"cons",mimiColor:"blue",kariColor:"blue",cap:false}'
node q.mjs iso <<'JS'
await __kari.apply({st:3,cents:0,tempo:0,range:50,keyLock:false}); await new Promise(r=>setTimeout(r,900)); __kari.dock.render(); return 'cons +3';
JS
shot 04-constellation
setS '{skin:"org",collapsed:false,fullControl:false}'
EXTID="chrome-extension://$(node q.mjs iso <<'JS'
return chrome.runtime.id;
JS
)"
echo "ext: $EXTID"
node q.mjs goto "url=$EXTID/options.html" >/dev/null; sleep 1.5; node q.mjs "shot?name=05-options" >/dev/null; echo "shot 05-options"
curl -s -X POST localhost:9777/viewport -d '{"width":440,"height":280}' >/dev/null; node q.mjs goto "url=file://$PWD/promo-tile.html" >/dev/null; sleep 1; node q.mjs "shot?name=promo-440x280" >/dev/null; echo "shot promo"; curl -s -X POST localhost:9777/viewport -d '{"width":1280,"height":800}' >/dev/null
