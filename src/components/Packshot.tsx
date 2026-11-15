// Generated "packshot" artwork for products without a photo (design from the Lovable concept): a blister strip
// for tablets/capsules, a bottle for liquids, a tube for creams, a device for equipment — each with its own
// colour wash derived from the product, so a grid of placeholder products still looks intentional.

type Shape = "tablet" | "capsule" | "syrup" | "liquid" | "cream" | "device";

function shapeFor(form: string): Shape {
  const f = form.toLowerCase();
  if (/capsule|softgel/.test(f)) return "capsule";
  if (/syrup|suspension|drops|solution|elixir/.test(f)) return "syrup";
  if (/liquid|lotion|spray|mouthwash|wash|oil|injection|inhaler/.test(f)) return "liquid";
  if (/cream|gel|ointment|paste/.test(f)) return "cream";
  if (/device|monitor|meter|strip|bandage|kit|mask/.test(f)) return "device";
  return "tablet";
}

/** Stable 0–359 hue from the product slug, so each product keeps its colour everywhere. */
function hueFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Short label printed on the pack, e.g. "AMLODIPINE 5". */
function labelFor(name: string) {
  const word = (name.split(/\s+/)[0] ?? "").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 11);
  const num = name.match(/\d+(\.\d+)?/)?.[0];
  return num && word.length <= 10 ? `${word} ${num}` : word;
}

export function Packshot({ name, form, seed, className = "" }: { name: string; form: string; seed: string; className?: string }) {
  const shape = shapeFor(form);
  const hue = hueFor(seed);
  const label = labelFor(name);
  const wash = `oklch(0.93 0.06 ${hue})`;
  const deep = `oklch(0.55 0.15 ${hue})`;
  return (
    <div
      className={`mn-packshot relative overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 90% at 30% 20%, oklch(0.98 0.02 ${hue}), ${wash})` }}
      role="img"
      aria-label={name}
    >
      <div aria-hidden className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full opacity-40 blur-2xl" style={{ background: deep }} />
      <svg viewBox="0 0 200 150" className="mn-packshot-art relative h-full w-full" aria-hidden>
        <ellipse cx="100" cy="134" rx="60" ry="6" fill="oklch(0.3 0.05 160 / .18)" />
        {(shape === "tablet" || shape === "capsule") && (
          <g transform="rotate(-12 100 75)">
            <rect x="35" y="35" width="130" height="80" rx="10" fill="oklch(0.94 0.005 250)" stroke="oklch(0.82 0.01 250)" />
            <rect x="35" y="35" width="130" height="16" rx="8" fill={deep} />
            <text x="45" y="47" fontSize="8" fontWeight="700" fill="white" fontFamily="system-ui, sans-serif">{label}</text>
            {[0, 1, 2, 3].map((c) =>
              [0, 1].map((r) => {
                const x = 55 + c * 30;
                const y = 70 + r * 26;
                return shape === "tablet" ? (
                  <g key={`${c}${r}`}>
                    <circle cx={x} cy={y} r="10" fill="oklch(0.86 0.01 250)" />
                    <circle cx={x} cy={y - 1} r="8" fill="white" />
                    <line x1={x - 5} y1={y - 1} x2={x + 5} y2={y - 1} stroke="oklch(0.85 0.01 250)" />
                  </g>
                ) : (
                  <g key={`${c}${r}`} transform={`rotate(30 ${x} ${y})`}>
                    <rect x={x - 12} y={y - 6} width="24" height="12" rx="6" fill="oklch(0.86 0.01 250)" />
                    <path d={`M${x} ${y - 5}h-6a5 5 0 0 0 0 10h6z`} fill={deep} />
                    <path d={`M${x} ${y - 5}h6a5 5 0 0 1 0 10h-6z`} fill="oklch(0.88 0.19 125)" />
                  </g>
                );
              }),
            )}
          </g>
        )}
        {(shape === "syrup" || shape === "liquid") && (
          <g>
            <rect x="85" y="14" width="30" height="16" rx="3" fill={shape === "syrup" ? deep : "oklch(0.95 0.01 250)"} />
            <path d="M80 30h40v8c12 6 16 14 16 26v58a8 8 0 0 1-8 8H72a8 8 0 0 1-8-8V64c0-12 4-20 16-26z" fill={shape === "syrup" ? "oklch(0.55 0.13 55)" : "oklch(0.85 0.06 230)"} />
            <path d="M72 50c-3 6-3 60 0 70" stroke="white" strokeOpacity=".4" strokeWidth="5" fill="none" strokeLinecap="round" />
            <rect x="70" y="66" width="60" height="44" rx="5" fill="oklch(0.98 0.01 100)" />
            <rect x="70" y="66" width="60" height="10" rx="4" fill={deep} />
            <text x="100" y="92" fontSize="8" fontWeight="700" textAnchor="middle" fill="oklch(0.25 0.03 160)" fontFamily="system-ui, sans-serif">{label}</text>
            <rect x="82" y="98" width="36" height="3" rx="1.5" fill="oklch(0.85 0.02 160)" />
          </g>
        )}
        {shape === "cream" && (
          <g transform="rotate(-18 100 80)">
            <path d="M40 60h110l10 8v24l-10 8H40z" fill="white" stroke="oklch(0.85 0.01 250)" />
            <path d="M40 60l-10 4v32l10 4z" fill="oklch(0.85 0.01 250)" />
            <rect x="160" y="66" width="22" height="28" rx="4" fill={deep} />
            <rect x="60" y="68" width="70" height="24" rx="4" fill={wash} />
            <text x="95" y="84" fontSize="8" fontWeight="700" textAnchor="middle" fill={deep} fontFamily="system-ui, sans-serif">{label}</text>
          </g>
        )}
        {shape === "device" && (
          <g transform="rotate(-25 100 75)">
            <rect x="30" y="62" width="120" height="26" rx="13" fill="white" stroke="oklch(0.85 0.01 250)" />
            <rect x="150" y="70" width="24" height="10" rx="5" fill="oklch(0.8 0.01 250)" />
            <rect x="60" y="68" width="40" height="14" rx="3" fill="oklch(0.3 0.04 160)" />
            <text x="80" y="79" fontSize="9" fontWeight="700" textAnchor="middle" fill="oklch(0.88 0.19 125)" fontFamily="monospace">98.6°</text>
            <circle cx="115" cy="75" r="5" fill={deep} />
          </g>
        )}
      </svg>
    </div>
  );
}
