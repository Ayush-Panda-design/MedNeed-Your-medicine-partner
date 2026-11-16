import "./chat-jp.css";

const PETALS = [
  { x: "6%", s: 9, t: 11, d: 0, dx: 30 }, { x: "17%", s: 7, t: 14, d: -5, dx: -24 }, { x: "29%", s: 10, t: 12, d: -2, dx: 36 },
  { x: "41%", s: 7, t: 15, d: -9, dx: -30 }, { x: "53%", s: 9, t: 10.5, d: -4, dx: 26 }, { x: "64%", s: 8, t: 13, d: -7, dx: -34 },
  { x: "75%", s: 10, t: 12.5, d: -1, dx: 28 }, { x: "86%", s: 7, t: 14.5, d: -10, dx: -22 }, { x: "94%", s: 8, t: 11.5, d: -6, dx: 20 },
];

/** Sakura petals drifting down behind the messages. Decorative only. */
export function Petals() {
  return (
    <div className="jp-petals" aria-hidden>
      {PETALS.map((p, i) => (
        <span key={i} className="jp-petal" style={{ "--x": p.x, "--s": `${p.s}px`, "--t": `${p.t}s`, "--d": `${p.d}s`, "--dx": `${p.dx}px` } as React.CSSProperties} />
      ))}
    </div>
  );
}

const waves = (y: number) => {
  let d = `M-40 ${y}`;
  for (let i = 0; i < 20; i++) d += ` q10 -9 20 0 t20 0`;
  return d + ` V140 H-40 Z`;
};

function Blossom({ x, y, r = 1 }: { x: number; y: number; r?: number }) {
  return (
    <g className="jp-bloom" transform={`translate(${x} ${y}) scale(${r})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} className="jp-bl" cx={0} cy={-4.2} r={3.4} transform={`rotate(${a})`} />
      ))}
      <circle className="jp-bl-c" r={1.6} />
    </g>
  );
}

/** A small original illustration: Mt. Fuji at sunrise, a torii gate, a blossoming branch, drifting clouds and a koi swimming over waves. */
export function Scene({ className = "" }: { className?: string }) {
  return (
    <svg className={`jp-scene ${className}`} viewBox="0 0 320 140" role="img" aria-label="Mount Fuji, a torii gate and cherry blossom">
      <defs>
        <linearGradient id="jp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="jp-sky-a" />
          <stop offset="1" className="jp-sky-b" />
        </linearGradient>
      </defs>
      <rect width="320" height="140" fill="url(#jp-sky)" />
      <circle className="jp-sun" cx="206" cy="42" r="15" />
      <g className="jp-cloud-1"><ellipse className="jp-cloud" cx="30" cy="30" rx="22" ry="6" /><ellipse className="jp-cloud" cx="46" cy="25" rx="14" ry="6" /></g>
      <g className="jp-cloud-2"><ellipse className="jp-cloud" cx="0" cy="52" rx="18" ry="5" /><ellipse className="jp-cloud" cx="12" cy="48" rx="11" ry="5" /></g>
      {/* Fuji */}
      <path className="jp-fuji-2" d="M104 112 L150 70 L214 112 Z" />
      <path className="jp-fuji" d="M42 114 L128 38 Q140 28 152 38 L238 114 Z" />
      <path className="jp-snow" d="M108 56 L128 38 Q140 28 152 38 L172 56 L160 52 L151 61 L140 50 L129 61 L120 52 Z" />
      {/* Torii */}
      <g className="jp-torii">
        <path d="M250 70 Q272 63 296 70 L294 76 Q272 70 252 76 Z" />
        <rect x="256" y="76" width="5" height="38" /><rect x="285" y="76" width="5" height="38" />
        <rect x="253" y="84" width="40" height="4" />
      </g>
      {/* Waves + koi */}
      <g className="jp-waves-1"><path className="jp-wave-a" d={waves(112)} /></g>
      <g className="jp-koi"><g className="jp-koi-bob">
        <ellipse cx="0" cy="119" rx="10" ry="4.2" fill="#ff8a3d" />
        <ellipse cx="-2" cy="117.8" rx="4" ry="2" fill="#fff" opacity=".85" />
        <path className="jp-tail" d="M-9 119 L-18 114 Q-15 119 -18 124 Z" fill="#ff7a28" />
        <circle cx="6" cy="118.2" r=".9" fill="#222" />
      </g></g>
      <g className="jp-waves-2"><path className="jp-wave-b" d={waves(124)} /></g>
      <path className="jp-wave-line" d="M0 128 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" />
      {/* Cherry branch */}
      <path className="jp-branch" strokeWidth="2.6" d="M-2 16 Q34 12 62 34" />
      <path className="jp-branch" strokeWidth="1.8" d="M26 16 Q36 28 34 42" />
      <Blossom x={14} y={15} r={1.1} /><Blossom x={34} y={19} r={1.25} /><Blossom x={52} y={28} r={1} /><Blossom x={34} y={40} r={0.95} /><Blossom x={62} y={36} r={0.8} />
    </svg>
  );
}

/** Paper lantern avatar (assistant). */
export function Lantern({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g className="jp-sway">
        <path d="M12 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <rect x="8" y="4" width="8" height="2" rx=".8" fill="currentColor" />
        <ellipse className="jp-lantern-glow" cx="12" cy="12.5" rx="6.2" ry="6.4" fill="#fde68a" opacity=".95" />
        <ellipse cx="12" cy="12.5" rx="6.2" ry="6.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6.2 10.5h11.6M6 14.5h12" stroke="currentColor" strokeWidth="1" opacity=".7" />
        <rect x="8" y="18.4" width="8" height="2" rx=".8" fill="currentColor" />
        <path d="M12 20.4v2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Torii gate avatar (store team). */
export function ToriiIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M2 5.2Q12 2.6 22 5.2L21.2 7.8Q12 5.6 2.8 7.8Z" />
      <rect x="5" y="8" width="2.4" height="14" rx=".5" /><rect x="16.6" y="8" width="2.4" height="14" rx=".5" />
      <rect x="3.6" y="11" width="16.8" height="2" rx=".4" />
    </svg>
  );
}
