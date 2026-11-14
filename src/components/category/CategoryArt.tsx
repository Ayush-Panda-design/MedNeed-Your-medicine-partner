import type { ReactElement } from "react";

/*
 * Original flat illustrations for the "Shop by category" tiles (drawn for MedNeed; no third-party artwork).
 * Every drawing uses the same 160x160 canvas and the same small set of colour classes, styled in tiles.css:
 *   ct-w  white          ct-c  cream          ct-a  the tile's deep accent     ct-p  the tile's pop colour
 *   ct-i  ink (details)  ct-g  glass/soft     ct-sh ground shadow
 * so each drawing automatically matches the colours of the tile it sits on.
 */

const Shadow = ({ cx = 80, w = 46 }: { cx?: number; w?: number }) => <ellipse className="ct-sh" cx={cx} cy={146} rx={w} ry={6} />;

const art: Record<string, () => ReactElement> = {
  // Blister strip of tablets + a loose tablet
  "pain-relief": () => (
    <>
      <Shadow />
      <g transform="rotate(-14 80 92)">
        <rect className="ct-w" x="34" y="52" width="92" height="74" rx="12" />
        <rect className="ct-g" x="34" y="52" width="92" height="12" rx="6" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => <ellipse key={`${r}${c}`} className={r === 1 && c === 2 ? "ct-c" : "ct-p"} cx={48 + c * 21.5} cy={76 + r * 17} rx="8" ry="6" />),
        )}
      </g>
      <g transform="rotate(25 122 128)">
        <ellipse className="ct-w" cx="122" cy="128" rx="15" ry="10" />
        <rect className="ct-a" x="121" y="118.5" width="2" height="19" rx="1" />
      </g>
    </>
  ),
  // Syrup bottle + dosing cup + drops
  "cold-cough": () => (
    <>
      <Shadow />
      <rect className="ct-a" x="60" y="30" width="34" height="16" rx="4" />
      <path className="ct-p" d="M56 50h42c4 0 7 3 7 7v6c8 5 12 12 12 21v48c0 6-5 11-11 11H48c-6 0-11-5-11-11V84c0-9 4-16 12-21v-6c0-4 3-7 7-7z" />
      <rect className="ct-w" x="46" y="86" width="62" height="38" rx="8" />
      <rect className="ct-a" x="55" y="96" width="34" height="5" rx="2.5" />
      <rect className="ct-g" x="55" y="106" width="44" height="4" rx="2" />
      <rect className="ct-g" x="55" y="114" width="26" height="4" rx="2" />
      <path className="ct-w" d="M108 112h30l-4 30h-22z" opacity=".95" />
      <path className="ct-p" d="M110 124h26l-2 16h-22z" opacity=".75" />
      <path className="ct-w" d="M30 40c0-6 6-12 6-12s6 6 6 12a6 6 0 0 1-12 0z" />
      <path className="ct-w" d="M128 56c0-4 4-8 4-8s4 4 4 8a4 4 0 0 1-8 0z" opacity=".8" />
    </>
  ),
  // Capsules + shield
  "infection-care": () => (
    <>
      <Shadow />
      <path className="ct-w" d="M80 26l40 14v30c0 28-17 47-40 56-23-9-40-28-40-56V40z" />
      <path className="ct-g" d="M80 36l30 10v24c0 21-12 36-30 44z" />
      <rect className="ct-a" x="74" y="54" width="12" height="40" rx="4" />
      <rect className="ct-a" x="60" y="68" width="40" height="12" rx="4" />
      <g transform="rotate(-35 40 126)">
        <rect className="ct-p" x="20" y="117" width="40" height="18" rx="9" />
        <rect className="ct-w" x="40" y="117" width="20" height="18" rx="9" />
        <rect className="ct-w" x="38" y="117" width="6" height="18" />
      </g>
      <g transform="rotate(30 122 128)">
        <rect className="ct-w" x="102" y="119" width="40" height="18" rx="9" />
        <rect className="ct-a" x="122" y="119" width="20" height="18" rx="9" />
        <rect className="ct-a" x="120" y="119" width="6" height="18" />
      </g>
    </>
  ),
  // Inhaler + breath lines
  "respiratory-care": () => (
    <>
      <Shadow w={40} />
      <path className="ct-g" d="M30 54c10-6 22-6 32 0M24 70c14-8 30-8 44 0M30 86c10-6 22-6 32 0" fill="none" strokeWidth="6" strokeLinecap="round" stroke="currentColor" />
      <g transform="rotate(14 100 90)">
        <rect className="ct-w" x="84" y="28" width="38" height="78" rx="12" />
        <rect className="ct-a" x="84" y="28" width="38" height="16" rx="8" />
        <rect className="ct-g" x="92" y="56" width="22" height="30" rx="5" />
        <path className="ct-p" d="M70 100h44c6 0 10 4 10 10v20c0 6-4 10-10 10H76c-6 0-10-4-10-10v-26z" />
        <rect className="ct-i" x="66" y="112" width="8" height="18" rx="3" />
      </g>
    </>
  ),
  // Glucometer + strip + drop
  "diabetes-care": () => (
    <>
      <Shadow />
      <rect className="ct-w" x="46" y="34" width="62" height="100" rx="16" />
      <rect className="ct-i" x="56" y="46" width="42" height="34" rx="6" />
      <text x="77" y="70" textAnchor="middle" className="ct-txt">112</text>
      <circle className="ct-a" cx="66" cy="102" r="7" />
      <circle className="ct-p" cx="88" cy="102" r="7" />
      <rect className="ct-g" x="62" y="118" width="30" height="5" rx="2.5" />
      <rect className="ct-c" x="70" y="18" width="14" height="22" rx="2" />
      <rect className="ct-a" x="70" y="18" width="14" height="6" rx="2" />
      <path className="ct-p" d="M122 80c0-10 10-20 10-20s10 10 10 20a10 10 0 0 1-20 0z" />
      <path className="ct-w" d="M127 82a5 5 0 0 0 5 5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
    </>
  ),
  // Heart with ECG line + pill
  "heart-care": () => (
    <>
      <Shadow />
      <path className="ct-w" d="M80 132C46 108 26 88 26 62c0-16 12-28 27-28 12 0 21 7 27 17 6-10 15-17 27-17 15 0 27 12 27 28 0 26-20 46-54 70z" />
      <path className="ct-p" d="M80 120C54 101 38 85 38 64c0-10 7-18 16-18 9 0 15 6 20 14l6 10 6-10c5-8 11-14 20-14 9 0 16 8 16 18 0 21-16 37-42 56z" opacity=".9" />
      <path d="M34 82h24l8-16 10 32 9-22 6 6h35" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="rotate(-30 126 130)">
        <rect className="ct-w" x="110" y="122" width="32" height="15" rx="7.5" />
        <rect className="ct-a" x="126" y="122" width="16" height="15" rx="7.5" />
        <rect className="ct-a" x="124" y="122" width="5" height="15" />
      </g>
    </>
  ),
  // Supplement jar + capsules + orange slice
  vitamins: () => (
    <>
      <Shadow />
      <rect className="ct-a" x="48" y="30" width="58" height="18" rx="6" />
      <rect className="ct-w" x="42" y="46" width="70" height="92" rx="16" />
      <rect className="ct-p" x="42" y="72" width="70" height="40" />
      <text x="77" y="100" textAnchor="middle" className="ct-big">C</text>
      <circle className="ct-c" cx="128" cy="118" r="20" />
      <circle className="ct-p" cx="128" cy="118" r="16" />
      {[0, 60, 120, 180, 240, 300].map((d) => (
        <rect key={d} className="ct-c" x="127" y="103" width="2" height="15" transform={`rotate(${d} 128 118)`} />
      ))}
      <g transform="rotate(-25 30 128)">
        <rect className="ct-c" x="16" y="121" width="30" height="14" rx="7" />
        <rect className="ct-a" x="31" y="121" width="15" height="14" rx="7" />
      </g>
    </>
  ),
  // Brain + spark
  "brain-nerve": () => (
    <>
      <Shadow />
      <path className="ct-w" d="M78 40c-6-10-26-10-30 4-14 0-22 14-16 26-10 8-8 26 6 30 0 14 14 22 26 16 4 8 10 10 14 6V40z" />
      <path className="ct-c" d="M82 40c6-10 26-10 30 4 14 0 22 14 16 26 10 8 8 26-6 30 0 14-14 22-26 16-4 8-10 10-14 6V40z" />
      <path d="M56 62c8 0 10 8 18 6M50 88c10-4 16 4 24 0M104 60c-8 0-10 8-18 6M110 88c-10-4-16 4-24 0" fill="none" stroke="currentColor" className="ct-strokea" strokeWidth="4" strokeLinecap="round" />
      <path className="ct-p" d="M124 22l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
      <path className="ct-w" d="M34 28l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" opacity=".9" />
    </>
  ),
  // Stomach + sachet
  "digestive-care": () => (
    <>
      <Shadow />
      <path className="ct-w" d="M70 24v18c0 10-12 12-20 22-12 14-6 44 14 56 18 10 46 6 56-14 8-16 2-30-10-34-10-4-18 2-24 0-6-2-4-12-4-22V24z" />
      <path className="ct-p" d="M58 72c-6 12-2 30 12 38 14 8 34 6 42-8" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <g transform="rotate(12 128 118)">
        <path className="ct-c" d="M110 92h36v52h-36z" />
        <path className="ct-a" d="M110 92h36v10h-36z" />
        <path className="ct-a" d="M110 92l4 -4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle className="ct-p" cx="128" cy="122" r="8" />
      </g>
    </>
  ),
  // Eye + dropper bottle
  "eye-ear": () => (
    <>
      <Shadow />
      <path className="ct-w" d="M18 70c18-26 40-38 62-38s44 12 62 38c-18 26-40 38-62 38S36 96 18 70z" />
      <circle className="ct-p" cx="80" cy="70" r="24" />
      <circle className="ct-i" cx="80" cy="70" r="11" />
      <circle className="ct-w" cx="86" cy="64" r="5" />
      <path className="ct-a" d="M112 96h16l4 10h-24z" />
      <rect className="ct-c" x="106" y="106" width="28" height="36" rx="8" />
      <rect className="ct-a" x="112" y="118" width="16" height="12" rx="3" />
      <path className="ct-p" d="M88 120c0-6 6-12 6-12s6 6 6 12a6 6 0 0 1-12 0z" />
    </>
  ),
  // Cream tube + jar
  "skin-care": () => (
    <>
      <Shadow />
      <g transform="rotate(-18 64 84)">
        <path className="ct-w" d="M44 30h40l-4 92H48z" />
        <rect className="ct-a" x="52" y="122" width="24" height="18" rx="4" />
        <rect className="ct-p" x="50" y="56" width="28" height="30" rx="6" />
        <rect className="ct-g" x="54" y="94" width="20" height="4" rx="2" />
      </g>
      <rect className="ct-a" x="92" y="92" width="52" height="14" rx="6" />
      <rect className="ct-c" x="94" y="104" width="48" height="36" rx="10" />
      <rect className="ct-p" x="104" y="114" width="28" height="12" rx="6" />
      <path className="ct-w" d="M122 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
    </>
  ),
  // Baby bottle + rubber duck
  "baby-care": () => (
    <>
      <Shadow />
      <path className="ct-c" d="M54 22c0-6 12-6 12 0v8h-12z" />
      <rect className="ct-p" x="44" y="30" width="32" height="14" rx="5" />
      <rect className="ct-w" x="40" y="44" width="40" height="94" rx="14" />
      {[64, 80, 96, 112].map((y) => (
        <rect key={y} className="ct-a" x="40" y={y} width="12" height="3" rx="1.5" />
      ))}
      <rect className="ct-g" x="46" y="98" width="28" height="36" rx="8" />
      <circle className="ct-c" cx="118" cy="98" r="14" />
      <path className="ct-c" d="M96 124c0-14 10-20 22-20 16 0 26 6 26 18 0 12-12 20-26 20s-22-6-22-18z" />
      <path className="ct-p" d="M128 96l12 3-12 4z" />
      <circle className="ct-i" cx="121" cy="94" r="2.5" />
    </>
  ),
  // Calendar blister wheel + flower
  "womens-care": () => (
    <>
      <Shadow />
      <circle className="ct-w" cx="74" cy="84" r="50" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} className={i < 9 ? "ct-p" : "ct-c"} cx={74 + Math.cos(a) * 34} cy={84 + Math.sin(a) * 34} r="7" />;
      })}
      <circle className="ct-g" cx="74" cy="84" r="16" />
      {[0, 72, 144, 216, 288].map((d) => (
        <ellipse key={d} className="ct-c" cx="128" cy="118" rx="7" ry="13" transform={`rotate(${d} 128 130) translate(0 -1)`} />
      ))}
      <circle className="ct-a" cx="128" cy="130" r="6" />
    </>
  ),
  // Vial + syringe
  "hormones-steroids": () => (
    <>
      <Shadow />
      <rect className="ct-a" x="42" y="36" width="34" height="14" rx="4" />
      <rect className="ct-w" x="38" y="50" width="42" height="88" rx="10" />
      <rect className="ct-p" x="38" y="92" width="42" height="46" rx="10" />
      <rect className="ct-c" x="46" y="70" width="26" height="14" rx="4" />
      <g transform="rotate(35 112 90)">
        <rect className="ct-w" x="104" y="40" width="18" height="70" rx="4" />
        <rect className="ct-p" x="104" y="76" width="18" height="34" rx="4" opacity=".85" />
        <rect className="ct-a" x="98" y="34" width="30" height="8" rx="3" />
        <rect className="ct-a" x="110" y="20" width="6" height="16" />
        <rect className="ct-i" x="111.5" y="110" width="3" height="26" rx="1.5" />
      </g>
    </>
  ),
  // Thermometer + stethoscope
  devices: () => (
    <>
      <Shadow />
      <path d="M50 30v34c0 18 14 30 30 30s30-12 30-30V30" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <path d="M80 94v18c0 14 10 22 24 22" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <circle className="ct-a" cx="50" cy="28" r="7" />
      <circle className="ct-a" cx="110" cy="28" r="7" />
      <circle className="ct-w" cx="114" cy="132" r="14" />
      <circle className="ct-p" cx="114" cy="132" r="8" />
      <g transform="rotate(-40 34 120)">
        <rect className="ct-c" x="28" y="80" width="12" height="54" rx="6" />
        <circle className="ct-p" cx="34" cy="134" r="9" />
        <rect className="ct-p" x="31.5" y="104" width="5" height="28" rx="2.5" />
      </g>
    </>
  ),
};

// Medical kit for any category without its own drawing.
const fallback = () => (
  <>
    <Shadow />
    <rect className="ct-a" x="62" y="36" width="36" height="18" rx="6" fill="none" stroke="currentColor" strokeWidth="7" />
    <rect className="ct-w" x="30" y="50" width="100" height="84" rx="16" />
    <rect className="ct-p" x="72" y="68" width="16" height="48" rx="4" />
    <rect className="ct-p" x="56" y="84" width="48" height="16" rx="4" />
  </>
);

export function CategoryArt({ slug, className }: { slug: string; className?: string }) {
  const Draw = art[slug] ?? fallback;
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden focusable="false">
      <Draw />
    </svg>
  );
}
