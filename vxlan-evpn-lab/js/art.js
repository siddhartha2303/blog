/* Vector art for the overlay characters (ink + folded paper). Injected once into the page as an SVG sprite sheet.
   Symbols: lumen, lumenHappy, lumenOops, lumenEars, foldNote, foldMid, foldBox, tagVNI, dart, dartTorn. */
const ART_SVG = `<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true">
  <defs>
    <radialGradient id="orb" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffdf6"/><stop offset=".45" stop-color="#ffd2b3"/><stop offset="1" stop-color="#ff6a2b"/></radialGradient>
    <radialGradient id="halo"><stop offset="0" stop-color="#ff6a2b" stop-opacity=".55"/><stop offset="1" stop-color="#ff6a2b" stop-opacity="0"/></radialGradient>
    <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="7" height="7" fill="#ff8a57"/><line x1="0" y1="0" x2="0" y2="7" stroke="#1b2a4a" stroke-width="2.4"/></pattern>
    <filter id="noise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 .1  0 0 0 0 .16  0 0 0 0 .29  0 0 0 9 -4"/></filter>

    <g id="lumenBase">
      <circle cx="40" cy="40" r="38" fill="url(#halo)" class="glow"/>
      <path d="M40 62 C 26 78, 46 86, 32 104 C 56 92, 62 76, 40 62 Z" fill="#ff6a2b" opacity=".85"/>
      <circle cx="43" cy="43" r="25" fill="none" stroke="#1b2a4a" stroke-width="2.4"/>
      <circle cx="40" cy="40" r="25" fill="url(#orb)" stroke="#1b2a4a" stroke-width="2.4"/>
      <ellipse cx="31" cy="29" rx="6" ry="4" fill="#fff" opacity=".8" transform="rotate(-30 31 29)"/>
    </g>
    <symbol id="lumen" viewBox="-6 -4 92 112"><use href="#lumenBase"/><circle cx="31" cy="41" r="3.6" fill="#1b2a4a"/><circle cx="49" cy="41" r="3.6" fill="#1b2a4a"/><path d="M34 51 Q40 56 46 51" stroke="#1b2a4a" stroke-width="2.4" fill="none" stroke-linecap="round"/></symbol>
    <symbol id="lumenHappy" viewBox="-6 -4 92 112"><use href="#lumenBase"/><path d="M26 43 Q31 36 36 43 M44 43 Q49 36 54 43" stroke="#1b2a4a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M32 50 Q40 60 48 50 Z" fill="#1b2a4a"/></symbol>
    <symbol id="lumenOops" viewBox="-6 -4 92 112"><use href="#lumenBase"/><path d="M27 37 L35 45 M35 37 L27 45 M45 37 L53 45 M53 37 L45 45" stroke="#1b2a4a" stroke-width="3" stroke-linecap="round"/><path d="M33 55 Q40 49 47 55" stroke="#1b2a4a" stroke-width="2.6" fill="none" stroke-linecap="round"/></symbol>
    <symbol id="lumenEars" viewBox="-6 -4 92 112"><use href="#lumenBase"/><circle cx="31" cy="41" r="3.6" fill="#1b2a4a"/><circle cx="49" cy="41" r="3.6" fill="#1b2a4a"/><path d="M34 51 Q40 54 46 51" stroke="#1b2a4a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M14 40 C 14 12, 66 12, 66 40" stroke="#1b2a4a" stroke-width="3.4" fill="none"/><rect x="8" y="34" width="10" height="16" rx="4" fill="#1b2a4a"/><rect x="62" y="34" width="10" height="16" rx="4" fill="#1b2a4a"/></symbol>

    <g id="noteBase">
      <path d="M9 7 H45 L59 21 V69 H9 Z" fill="#ff6a2b" opacity=".4"/>
      <path d="M6 4 H42 L56 18 V66 H6 Z" fill="#fffaf0" stroke="#1b2a4a" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M42 4 V18 H56 Z" fill="#eadcc0" stroke="#1b2a4a" stroke-width="2.2" stroke-linejoin="round"/>
    </g>
    <symbol id="foldNote" viewBox="0 0 64 72"><use href="#noteBase"/><rect x="12" y="24" width="36" height="8" rx="2" fill="#ff6a2b" stroke="#1b2a4a" stroke-width="1.8"/><circle cx="23" cy="46" r="2.8" fill="#1b2a4a"/><circle cx="39" cy="46" r="2.8" fill="#1b2a4a"/><path d="M26 54 Q31 58 36 54" stroke="#1b2a4a" stroke-width="2.2" fill="none" stroke-linecap="round"/></symbol>
    <symbol id="foldMid" viewBox="0 0 80 72"><g transform="translate(8 8) scale(.84)"><use href="#noteBase"/><circle cx="23" cy="46" r="3" fill="#1b2a4a"/><circle cx="39" cy="46" r="3" fill="#1b2a4a"/></g><path d="M4 22 L30 40 L4 60 Z" fill="#e6d6b0" stroke="#1b2a4a" stroke-width="2.2" stroke-linejoin="round"/><path d="M76 22 L50 40 L76 60 Z" fill="#d9c391" stroke="#1b2a4a" stroke-width="2.2" stroke-linejoin="round"/></symbol>
    <symbol id="foldBox" viewBox="0 0 84 74">
      <path d="M12 34 L28 14 H78 L62 34 Z" fill="#f3e6c4" stroke="#1b2a4a" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M62 34 L78 14 V50 L62 70 Z" fill="#d9c391" stroke="#1b2a4a" stroke-width="2.4" stroke-linejoin="round"/>
      <rect x="12" y="34" width="50" height="36" fill="#e8d7b0" stroke="#1b2a4a" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M37 34 V70" stroke="#ff6a2b" stroke-width="5"/><path d="M45 14 L29 34" stroke="#ff6a2b" stroke-width="5" opacity=".8"/>
      <circle cx="26" cy="50" r="2.8" fill="#1b2a4a"/><circle cx="48" cy="50" r="2.8" fill="#1b2a4a"/><path d="M32 58 Q37 62 42 58" stroke="#1b2a4a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    </symbol>
    <symbol id="tagVNI" viewBox="0 0 70 24"><path d="M2 2 H52 L68 12 L52 22 H2 Z" fill="#ff6a2b" stroke="#1b2a4a" stroke-width="2" stroke-linejoin="round"/><circle cx="10" cy="12" r="2.4" fill="#fffaf0"/><text x="17" y="16" font-family="DM Mono, monospace" font-size="10" font-weight="500" fill="#fffaf0">VNI</text></symbol>
    <symbol id="dart" viewBox="0 0 64 40"><path d="M2 22 L62 4 L36 38 L30 26 Z" fill="#fffaf0" stroke="#1b2a4a" stroke-width="2.2" stroke-linejoin="round"/><path d="M30 26 L62 4" stroke="#1b2a4a" stroke-width="2.2"/><path d="M62 4 L36 38 L30 26 Z" fill="currentColor" stroke="#1b2a4a" stroke-width="2.2" stroke-linejoin="round"/></symbol>
    <symbol id="dartTorn" viewBox="0 0 64 40"><path d="M2 22 L34 12 L30 20 L24 18 L26 26 L30 26 Z" fill="#fffaf0" stroke="#1b2a4a" stroke-width="2.2" stroke-linejoin="round"/><path d="M40 10 L62 4 L48 24 L44 18 Z" fill="currentColor" stroke="#1b2a4a" stroke-width="2.2" stroke-linejoin="round"/><path d="M40 32 L50 28 L46 38 Z" fill="#fffaf0" stroke="#1b2a4a" stroke-width="2" stroke-linejoin="round"/></symbol>
  <symbol id="sparkStar" viewBox="0 0 40 40"><path d="M20 2 L24 16 L38 20 L24 24 L20 38 L16 24 L2 20 L16 16 Z" fill="#ff6a2b" stroke="#1b2a4a" stroke-width="2.4" stroke-linejoin="round"/></symbol>
  </defs>
</svg>`;
