/** Small inline illustrations for the Health hub. Plain SVG, no images to load. Each takes a className for size and placement. */

type P = { className?: string };

const Leaf = ({ id, transform }: { id: string; transform: string }) => (
  <g transform={transform}>
    <path d="M0 0 C 14 -40, 64 -58, 108 -38 C 100 6, 56 34, 0 0 Z" fill={`url(#${id})`} />
    <path d="M6 -3 C 36 -18, 70 -28, 100 -34" stroke="#ffffff" strokeOpacity=".55" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </g>
);

/** Shield with a cross, a stethoscope and leaves: the hub's headline picture. */
export function HeroArt({ className }: P) {
  return (
    <svg viewBox="0 0 380 280" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ha-shield" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#86e3b8" /><stop offset="1" stopColor="#2c9c74" /></linearGradient>
        <linearGradient id="ha-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6cc56b" /><stop offset="1" stopColor="#2f8a45" /></linearGradient>
        <radialGradient id="ha-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffffff" stopOpacity=".85" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="196" cy="130" r="122" fill="url(#ha-glow)" />
      <ellipse cx="200" cy="244" rx="128" ry="14" fill="#1f6b3a" opacity=".14" />
      <path d="M200 38 L274 64 V132 C274 180 242 212 200 232 C158 212 126 180 126 132 V64 Z" fill="url(#ha-shield)" />
      <path d="M200 50 L263 72 V132 C263 172 236 200 200 218 C164 200 137 172 137 132 V72 Z" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="3" />
      <rect x="187" y="92" width="26" height="80" rx="8" fill="#fff" />
      <rect x="160" y="119" width="80" height="26" rx="8" fill="#fff" />
      <Leaf id="ha-leaf" transform="translate(150 226) rotate(-8) scale(.95)" />
      <Leaf id="ha-leaf" transform="translate(262 232) scale(-.85 .85) rotate(-4)" />
      {/* stethoscope */}
      <g fill="none" stroke="#27463d" strokeLinecap="round" strokeWidth="7">
        <path d="M300 22 C 300 46, 320 54, 332 74" />
        <path d="M326 18 C 340 30, 342 56, 332 74" />
        <path d="M332 74 C 346 118, 312 142, 304 168" />
      </g>
      <rect x="290" y="12" width="22" height="11" rx="5.5" fill="#27463d" />
      <rect x="318" y="8" width="22" height="11" rx="5.5" fill="#27463d" />
      <circle cx="302" cy="186" r="21" fill="#edf2f0" stroke="#27463d" strokeWidth="6" />
      <circle cx="302" cy="186" r="9" fill="#9db4ad" />
    </svg>
  );
}

/** Stethoscope and leaves: the first-aid page's headline picture. */
export function StethoArt({ className }: P) {
  return (
    <svg viewBox="0 0 260 260" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sa-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7dcf7a" /><stop offset="1" stopColor="#2f8a45" /></linearGradient>
        <radialGradient id="sa-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffffff" stopOpacity=".8" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="140" cy="130" r="118" fill="url(#sa-glow)" />
      <path d="M40 250 C 20 200, 40 150, 90 130 C 110 190, 90 232, 40 250 Z" fill="url(#sa-leaf)" opacity=".9" />
      <path d="M150 256 C 170 214, 210 196, 250 204 C 240 240, 200 262, 150 256 Z" fill="url(#sa-leaf)" opacity=".85" />
      <g fill="none" stroke="#27463d" strokeLinecap="round" strokeWidth="9">
        <path d="M96 18 C 70 40, 84 96, 122 108" />
        <path d="M168 14 C 196 40, 176 96, 142 108" />
        <path d="M132 108 C 126 150, 186 160, 196 190" />
      </g>
      <rect x="82" y="6" width="30" height="14" rx="7" fill="#27463d" />
      <rect x="156" y="2" width="30" height="14" rx="7" fill="#27463d" />
      <circle cx="198" cy="206" r="26" fill="#edf2f0" stroke="#27463d" strokeWidth="8" />
      <circle cx="198" cy="206" r="12" fill="#9db4ad" />
    </svg>
  );
}

/** First-aid kit for the emergency banner. */
export function KitArt({ className }: P) {
  return (
    <svg viewBox="0 0 170 150" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ka-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e6ecea" /></linearGradient>
      </defs>
      <ellipse cx="88" cy="138" rx="62" ry="8" fill="#7a1b1b" opacity=".16" />
      <path d="M62 42 V30 a11 11 0 0 1 11 -11 h26 a11 11 0 0 1 11 11 V42" fill="none" stroke="#b9c3bf" strokeWidth="8" strokeLinecap="round" />
      <rect x="22" y="38" width="132" height="92" rx="22" fill="url(#ka-body)" stroke="#d5dcd9" strokeWidth="2" />
      <path d="M22 64 H154" stroke="#d5dcd9" strokeWidth="2" />
      <rect x="79" y="70" width="18" height="48" rx="6" fill="#e23a3a" />
      <rect x="64" y="85" width="48" height="18" rx="6" fill="#e23a3a" />
      <g fill="#e23a3a"><rect x="8" y="30" width="16" height="6" rx="3" transform="rotate(35 8 30)" /><rect x="22" y="14" width="14" height="6" rx="3" transform="rotate(70 22 14)" /></g>
    </svg>
  );
}

/** Large, faded warning triangle for the right edge of the emergency banner. */
export function TriangleArt({ className }: P) {
  return (
    <svg viewBox="0 0 140 124" className={className} aria-hidden="true" focusable="false">
      <path d="M70 12 L126 108 H14 Z" fill="currentColor" stroke="currentColor" strokeWidth="14" strokeLinejoin="round" />
      <rect x="63" y="44" width="14" height="34" rx="7" fill="#fff" />
      <circle cx="70" cy="92" r="7.5" fill="#fff" />
    </svg>
  );
}

/** A cluster of soft leaves used as a corner decoration. Colour comes from the page; this only draws shapes. */
export function LeafCluster({ className }: P) {
  return (
    <svg viewBox="0 0 200 240" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lc-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9bd88f" /><stop offset="1" stopColor="#4aa35a" /></linearGradient>
        <linearGradient id="lc-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c4e8b4" /><stop offset="1" stopColor="#74bd7a" /></linearGradient>
      </defs>
      <g opacity=".7">
        <path d="M20 230 C 0 170, 20 100, 80 70 C 110 130, 90 200, 20 230 Z" fill="url(#lc-a)" />
        <path d="M100 236 C 90 180, 120 120, 186 108 C 196 168, 160 220, 100 236 Z" fill="url(#lc-b)" />
        <path d="M60 120 C 40 80, 60 30, 110 14 C 128 56, 108 100, 60 120 Z" fill="url(#lc-b)" />
      </g>
    </svg>
  );
}

/** A simple snake, since the icon set has none. */
export function SnakeIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M16.5 5.2 C 16.5 3.4, 14.4 2.8, 12.9 3.6 C 10.8 4.8, 7.6 5.6, 7.6 8.6 C 7.6 11.8, 16 11.4, 16 15 C 16 18.2, 12.2 19.4, 9 18.4" />
      <path d="M9 18.4 L6.2 19.6" />
      <circle cx="14.9" cy="5.1" r=".6" fill="currentColor" />
    </svg>
  );
}
