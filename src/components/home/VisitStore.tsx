import Image from "next/image";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { BRANCHES, mapsUrl } from "@/lib/homeMedia";
import { SectionHead } from "../SectionHead";
import "./home.css";

/** Original storefront illustration, used until real photos of the branch are added. */
function StoreArt({ variant = 0 }: { variant?: number }) {
  const awn = variant ? ["#16a34a", "#ecfccb"] : ["#15803d", "#f0fdf4"];
  return (
    <svg viewBox="0 0 400 240" className="vs-art" aria-hidden>
      <defs>
        <linearGradient id={`vs-sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={variant ? "#fde7c7" : "#d9f2ff"} />
          <stop offset="1" stopColor={variant ? "#fff7ed" : "#f0fbff"} />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#vs-sky-${variant})`} />
      <circle cx={variant ? 70 : 335} cy="48" r="22" fill={variant ? "#fdba74" : "#fde68a"} opacity=".9" />
      <path d="M0 200h400v40H0z" fill="#d6d3cb" />
      <path d="M0 196h400v6H0z" fill="#bfb9ad" />
      {/* building */}
      <rect x="70" y="56" width="260" height="142" rx="6" fill="#fffdf7" stroke="#e7e2d6" strokeWidth="2" />
      <rect x="70" y="56" width="260" height="30" rx="6" fill="#0f5132" />
      <text x="200" y="77" textAnchor="middle" className="vs-sign" fill="#fff">MED NEED</text>
      <g transform="translate(92 63)"><rect width="16" height="16" rx="3" fill="#fff" /><path d="M6 3h4v4h4v4h-4v4H6v-4H2V7h4z" fill="#16a34a" /></g>
      <g transform="translate(292 63)"><rect width="16" height="16" rx="3" fill="#fff" /><path d="M6 3h4v4h4v4h-4v4H6v-4H2V7h4z" fill="#16a34a" /></g>
      {/* awning */}
      {Array.from({ length: 10 }, (_, k) => (
        <path key={k} d={`M${74 + k * 25.2} 88h25.2l-2 16a10.6 10.6 0 0 1-21.2 0z`} fill={awn[k % 2]} stroke="#0f5132" strokeWidth="1" />
      ))}
      {/* windows with shelves */}
      {[86, 246].map((x) => (
        <g key={x} transform={`translate(${x} 116)`}>
          <rect width="68" height="62" rx="4" fill="#e0f2fe" stroke="#c7d2db" strokeWidth="2" />
          {[18, 36, 54].map((y) => <rect key={y} x="4" y={y} width="60" height="3" fill="#cbd5e1" />)}
          {[8, 20, 32, 46].map((bx, j) => <rect key={bx} x={bx} y={j % 2 ? 6 : 8} width="8" height={j % 2 ? 12 : 10} rx="2" fill={["#86efac", "#fca5a5", "#fde68a", "#93c5fd"][j]} />)}
          {[10, 26, 42].map((bx, j) => <rect key={bx} x={bx} y="24" width="10" height="12" rx="2" fill={["#fdba74", "#a7f3d0", "#c4b5fd"][j]} />)}
          {[6, 22, 40, 52].map((bx, j) => <rect key={bx} x={bx} y="42" width="9" height="12" rx="2" fill={["#bbf7d0", "#fecaca", "#bae6fd", "#fef08a"][j]} />)}
        </g>
      ))}
      {/* door */}
      <rect x="170" y="116" width="60" height="82" rx="4" fill="#bbf7d0" stroke="#15803d" strokeWidth="2" />
      <line x1="200" y1="116" x2="200" y2="198" stroke="#15803d" strokeWidth="2" />
      <rect x="180" y="132" width="40" height="14" rx="3" fill="#fff" />
      <text x="200" y="142.5" textAnchor="middle" className="vs-open" fill="#15803d">OPEN</text>
      {/* plants */}
      {[58, 342].map((x) => (
        <g key={x} transform={`translate(${x} 170)`}>
          <path d="M-9 14h18l-3 14h-12z" fill="#b45309" />
          <circle cx="0" cy="6" r="11" fill="#22c55e" /><circle cx="-7" cy="0" r="7" fill="#16a34a" /><circle cx="7" cy="-1" r="7" fill="#4ade80" />
        </g>
      ))}
      {/* parked delivery scooter */}
      <g transform={`translate(${variant ? 300 : 40} 178)`}>
        <rect x="2" y="0" width="16" height="12" rx="2" fill="#86bb3a" /><path d="M8 3h4v3h3v4h-3v0h-4v-1H5V6h3z" fill="#fff" opacity=".9" />
        <path d="M2 16h22l5-10h5" fill="none" stroke="#0f5132" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="19" r="4.5" fill="#1f2a44" /><circle cx="28" cy="19" r="4.5" fill="#1f2a44" />
      </g>
    </svg>
  );
}

/** "Visit our store": the two branches, with photo (when added) or illustration, hours, call and directions. */
export function VisitStore({ phone, hoursLabel }: { phone: string; hoursLabel: string }) {
  const tel = phone.replace(/[^\d+]/g, "");
  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
      <SectionHead eyebrow="Visit us" title="Your neighbourhood pharmacy" sub="Two branches in Bhubaneswar — walk in, call, or order online" />
      <ul data-stagger className="vs-grid" role="list">
        {BRANCHES.map((b, k) => (
          <li key={b.name} className="vs-card">
            <div className="vs-media">
              {b.photo ? <Image src={b.photo} alt={`MED NEED ${b.name}`} fill sizes="(min-width: 768px) 600px, 100vw" className="vs-photo" /> : <StoreArt variant={k} />}
              <span className="vs-badge"><span className="vs-live" aria-hidden /> Open today · {hoursLabel}</span>
            </div>
            <div className="vs-body">
              <h3 className="vs-name">{b.name}</h3>
              <p className="vs-line"><MapPin className="h-4 w-4 shrink-0 text-teal-600" aria-hidden /> <span>{b.address} {b.pin}</span></p>
              <p className="vs-line"><Clock className="h-4 w-4 shrink-0 text-teal-600" aria-hidden /> <span>Open every day, {hoursLabel}</span></p>
              <div className="vs-actions">
                <a href={mapsUrl(b)} target="_blank" rel="noopener noreferrer" className="vs-btn vs-btn-main"><Navigation className="h-4 w-4" aria-hidden /> Directions</a>
                <a href={`tel:${tel}`} className="vs-btn"><Phone className="h-4 w-4" aria-hidden /> Call</a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
