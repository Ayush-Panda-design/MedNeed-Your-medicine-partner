// Generated "packshot" artwork for products without a photo: each product gets a picture of the KIND of thing it is
// (blister strip, syrup bottle, tube, condom packet, diaper, sanitary pad, glucometer, test strips, toothpaste, soap,
// pump bottle, inhaler, dropper, vial, jar, sachet, bandage, thermometer, BP monitor, pregnancy test, carton), chosen
// from the product's name first, then its form, then its section. Each also gets a colour wash derived from the product,
// so a grid of placeholder products still looks intentional. Replace with real photos any time (see ProductVisual).

export type PackKind =
  | "tablet" | "capsule" | "syrup" | "bottle" | "dropper" | "tube" | "toothpaste" | "condom" | "diaper" | "pad" | "glucometer"
  | "strips" | "thermometer" | "bpmonitor" | "bandage" | "soap" | "pump" | "inhaler" | "vial" | "jar" | "sachet" | "pregtest" | "box";

const has = (s: string, re: RegExp) => re.test(s);

/** What kind of thing this product is, for its picture and icon. Name wins over form because the form column is often "Other". */
export function kindFor(p: { name: string; form: string; category?: string }): PackKind {
  const n = p.name.toLowerCase();
  const f = p.form.toLowerCase();
  const topicalWord = /\b(cream|ointment|oint|gel|lotion|oil|powder|wash|shampoo|rash|wipes?)\b/;

  if (has(n, /\b(condoms?|durex|manforce|skore|moods)\b/)) return "condom";
  if (has(n, /\b(pregnancy|prega ?news|i know)\b/)) return "pregtest";
  if (has(n, /\b(sanitary|napkins?|stayfree|whisper|sofy|comfy|pantyliner)\b/)) return "pad";
  if ((has(n, /\b(diapers?|pampers|huggies|mamy ?poko)\b/) || has(n, /\b(baby|adult) pants?\b/)) && !has(n, topicalWord)) return "diaper";
  if (has(n, /\b(gluco ?meter)\b/)) return "glucometer";
  if (has(n, /\b(test strips?|glucose strips?|strips|lancets?)\b/)) return "strips";
  if (has(n, /\bthermometer\b/)) return "thermometer";
  if (has(n, /\b(bp monitor|blood pressure|nebuli[sz]er)\b/)) return "bpmonitor";
  if (has(n, /\b(bandage|plaster|gauze|dressing|cotton|crepe)\b/)) return "bandage";
  if (has(n, /\btooth ?paste\b/)) return "toothpaste";
  if (has(n, /\bsoap\b/)) return "soap";
  if (has(n, /\b(mouth ?wash|gargle|dettol|savlon|antiseptic|betadine)\b/)) return "bottle";
  if (has(n, /\bors\b/) && has(n, /\b(liquid|\d+ ?ml+)\b/)) return "bottle";
  if (has(n, /\b(shampoo|face ?wash|cleanser|body wash|hand ?wash|sanitizer)\b/) || f === "lotion") return "pump";
  if (has(n, /\bserum\b/)) return "dropper";
  if (has(n, /\b(lip balm|balm|roll ?on)\b/)) return "tube";
  if (has(n, /\b(gel|paste|cream|ointment)\b/) && has(n, /\b\d{3,}\s?ml\b/)) return "bottle";
  if (has(n, /\b(inhaler|rotacaps?|respules?)\b/) || f === "inhaler") return "inhaler";
  if (has(n, /\b(lubricants?|lube)\b/)) return "tube";
  if (has(n, /\b(eye|ear|nasal)\s*drops?\b/) || f === "drops") return "dropper";
  if (has(n, /\b(injection|inj|vial|insulin|cartridge)\b/) || f === "injection") return "vial";
  if (has(n, /\b(syrup|syp|suspension|elixir|expectorant)\b/) || f === "syrup" || f === "suspension") return "syrup";
  if (f === "sachet" || has(n, /\b(sachet|ors|electral)\b/)) return "sachet";
  if (f === "powder" || has(n, /\b(protein|horlicks|bournvita|complan|ensure|whey|health drink|chyawan\w*)\b/)) return "jar";
  if (f === "cream" || f === "gel" || f === "ointment" || has(n, /\b(cream|ointment|oint|gel|paste)\b/)) return "tube";
  if (f === "capsule" || has(n, /\bcaps?(ule)?s?\b/)) return "capsule";
  if (f === "tablet" || has(n, /\b(tab|tablet)s?\b/)) return "tablet";
  if (f === "spray" || has(n, /\b(oil|spray|liquid|solution)\b/)) return "bottle";
  if (f === "device") return "thermometer";
  return "box";
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

const INK = "oklch(0.25 0.03 160)";
const GREY = "oklch(0.86 0.01 250)";
const PAPER = "oklch(0.98 0.01 100)";
const FONT = "system-ui, sans-serif";

type Art = { deep: string; wash: string; label: string };

function Art({ kind, deep, wash, label }: Art & { kind: PackKind }) {
  switch (kind) {
    case "tablet":
    case "capsule":
      return (
        <g transform="rotate(-12 100 75)">
          <rect x="35" y="35" width="130" height="80" rx="10" fill="oklch(0.94 0.005 250)" stroke="oklch(0.82 0.01 250)" />
          <rect x="35" y="35" width="130" height="16" rx="8" fill={deep} />
          <text x="45" y="47" fontSize="8" fontWeight="700" fill="white" fontFamily={FONT}>{label}</text>
          {[0, 1, 2, 3].map((c) =>
            [0, 1].map((r) => {
              const x = 55 + c * 30;
              const y = 70 + r * 26;
              return kind === "tablet" ? (
                <g key={`${c}${r}`}>
                  <circle cx={x} cy={y} r="10" fill={GREY} />
                  <circle cx={x} cy={y - 1} r="8" fill="white" />
                  <line x1={x - 5} y1={y - 1} x2={x + 5} y2={y - 1} stroke="oklch(0.85 0.01 250)" />
                </g>
              ) : (
                <g key={`${c}${r}`} transform={`rotate(30 ${x} ${y})`}>
                  <rect x={x - 12} y={y - 6} width="24" height="12" rx="6" fill={GREY} />
                  <path d={`M${x} ${y - 5}h-6a5 5 0 0 0 0 10h6z`} fill={deep} />
                  <path d={`M${x} ${y - 5}h6a5 5 0 0 1 0 10h-6z`} fill="oklch(0.88 0.19 125)" />
                </g>
              );
            }),
          )}
        </g>
      );
    case "syrup":
    case "bottle":
      return (
        <g>
          <rect x="85" y="14" width="30" height="16" rx="3" fill={kind === "syrup" ? deep : "oklch(0.95 0.01 250)"} />
          <path d="M80 30h40v8c12 6 16 14 16 26v58a8 8 0 0 1-8 8H72a8 8 0 0 1-8-8V64c0-12 4-20 16-26z" fill={kind === "syrup" ? "oklch(0.55 0.13 55)" : "oklch(0.85 0.06 230)"} />
          <path d="M72 50c-3 6-3 60 0 70" stroke="white" strokeOpacity=".4" strokeWidth="5" fill="none" strokeLinecap="round" />
          <rect x="70" y="66" width="60" height="44" rx="5" fill={PAPER} />
          <rect x="70" y="66" width="60" height="10" rx="4" fill={deep} />
          <text x="100" y="92" fontSize="8" fontWeight="700" textAnchor="middle" fill={INK} fontFamily={FONT}>{label}</text>
          <rect x="82" y="98" width="36" height="3" rx="1.5" fill="oklch(0.85 0.02 160)" />
        </g>
      );
    case "tube":
      return (
        <g transform="rotate(-18 100 80)">
          <path d="M40 60h110l10 8v24l-10 8H40z" fill="white" stroke="oklch(0.85 0.01 250)" />
          <path d="M40 60l-10 4v32l10 4z" fill="oklch(0.85 0.01 250)" />
          <rect x="160" y="66" width="22" height="28" rx="4" fill={deep} />
          <rect x="60" y="68" width="70" height="24" rx="4" fill={wash} />
          <text x="95" y="84" fontSize="8" fontWeight="700" textAnchor="middle" fill={deep} fontFamily={FONT}>{label}</text>
        </g>
      );
    case "toothpaste":
      return (
        <g transform="rotate(-24 100 80)">
          <rect x="46" y="62" width="14" height="32" rx="2" fill="oklch(0.8 0.01 250)" />
          <path d="M58 58h82l14 6v22l-14 6H58z" fill="white" stroke="oklch(0.85 0.01 250)" />
          <rect x="62" y="62" width="76" height="26" fill={deep} opacity=".92" />
          <text x="100" y="79" fontSize="8" fontWeight="800" textAnchor="middle" fill="white" fontFamily={FONT}>{label}</text>
          <rect x="154" y="64" width="24" height="22" rx="4" fill={INK} />
          <path d="M70 104c10-8 18 8 28 0s18 8 28 0" stroke={deep} strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      );
    case "condom":
      return (
        <g>
          <g transform="rotate(14 120 80)">
            <rect x="82" y="38" width="74" height="74" rx="5" fill="oklch(0.78 0.05 80)" />
          </g>
          <g transform="rotate(-9 80 82)">
            <rect x="44" y="40" width="76" height="76" rx="5" fill={deep} />
            <rect x="49" y="45" width="66" height="66" rx="3" fill="none" stroke="white" strokeOpacity=".55" strokeDasharray="2.5 3" />
            <circle cx="82" cy="78" r="23" fill="none" stroke="white" strokeOpacity=".75" strokeWidth="4" />
            <circle cx="82" cy="78" r="15" fill="none" stroke="white" strokeOpacity=".4" strokeWidth="2" />
            <text x="82" y="106" fontSize="8" fontWeight="800" textAnchor="middle" fill="white" fontFamily={FONT}>{label}</text>
          </g>
        </g>
      );
    case "diaper":
      return (
        <g transform="rotate(-6 100 78)">
          <path d="M38 40h124c0 20-22 28-30 46-3 8-3 16 3 28H65c6-12 6-20 3-28-8-18-30-26-30-46z" fill="white" stroke="oklch(0.82 0.01 250)" strokeWidth="1.5" />
          <path d="M38 40h124v14H38z" fill={deep} />
          <rect x="26" y="42" width="16" height="10" rx="3" fill={wash} stroke={deep} />
          <rect x="158" y="42" width="16" height="10" rx="3" fill={wash} stroke={deep} />
          <path d="M92 62h16v44H92z" fill={wash} />
          <path d="M96 70h8M96 80h8M96 90h8" stroke={deep} strokeWidth="2" strokeLinecap="round" />
          <text x="100" y="51" fontSize="7" fontWeight="800" textAnchor="middle" fill="white" fontFamily={FONT}>{label}</text>
        </g>
      );
    case "pad":
      return (
        <g transform="rotate(-18 100 78)">
          <path d="M82 22a18 18 0 0 1 36 0v34c10 0 16 6 16 12s-6 12-16 12v30a18 18 0 0 1-36 0V80c-10 0-16-6-16-12s6-12 16-12z" fill="white" stroke="oklch(0.82 0.01 250)" strokeWidth="1.5" />
          <rect x="92" y="22" width="16" height="104" rx="8" fill={wash} />
          <path d="M100 34v80" stroke={deep} strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" />
          <circle cx="100" cy="76" r="10" fill={deep} opacity=".9" />
          <path d="M100 70c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z" fill="white" />
        </g>
      );
    case "glucometer":
      return (
        <g transform="rotate(-10 100 78)">
          <rect x="66" y="22" width="68" height="108" rx="14" fill="white" stroke="oklch(0.82 0.01 250)" strokeWidth="1.5" />
          <rect x="74" y="32" width="52" height="34" rx="6" fill={INK} />
          <text x="100" y="58" fontSize="20" fontWeight="800" textAnchor="middle" fill="oklch(0.88 0.19 125)" fontFamily="ui-monospace, monospace">112</text>
          <circle cx="100" cy="88" r="11" fill={deep} />
          <circle cx="100" cy="88" r="5" fill="white" opacity=".8" />
          <rect x="88" y="108" width="24" height="26" rx="3" fill={wash} stroke={deep} />
          <path d="M100 104c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z" fill="oklch(0.62 0.2 25)" transform="translate(0 6)" />
        </g>
      );
    case "strips":
      return (
        <g>
          <g transform="rotate(-8 100 70)">
            <rect x="86" y="14" width="10" height="34" rx="2" fill="white" stroke={deep} />
            <rect x="102" y="10" width="10" height="38" rx="2" fill="white" stroke={deep} />
            <rect x="88" y="16" width="6" height="10" fill={deep} opacity=".7" /><rect x="104" y="12" width="6" height="10" fill={deep} opacity=".7" />
          </g>
          <rect x="72" y="42" width="56" height="12" rx="4" fill={INK} />
          <rect x="72" y="52" width="56" height="74" rx="9" fill={deep} />
          <rect x="78" y="62" width="44" height="46" rx="5" fill={PAPER} />
          <path d="M100 68c5 7 8 10 8 15a8 8 0 0 1-16 0c0-5 3-8 8-15z" fill="oklch(0.62 0.2 25)" />
          <text x="100" y="102" fontSize="7" fontWeight="800" textAnchor="middle" fill={INK} fontFamily={FONT}>STRIPS</text>
        </g>
      );
    case "thermometer":
      return (
        <g transform="rotate(-25 100 75)">
          <rect x="30" y="62" width="120" height="26" rx="13" fill="white" stroke="oklch(0.85 0.01 250)" />
          <rect x="150" y="70" width="24" height="10" rx="5" fill="oklch(0.8 0.01 250)" />
          <rect x="60" y="68" width="40" height="14" rx="3" fill={INK} />
          <text x="80" y="79" fontSize="9" fontWeight="700" textAnchor="middle" fill="oklch(0.88 0.19 125)" fontFamily="monospace">98.6°</text>
          <circle cx="115" cy="75" r="5" fill={deep} />
        </g>
      );
    case "bpmonitor":
      return (
        <g>
          <rect x="30" y="46" width="68" height="58" rx="10" fill="white" stroke="oklch(0.82 0.01 250)" strokeWidth="1.5" />
          <rect x="38" y="54" width="52" height="26" rx="5" fill={INK} />
          <text x="64" y="72" fontSize="13" fontWeight="800" textAnchor="middle" fill="oklch(0.88 0.19 125)" fontFamily="ui-monospace, monospace">120/80</text>
          <circle cx="64" cy="92" r="6" fill={deep} />
          <path d="M98 76c14 0 18-10 28-10" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M120 40h52a6 6 0 0 1 6 6v62a6 6 0 0 1-6 6h-52a6 6 0 0 1-6-6V46a6 6 0 0 1 6-6z" fill={deep} />
          <path d="M126 52h40M126 64h40M126 76h40M126 88h40" stroke="white" strokeOpacity=".35" strokeWidth="2" />
        </g>
      );
    case "bandage":
      return (
        <g>
          <g transform="rotate(-24 100 78)">
            <rect x="30" y="58" width="140" height="34" rx="17" fill="oklch(0.86 0.06 70)" stroke="oklch(0.78 0.07 65)" />
            <rect x="72" y="58" width="56" height="34" fill="white" stroke="oklch(0.82 0.01 250)" />
            <g fill="oklch(0.74 0.07 65)">{[44, 54, 64, 136, 146, 156].map((x) => [68, 80].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.8" />))}</g>
          </g>
          <g transform="rotate(20 110 112)" opacity=".92">
            <rect x="62" y="102" width="96" height="22" rx="11" fill="oklch(0.88 0.05 70)" stroke="oklch(0.78 0.07 65)" />
            <rect x="92" y="102" width="36" height="22" fill="white" stroke="oklch(0.82 0.01 250)" />
          </g>
        </g>
      );
    case "soap":
      return (
        <g>
          <g transform="rotate(-12 100 80)">
            <rect x="44" y="52" width="112" height="64" rx="22" fill={deep} />
            <rect x="52" y="58" width="96" height="52" rx="17" fill="none" stroke="white" strokeOpacity=".4" />
            <ellipse cx="100" cy="84" rx="26" ry="13" fill="white" opacity=".92" />
            <text x="100" y="88" fontSize="8" fontWeight="800" textAnchor="middle" fill={deep} fontFamily={FONT}>{label}</text>
          </g>
          <g fill="white" stroke={deep} strokeOpacity=".5"><circle cx="150" cy="40" r="9" /><circle cx="168" cy="58" r="5" /><circle cx="136" cy="28" r="4" /></g>
        </g>
      );
    case "pump":
      return (
        <g>
          <rect x="94" y="8" width="14" height="10" rx="3" fill={INK} />
          <path d="M94 12h-22a6 6 0 0 0-6 6v4h34" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <rect x="92" y="18" width="18" height="12" rx="2" fill="oklch(0.95 0.01 250)" />
          <rect x="62" y="30" width="76" height="98" rx="16" fill="oklch(0.9 0.05 230)" />
          <path d="M70 46c-3 8-3 58 0 74" stroke="white" strokeOpacity=".45" strokeWidth="5" fill="none" strokeLinecap="round" />
          <rect x="70" y="58" width="60" height="52" rx="6" fill={PAPER} />
          <rect x="70" y="58" width="60" height="11" rx="5" fill={deep} />
          <text x="100" y="92" fontSize="8" fontWeight="700" textAnchor="middle" fill={INK} fontFamily={FONT}>{label}</text>
        </g>
      );
    case "inhaler":
      return (
        <g transform="rotate(-8 100 78)">
          <rect x="82" y="14" width="36" height="64" rx="8" fill={deep} />
          <rect x="90" y="22" width="20" height="14" rx="3" fill="white" opacity=".85" />
          <path d="M72 70h56a8 8 0 0 1 8 8v28a10 10 0 0 1-10 10H74a10 10 0 0 1-10-10V78a8 8 0 0 1 8-8z" fill="white" stroke="oklch(0.82 0.01 250)" strokeWidth="1.5" />
          <rect x="90" y="112" width="20" height="20" rx="4" fill={INK} />
          <rect x="76" y="82" width="48" height="14" rx="4" fill={wash} />
          <text x="100" y="92" fontSize="7" fontWeight="800" textAnchor="middle" fill={deep} fontFamily={FONT}>{label}</text>
        </g>
      );
    case "dropper":
      return (
        <g>
          <path d="M92 8h16v10a8 8 0 0 1-16 0z" fill={INK} />
          <rect x="88" y="26" width="24" height="12" rx="3" fill="oklch(0.95 0.01 250)" />
          <path d="M86 38h28l4 8v68a8 8 0 0 1-8 8H90a8 8 0 0 1-8-8V46z" fill="oklch(0.55 0.13 55)" />
          <rect x="84" y="62" width="32" height="40" rx="4" fill={PAPER} />
          <rect x="84" y="62" width="32" height="9" rx="4" fill={deep} />
          <text x="100" y="90" fontSize="6.5" fontWeight="700" textAnchor="middle" fill={INK} fontFamily={FONT}>{label}</text>
          <path d="M100 124c4 6 6 8 6 12a6 6 0 0 1-12 0c0-4 2-6 6-12z" fill="oklch(0.78 0.1 230)" />
        </g>
      );
    case "vial":
      return (
        <g>
          <g transform="rotate(-30 120 88)">
            <rect x="60" y="82" width="86" height="12" rx="3" fill="white" stroke="oklch(0.82 0.01 250)" />
            <rect x="146" y="85" width="28" height="6" rx="2" fill="oklch(0.8 0.01 250)" />
            <rect x="46" y="76" width="16" height="24" rx="3" fill="oklch(0.8 0.01 250)" />
            <rect x="74" y="82" width="42" height="12" fill={wash} />
          </g>
          <rect x="58" y="22" width="40" height="14" rx="3" fill="oklch(0.8 0.01 250)" />
          <rect x="62" y="14" width="32" height="10" rx="3" fill={deep} />
          <path d="M62 36h32l4 8v68a8 8 0 0 1-8 8H66a8 8 0 0 1-8-8V44z" fill="oklch(0.94 0.02 220)" stroke="oklch(0.82 0.01 250)" />
          <rect x="62" y="60" width="32" height="38" rx="3" fill={PAPER} />
          <rect x="62" y="60" width="32" height="8" rx="3" fill={deep} />
          <text x="78" y="86" fontSize="6" fontWeight="700" textAnchor="middle" fill={INK} fontFamily={FONT}>{label}</text>
        </g>
      );
    case "jar":
      return (
        <g>
          <rect x="52" y="22" width="96" height="20" rx="6" fill={deep} />
          <path d="M56 42h88v74a12 12 0 0 1-12 12H68a12 12 0 0 1-12-12z" fill="oklch(0.92 0.04 90)" />
          <path d="M64 52c-3 12-3 54 0 64" stroke="white" strokeOpacity=".5" strokeWidth="5" fill="none" strokeLinecap="round" />
          <rect x="64" y="60" width="72" height="48" rx="6" fill={PAPER} />
          <rect x="64" y="60" width="72" height="11" rx="5" fill={deep} />
          <text x="100" y="92" fontSize="8" fontWeight="700" textAnchor="middle" fill={INK} fontFamily={FONT}>{label}</text>
          <ellipse cx="154" cy="116" rx="12" ry="5" fill="oklch(0.85 0.06 70)" /><path d="M146 114c6-14 20-14 26 0z" fill="oklch(0.88 0.06 70)" />
        </g>
      );
    case "sachet":
      return (
        <g>
          <g transform="rotate(12 124 80)">
            <path d="M84 34h72v90H84z" fill="oklch(0.8 0.06 80)" />
          </g>
          <g transform="rotate(-8 82 80)">
            <path d="M46 30h72l-2 5 2 5-2 5 2 5H46l2-5-2-5 2-5z" fill={deep} />
            <rect x="46" y="55" width="72" height="62" fill={deep} />
            <path d="M46 117h72l-2 4 2 4H46l2-4z" fill={deep} />
            <rect x="53" y="62" width="58" height="46" rx="5" fill={PAPER} />
            <text x="82" y="82" fontSize="8" fontWeight="800" textAnchor="middle" fill={INK} fontFamily={FONT}>{label}</text>
            <rect x="64" y="90" width="36" height="3" rx="1.5" fill={wash} />
          </g>
        </g>
      );
    case "pregtest":
      return (
        <g transform="rotate(-22 100 78)">
          <rect x="30" y="64" width="118" height="26" rx="13" fill="white" stroke="oklch(0.82 0.01 250)" strokeWidth="1.5" />
          <rect x="148" y="66" width="30" height="22" rx="6" fill={deep} />
          <rect x="62" y="70" width="42" height="14" rx="3" fill={wash} stroke={deep} />
          <path d="M70 77h8M86 77h8M92 73v8" stroke={deep} strokeWidth="2" strokeLinecap="round" />
          <circle cx="44" cy="77" r="4" fill={deep} opacity=".6" />
        </g>
      );
    default:
      // box: a plain carton, the honest picture for anything we cannot classify
      return (
        <g>
          <path d="M44 48l56-18 56 18-56 18z" fill="oklch(0.95 0.02 100)" stroke="oklch(0.82 0.01 250)" />
          <path d="M44 48v58l56 18V66z" fill="white" stroke="oklch(0.82 0.01 250)" />
          <path d="M156 48v58l-56 18V66z" fill={wash} stroke="oklch(0.82 0.01 250)" />
          <rect x="52" y="68" width="40" height="30" rx="3" fill={PAPER} stroke={deep} transform="skewY(18) translate(0 -22)" />
          <path d="M66 82h12M72 76v12" stroke={deep} strokeWidth="4" strokeLinecap="round" transform="skewY(18) translate(0 -22)" />
          <text x="128" y="100" fontSize="8" fontWeight="800" textAnchor="middle" fill={deep} fontFamily={FONT} transform="skewY(-18) translate(0 38)">{label}</text>
        </g>
      );
  }
}

export function Packshot({ name, form, category, seed, className = "" }: { name: string; form: string; category?: string; seed: string; className?: string }) {
  const kind = kindFor({ name, form, category });
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
      data-kind={kind}
    >
      <div aria-hidden className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full opacity-40 blur-2xl" style={{ background: deep }} />
      <svg viewBox="0 0 200 150" className="mn-packshot-art relative h-full w-full" aria-hidden>
        <ellipse cx="100" cy="134" rx="60" ry="6" fill="oklch(0.3 0.05 160 / .18)" />
        <Art kind={kind} deep={deep} wash={wash} label={label} />
      </svg>
    </div>
  );
}
