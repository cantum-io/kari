// Kari — her forms. Every form is drawn on Kari's own 160×180 body (viewBox 0 0 160 180, 96×110 in the dock), so a
// form changes how she looks and never how much of the player she covers. Jesse picked five of nine designs on
// 2026-11-09 (showcase https://claude.ai/artifact/9EjSdfNz1qc3ojAzFemLpG): Nebula (constellation C2), Medusa (alien A3)
// and the three sisters Hex, Chrome and Hood (S1, S2, S3). Kari stays the default; the stored interface key stays "org".
//
// formSvg(id, true) is the character on the player: the beat group the dock pulses (data-el="beat"), the wardrobe where
// the form can wear it, the fault "zz", and Medusa's SMIL tentacles. formSvg(id, false) is the still portrait on the
// settings tile. Paint servers, filters, clips and shapes live once in FORM_DEFS, a 0×0 svg at the dock root that is
// never display:none (a gradient inside a display:none subtree stops painting, and the org skin and the settings are
// both hidden most of the time).
import type { KariForm } from "../../shared/storage";

export type FormInfo = { id: KariForm; name: string; colorway: boolean; wear: boolean; label: string };

/** In the order the settings show them: Kari, the two picks from the constellation and alien sets, then the sisters. */
export const FORMS: FormInfo[] = [
  { id: "kari", name: "Kari", colorway: true, wear: true, label: "Kari, the original" },
  { id: "nebula", name: "Nebula", colorway: true, wear: true, label: "Nebula, Kari in glass with a galaxy inside" },
  { id: "medusa", name: "Medusa", colorway: true, wear: false, label: "Medusa, Kari as a jellyfish" },
  { id: "hex", name: "Hex", colorway: false, wear: false, label: "Hex, the sister with horns and a tail" },
  { id: "chrome", name: "Chrome", colorway: false, wear: false, label: "Chrome, the holographic sister" },
  { id: "hood", name: "Hood", colorway: false, wear: false, label: "Hood, the hooded sister" },
];
export const FORM_IDS = FORMS.map(f => f.id);
export const formInfo = (id: KariForm) => FORMS.find(f => f.id === id) || FORMS[0];

export const FORM_DEFS = `
<svg class="kdefs" aria-hidden="true" focusable="false" width="0" height="0">
  <defs>
    <radialGradient id="kari-blobfill" cx="40%" cy="30%" r="80%"><stop offset="0" style="stop-color:var(--m1)" stop-opacity=".95"/><stop offset=".5" style="stop-color:var(--m2)" stop-opacity=".6"/><stop offset="1" style="stop-color:var(--m3)" stop-opacity=".3"/></radialGradient>
    <filter id="kari-goo"><feGaussianBlur stdDeviation="2" result="b"/><feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter>
    <filter id="kari-glass"><feGaussianBlur in="SourceAlpha" stdDeviation="2" result="b"/><feColorMatrix in="b" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 60 -7" result="g"/><feComposite in="SourceGraphic" in2="g" operator="in"/></filter>
    <filter id="kari-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <radialGradient id="kari-nebula" cx="42%" cy="34%" r="78%"><stop offset="0" style="stop-color:var(--m1)" stop-opacity=".7"/><stop offset=".45" stop-color="#8f7bff" stop-opacity=".38"/><stop offset=".8" style="stop-color:var(--m3)" stop-opacity=".35"/><stop offset="1" style="stop-color:var(--m1)" stop-opacity=".55"/></radialGradient>
    <radialGradient id="kari-space" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#16244a"/><stop offset="1" stop-color="#03070f"/></radialGradient>
    <radialGradient id="kari-hex" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#4a3358"/><stop offset=".55" stop-color="#1c1324"/><stop offset="1" stop-color="#08060b"/></radialGradient>
    <linearGradient id="kari-hood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e2138"/><stop offset="1" stop-color="#110b16"/></linearGradient>
    <linearGradient id="kari-chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f6fb"/><stop offset=".25" stop-color="#c9c2ff"/><stop offset=".45" stop-color="#ffb3e1"/><stop offset=".6" stop-color="#f4f2ff"/><stop offset=".8" stop-color="#9ff0ff"/><stop offset="1" stop-color="#e9e6f7"/></linearGradient>
    <clipPath id="kari-cp-body"><ellipse cx="80" cy="95" rx="53" ry="59"/></clipPath>
    <mask id="kari-m-cresl"><circle cx="40" cy="38" r="13" fill="#fff"/><circle cx="46" cy="33" r="11" fill="#000"/></mask>
    <mask id="kari-m-cresr"><circle cx="120" cy="44" r="10" fill="#fff"/><circle cx="125" cy="40" r="8.5" fill="#000"/></mask>
    <path id="kari-spk" d="M0 -10 Q2.8 -2.8 10 0 Q2.8 2.8 0 10 Q-2.8 2.8 -10 0 Q-2.8 -2.8 0 -10Z"/>
    <g id="kari-core"><ellipse cx="80" cy="95" rx="54" ry="60"/><ellipse cx="34" cy="120" rx="22" ry="14" transform="rotate(-30 34 120)"/><ellipse cx="128" cy="126" rx="22" ry="14" transform="rotate(30 128 126)"/><ellipse cx="62" cy="158" rx="16" ry="12"/><ellipse cx="102" cy="158" rx="16" ry="12"/></g>
    <g id="kari-shape"><use href="#kari-core"/><circle cx="40" cy="40" r="14"/><circle cx="118" cy="46" r="11"/></g>
  </defs>
</svg>`;

/* ---------- the wardrobe (Kari and Nebula share her eyes, head and feet) ---------- */
const SHOES = `
    <g class="acc shoes">
      <path d="M34 160 c-6 4 -8 12 -2 16 h34 c8 0 10 -6 6 -12 c-4 -4 -10 -8 -18 -8 c-8 0 -14 0 -20 4z" fill="#111" stroke="#2c2c34" stroke-width="1.2"/>
      <path d="M30 176 h40 M32 172 l3 3 M38 171 l3 4 M44 171 l3 4 M50 171 l3 4 M56 171 l3 4 M62 172 l3 3" stroke="#3d3d48" stroke-width="1.3"/>
      <path d="M40 166 c6 -2 14 -2 20 0" fill="none" stroke="#8a8a96" stroke-width="1"/>
      <path d="M90 160 c-6 4 -8 12 -2 16 h34 c8 0 10 -6 6 -12 c-4 -4 -10 -8 -18 -8 c-8 0 -14 0 -20 4z" fill="#111" stroke="#2c2c34" stroke-width="1.2"/>
      <path d="M86 176 h40 M88 172 l3 3 M94 171 l3 4 M100 171 l3 4 M106 171 l3 4 M112 171 l3 4 M118 172 l3 3" stroke="#3d3d48" stroke-width="1.3"/>
      <path d="M96 166 c6 -2 14 -2 20 0" fill="none" stroke="#8a8a96" stroke-width="1"/>
    </g>`;
const SHADES = `
    <g class="acc shades">
      <rect x="47" y="80" width="30" height="11" rx="5.5" fill="#050507" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <rect x="83" y="80" width="30" height="11" rx="5.5" fill="#050507" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <path d="M77 85 h6" stroke="#050507" stroke-width="2"/><path d="M47 84 l-10 -4 M113 84 l10 -4" stroke="#050507" stroke-width="1.6"/>
      <path d="M52 83 h10 M88 83 h10" stroke="rgba(255,255,255,.45)" stroke-width="1"/>
    </g>`;
const CAP = `
    <g class="acc cap">
      <path d="M46 46 q34 -30 68 0 v6 h-68z" fill="#0d0d12"/><path d="M40 52 h84 q-4 -6 -8 -6 h-68 q-4 0 -8 6z" fill="#0d0d12"/>
      <path d="M104 50 q22 -2 30 6 q-14 0 -30 -2z" fill="#0d0d12"/><path d="M46 46 q34 -30 68 0" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>
      <text x="80" y="40" font-size="8.5" text-anchor="middle" font-family="Space Mono,monospace" font-weight="700" fill="#efece4" letter-spacing="1">YGG</text>
    </g>`;
const zz = (x: number, y: number) => `<text class="zz" x="${x}" y="${y}">zz</text>`;

/** A SMIL path wave for Medusa's tentacles: the path swings to its mirror and back. Live only (the tile stands still). */
const wave = (a: string, b: string, dur: string, begin: string, live: boolean) =>
  live ? `<animate attributeName="d" dur="${dur}" begin="${begin}" repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" values="${a};${b};${a}"/>` : "";
const tent = (cls: string, a: string, b: string, dur: string, begin: string, live: boolean) => `<path class="${cls}" d="${a}">${wave(a, b, dur, begin, live)}</path>`;

const BODY: Record<KariForm, (live: boolean) => string> = {
  // Kari, the original: the dock's character exactly as she shipped through 0.10.0 (her defs moved to FORM_DEFS)
  kari: (live) => `
  <g class="beat"${live ? ' data-el="beat"' : ""}>
    <g class="blob" style="transform-origin:80px 90px">
      <ellipse cx="80" cy="95" rx="54" ry="60"/><circle cx="40" cy="40" r="14"/><circle cx="118" cy="46" r="11"/>
      <ellipse cx="34" cy="120" rx="22" ry="14" transform="rotate(-30 34 120)"/><ellipse cx="128" cy="126" rx="22" ry="14" transform="rotate(30 128 126)"/>
      <ellipse cx="62" cy="158" rx="16" ry="12"/><ellipse cx="102" cy="158" rx="16" ry="12"/>
    </g>
    <ellipse class="shine" cx="52" cy="58" rx="12" ry="7" transform="rotate(-25 52 58)"/>${live ? SHOES : ""}
    <g class="lid l"><ellipse class="eye" cx="62" cy="86" rx="10" ry="13"/></g>
    <g class="lid r"><ellipse class="eye" cx="98" cy="86" rx="10" ry="13"/></g>
    <g class="lid l"><circle class="iris" cx="64" cy="88" r="4"/></g>
    <g class="lid r"><circle class="iris" cx="100" cy="88" r="4"/></g>
    <path class="mouth" d="M70 112 q10 8 20 0" fill="none" stroke="#03141a" stroke-width="2" stroke-linecap="round"/>
    ${live ? zz(118, 60) + SHADES + CAP : ""}
  </g>${live ? '\n  <circle class="bubble" data-el="bubble" cx="118" cy="76" r="14"/>' : ""}`,

  // Nebula (C2): her shape in glass with a slow galaxy inside, the buns as two crescent moons, a moon orbiting her waist
  nebula: (live) => `
  <g class="idle">
    <g transform="rotate(-10 80 116)"><path class="ring2" d="M10 116 A70 14 0 0 1 150 116"/><path class="ring" d="M10 116 A70 14 0 0 1 150 116"/>${live ? '<circle class="moon" data-moon="back" r="4" cx="10" cy="116"/>' : ""}</g>
    <g class="beat"${live ? ' data-el="beat"' : ""}>
      <use href="#kari-core" class="neb"/>
      <g clip-path="url(#kari-cp-body)"><g class="swirl"><ellipse cx="62" cy="80" rx="36" ry="15" fill="#b69cff" opacity=".5" filter="url(#kari-soft)"/><ellipse cx="100" cy="114" rx="32" ry="12" style="fill:var(--m1)" opacity=".5" filter="url(#kari-soft)"/></g>
        <g><circle class="speck" cx="50" cy="70" r="1"/><circle class="speck" cx="112" cy="70" r="1.3"/><circle class="speck" cx="98" cy="130" r="1"/><circle class="speck" cx="58" cy="128" r="1.4"/><circle class="speck" cx="122" cy="108" r="1"/><circle class="speck" cx="38" cy="104" r="1"/></g></g>
      <ellipse class="shine" cx="52" cy="58" rx="12" ry="7" transform="rotate(-25 52 58)"/>${live ? SHOES : ""}
      <g class="lidf"><ellipse class="eye" cx="62" cy="86" rx="10" ry="13"/></g>
      <g class="lidf"><ellipse class="eye" cx="98" cy="86" rx="10" ry="13"/></g>
      <g class="lidf"><circle class="iris" cx="64" cy="88" r="4"/><circle cx="59" cy="81" r="1.2" fill="#fff"/></g>
      <g class="lidf"><circle class="iris" cx="100" cy="88" r="4"/><circle cx="95" cy="81" r="1.2" fill="#fff"/></g>
      <path class="mouth" d="M70 112 q10 8 20 0"/>
      ${live ? zz(118, 60) + SHADES + CAP : ""}
    </g>
    <circle class="cres" cx="40" cy="38" r="13" mask="url(#kari-m-cresl)"/><circle class="cres b" cx="120" cy="44" r="10" mask="url(#kari-m-cresr)"/>
    <g transform="rotate(-10 80 116)"><path class="ring2" d="M150 116 A70 14 0 0 1 10 116"/><path class="ring" d="M150 116 A70 14 0 0 1 10 116"/><circle class="moon"${live ? ' data-moon="front"' : ""} r="4" cx="${live ? 150 : 124}" cy="${live ? 116 : 128}"/></g>
  </g>`,

  // Medusa (A3): a jellyfish bell with her face and buns on top; tentacles for arms and feet, a ring of rim lights
  medusa: (live) => `
  <g class="idle"><g class="beat"${live ? ' data-el="beat"' : ""}>
    <g>
      ${tent("tent", "M128.3 108 C135 122 121 138 129 150", "M128.3 108 C121 122 135 138 127 150", "2.6s", "0s", live)}
      ${tent("tent", "M109 108 C116 124 102 142 110 160", "M109 108 C102 124 116 142 108 160", "2.6s", "-.4s", live)}
      ${tent("tent", "M89.7 108 C96 126 83 146 91 166", "M89.7 108 C83 126 96 146 88 166", "2.6s", "-.8s", live)}
      ${tent("tent", "M70.3 108 C77 126 64 146 72 166", "M70.3 108 C64 126 77 146 69 166", "2.6s", "-1.2s", live)}
      ${tent("tent", "M51 108 C58 124 44 142 52 160", "M51 108 C44 124 58 142 50 160", "2.6s", "-1.6s", live)}
      ${tent("tent", "M31.7 108 C38 122 24 138 32 150", "M31.7 108 C24 122 38 138 30 150", "2.6s", "-2s", live)}
      ${tent("oral", "M74 106 C68 122 80 134 72 152", "M74 106 C80 122 68 134 76 152", "3.4s", "0s", live)}
      ${tent("oral", "M86 106 C92 122 80 134 88 152", "M86 106 C80 122 92 134 84 152", "3.4s", "-1.7s", live)}
    </g>
    <g class="bell">
      <g class="blob"><path d="M22 104 C20 60 46 30 80 30 C114 30 140 60 138 104 Q128.3 113 118.7 104 Q109.0 113 99.3 104 Q89.7 113 80.0 104 Q70.3 113 60.7 104 Q51.0 113 41.3 104 Q31.7 113 22.0 104Z"/><circle cx="41" cy="42" r="12"/><circle cx="117" cy="48" r="9"/></g>
      <ellipse class="ripple" cx="80" cy="70" rx="60" ry="42"/>
      <ellipse class="shine" cx="50" cy="52" rx="12" ry="6" transform="rotate(-30 50 52)"/>
      <g><circle class="bio" cx="34" cy="98" r="1.8"/><circle class="bio" cx="48" cy="100" r="1.8"/><circle class="bio" cx="63" cy="101" r="1.8"/><circle class="bio" cx="80" cy="101" r="1.8"/><circle class="bio" cx="97" cy="101" r="1.8"/><circle class="bio" cx="112" cy="100" r="1.8"/><circle class="bio" cx="126" cy="98" r="1.8"/></g>
      <g class="lidf"><ellipse class="eye" cx="62" cy="72" rx="11" ry="14"/></g>
      <g class="lidf"><ellipse class="eye" cx="98" cy="72" rx="11" ry="14"/></g>
      <g class="lidf"><circle class="iris" cx="64.5" cy="75" r="4.4"/><circle cx="58" cy="66" r="1.8" fill="#fff"/></g>
      <g class="lidf"><circle class="iris" cx="100.5" cy="75" r="4.4"/><circle cx="94" cy="66" r="1.8" fill="#fff"/></g>
      <path class="mouth" d="M73 92 q7 6 14 0"/>
      ${live ? zz(128, 26) : ""}
    </g>
  </g></g>`,

  // Hex (S1): black goo with a pink rim; horns for buns (one chipped), half-lidded cat eyes, one fang, a devil tail
  hex: (live) => `
  <g class="idle"><g class="beat"${live ? ' data-el="beat"' : ""}>
    <g class="tail"><path class="rope-rim" d="M116 142 C138 152 152 140 148 116"/><path class="rope" d="M116 142 C138 152 152 140 148 116"/><path d="M148 102 L157 117 L148 113.5 L139 117 Z"/></g>
    <g class="blob"><use href="#kari-core"/><path d="M33 58 C25 42 22 28 25 13 C35 22 47 33 57 44 Z"/><path d="M104 46 C111 37 119 31 128 26 L126.5 31.5 L132 33.5 C127 41 123 48 119 55 Z"/></g>
    <use class="stud" href="#kari-spk" transform="translate(34 34) scale(.36)"/>
    <ellipse class="shine" cx="52" cy="62" rx="10" ry="5" transform="rotate(-25 52 62)"/>
    <g class="eyeL"><g class="lidf"><path class="eye" d="M52 84 Q62 79 72 83 L72.5 88 Q72 101 62 101 Q52 101 51.5 88 Z"/><g class="pupils"><ellipse class="pink" cx="61" cy="92" rx="4.6" ry="5.6"/><ellipse class="slit" cx="61" cy="92" rx="1" ry="3.8"/><circle cx="63" cy="89" r="1.2" fill="#fff"/></g><path class="lash" d="M74 83 Q61 76 50 84 L45 80"/></g></g>
    <path class="wink" d="M52 92 Q62 84 72 92"/>
    <g class="lidf"><path class="eye" d="M88 83 Q98 79 108 84 L108.5 88 Q108 101 98 101 Q88 101 87.5 88 Z"/><g class="pupils"><ellipse class="pink" cx="97" cy="92" rx="4.6" ry="5.6"/><ellipse class="slit" cx="97" cy="92" rx="1" ry="3.8"/><circle cx="99" cy="89" r="1.2" fill="#fff"/></g><path class="lash" d="M86 83 Q99 76 110 84 L115 80"/></g>
    <path class="smirk" d="M70 113 Q81 119 92 109"/>
    <path class="fang" d="M84.4 115.4 L86.6 119.8 L88.4 114.2 Z"/>
    <path class="pink" d="M44 108 C38 104 39 99 42 99 C43.3 99 44 100 44 100.8 C44 100 44.7 99 46 99 C49 99 50 104 44 108Z"/>
    <path class="pop" d="M80 52 C70 45 72 37 77 37 C79 37 80 39 80 40 C80 39 81 37 83 37 C88 37 90 45 80 52Z"/>
    ${live ? zz(136, 70) : ""}
  </g></g>`,

  // Chrome (S2): holographic Y2K chrome with a light sweep, a butterfly clip and a star clip, star irises, platform boots
  chrome: (live) => `
  <g class="idle"><g class="beat"${live ? ' data-el="beat"' : ""}>
    <g class="blob"><use href="#kari-shape"/></g>
    <g clip-path="url(#kari-cp-body)"><rect class="sheen" x="-20" y="20" width="18" height="160" transform="skewX(-20)"/></g>
    <path class="boot" d="M45 160 h34 v10 q0 6 -6 6 h-22 q-6 0 -6 -6z"/><path class="boot-line" d="M47 169 h30"/>
    <path class="boot" d="M85 160 h34 v10 q0 6 -6 6 h-22 q-6 0 -6 -6z"/><path class="boot-line" d="M87 169 h30"/>
    <g class="wings"><ellipse class="wing-a" cx="32" cy="30" rx="8.5" ry="5.6" transform="rotate(-30 32 30)"/><ellipse class="wing-a" cx="48" cy="30" rx="8.5" ry="5.6" transform="rotate(30 48 30)"/><ellipse class="wing-b" cx="33" cy="39" rx="5.6" ry="3.8" transform="rotate(20 33 39)"/><ellipse class="wing-b" cx="47" cy="39" rx="5.6" ry="3.8" transform="rotate(-20 47 39)"/><path class="wing-body" d="M40 26 L40 43"/></g>
    <use class="clip" href="#kari-spk" transform="translate(119 44) scale(.75)"/>
    <ellipse class="blush" cx="46" cy="106" rx="7" ry="3.5"/><ellipse class="blush" cx="114" cy="106" rx="7" ry="3.5"/>
    <g class="lidf"><ellipse class="eye" cx="62" cy="90" rx="11" ry="14"/><use class="iris" href="#kari-spk" transform="translate(64 93) scale(.55)"/><circle cx="57" cy="83" r="2.4" fill="#fff"/></g>
    <g class="lidf"><ellipse class="eye" cx="98" cy="90" rx="11" ry="14"/><use class="iris" href="#kari-spk" transform="translate(100 93) scale(.55)"/><circle cx="93" cy="83" r="2.4" fill="#fff"/></g>
    <circle class="gem" cx="56" cy="107" r=".9"/><circle class="gem" cx="60" cy="108" r=".9"/><circle class="gem" cx="64" cy="107" r=".9"/><circle class="gem" cx="96" cy="107" r=".9"/><circle class="gem" cx="100" cy="108" r=".9"/><circle class="gem" cx="104" cy="107" r=".9"/>
    <path class="mouth" d="M72 112 q4 4.5 8 0 q4 4.5 8 0"/>
    ${live ? `<circle class="gum" cx="80" cy="118" r="2"/>
    <circle class="bit" cx="80" cy="118" r="1.6" style="--bx:-18px;--by:-10px"/><circle class="bit" cx="80" cy="118" r="1.6" style="--bx:18px;--by:-12px"/><circle class="bit" cx="80" cy="118" r="1.4" style="--bx:-12px;--by:14px"/><circle class="bit" cx="80" cy="118" r="1.4" style="--bx:14px;--by:12px"/>
    ${zz(136, 66)}` : ""}
  </g>
    <use class="ystar" href="#kari-spk" transform="translate(14 72) scale(.5)"/><use class="ystar b" href="#kari-spk" transform="translate(148 40) scale(.6)"/><use class="ystar" href="#kari-spk" transform="translate(150 150) scale(.4)"/>
  </g>`,

  // Hood (S3): a hooded sneak; two uneven hood peaks for buns, a stitched pink star, only her eyes and grin in the shadow
  hood: (live) => `
  <g class="duck"><g class="idle"><g class="beat"${live ? ' data-el="beat"' : ""}>
    <g class="blob"><use href="#kari-core"/></g>
    <path class="boot" d="M46 161 h32 v9 q0 6 -6 6 h-20 q-6 0 -6 -6z"/><path class="boot-line" d="M48 169 h28"/>
    <path class="boot" d="M86 161 h32 v9 q0 6 -6 6 h-20 q-6 0 -6 -6z"/><path class="boot-line" d="M88 169 h28"/>
    <path class="hood" d="M24 114 C17 86 21 56 33 38 L29 13 C40 21 49 28 56 33 C71 26 93 26 106 32 C113 30 119 28 126 25 L124 45 C139 63 142 90 136 114 C126 126 110 128 98 124 L62 124 C50 128 33 126 24 114 Z"/>
    <ellipse class="hole" cx="80" cy="94" rx="35" ry="27"/>
    <ellipse class="stitch" cx="80" cy="94" rx="38.5" ry="30.5"/>
    <use class="pink" href="#kari-spk" transform="translate(40 66) scale(.62)"/>
    <path class="stitch" d="M33 66 h-4 M47 66 h4 M40 59 v-4 M40 73 v4"/>
    <g class="lid-a lidf"><path class="glow" d="M58 87 L75 93 Q73 101 65 100 Q57 98 58 87 Z"/><circle class="dot" cx="66" cy="95" r="1.6"/></g>
    <g class="lid-b lidf"><path class="glow" d="M102 87 L85 93 Q87 101 95 100 Q103 98 102 87 Z"/><circle class="dot" cx="94" cy="95" r="1.6"/></g>
    <g class="grin"><path d="M64 106 Q80 120 96 106 Q80 112 64 106 Z"/><path class="fang" d="M71 108.6 L73 113 L75 109.4Z"/><path class="fang" d="M85 109.4 L87 113 L89 108.6Z"/></g>
    <g><circle class="gem" cx="64" cy="124.5" r="1.1"/><circle class="gem" cx="70" cy="125.5" r="1.1"/><circle class="gem" cx="76" cy="126" r="1.1"/><circle class="gem" cx="84" cy="126" r="1.1"/><circle class="gem" cx="90" cy="125.5" r="1.1"/><circle class="gem" cx="96" cy="124.5" r="1.1"/></g>
    <g class="charm"><path class="chain" d="M80 125 V133"/><path class="pink" d="M80 142 C74 138 75 133 78 133 C79 133 80 134 80 134.8 C80 134 81 133 82 133 C85 133 86 138 80 142Z"/></g>
    ${live ? zz(138, 34) : ""}
  </g></g></g>`,
};

const SIS: Record<KariForm, boolean> = { kari: false, nebula: false, medusa: false, hex: true, chrome: true, hood: true };

/** The form's svg. live = the character on the player; otherwise the still portrait on her settings tile. */
export function formSvg(id: KariForm, live: boolean): string {
  const f = BODY[id] ? id : "kari";
  return `<svg class="kf f-${f}${SIS[f] ? " sis" : ""}" viewBox="0 0 160 180" aria-hidden="true" focusable="false">${BODY[f](live)}\n</svg>`;
}

/** Nebula's orbit: the moon passes behind her (back half) and in front of her (front half); x/y in her viewBox. */
export function orbitAt(theta: number) {
  return { x: 80 + 70 * Math.cos(theta), y: 116 + 14 * Math.sin(theta), back: Math.sin(theta) < 0 };
}
