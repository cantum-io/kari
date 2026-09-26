// Generates Mimi's icon set as PNGs from an SVG mark (no external art). Requires sharp if available, else falls back to python cairosvg/PIL.
import fs from 'node:fs'; import { execSync } from 'node:child_process';
const svg = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${bg}"/>
<defs><radialGradient id="g" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#bff9ff"/><stop offset=".55" stop-color="#3ed8ea"/><stop offset="1" stop-color="#0a5b6e"/></radialGradient></defs>
<g stroke="rgba(255,255,255,.8)" stroke-width="2.5" fill="url(#g)"><ellipse cx="64" cy="70" rx="38" ry="42"/><circle cx="36" cy="32" r="10"/><circle cx="92" cy="36" r="8"/></g>
<ellipse cx="48" cy="46" rx="8" ry="4.5" fill="rgba(255,255,255,.55)" transform="rotate(-25 48 46)"/>
<ellipse cx="52" cy="66" rx="7" ry="9" fill="#03141a"/><ellipse cx="76" cy="66" rx="7" ry="9" fill="#03141a"/>
<circle cx="53.5" cy="67.5" r="2.8" fill="#5cf2ff"/><circle cx="77.5" cy="67.5" r="2.8" fill="#5cf2ff"/>
<path d="M57 84 q7 6 14 0" fill="none" stroke="#03141a" stroke-width="2" stroke-linecap="round"/></svg>`;
fs.mkdirSync('extension/icons',{recursive:true}); fs.writeFileSync('extension/icons/mimi.svg', svg('#07070b'));
for (const s of [16,32,48,128]) execSync(`rsvg-convert -w ${s} -h ${s} extension/icons/mimi.svg -o extension/icons/${s}.png 2>/dev/null || python3 -c "import cairosvg;cairosvg.svg2png(url='extension/icons/mimi.svg',write_to='extension/icons/${s}.png',output_width=${s},output_height=${s})"`);
console.log('icons ok');
