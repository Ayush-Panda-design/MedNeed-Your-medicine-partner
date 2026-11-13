/* An original, generic friendly-pharmacist illustration for the FAQ section (hand-built SVG, not any
   real or known character). Decorative, so aria-hidden. */
export function FaqHelp() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-0 -z-10 translate-y-4 rounded-[2rem] bg-teal-50" />
      <svg viewBox="0 0 240 240" className="mx-auto h-auto w-full max-w-[260px]" role="img" aria-label="A pharmacist ready to help">
        <circle cx="120" cy="120" r="108" fill="#eafbe9" />
        {/* question bubbles */}
        <g>
          <rect x="22" y="40" width="46" height="34" rx="10" fill="#fff" stroke="#bfe3cb" />
          <path d="M34 74l-2 12 12-8z" fill="#fff" stroke="#bfe3cb" />
          <text x="45" y="63" textAnchor="middle" fontFamily="system-ui" fontSize="20" fontWeight="700" fill="#1b7f33">?</text>
          <circle cx="196" cy="70" r="15" fill="#fff" stroke="#bfe3cb" />
          <text x="196" y="76" textAnchor="middle" fontFamily="system-ui" fontSize="16" fontWeight="700" fill="#86bb3a">?</text>
        </g>
        {/* pharmacist */}
        <g>
          {/* body / coat */}
          <path d="M72 230c0-34 22-58 48-58s48 24 48 58z" fill="#ffffff" stroke="#e2e8f0" />
          <path d="M120 172c-16 0-30 5-40 14l40 20 40-20c-10-9-24-14-40-14z" fill="#1b7f33" />
          <path d="M120 172l-10 10 10 14 10-14z" fill="#eafbe9" />
          {/* cross badge */}
          <path d="M150 198h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="#bff069" />
          {/* neck + head */}
          <rect x="112" y="150" width="16" height="22" rx="7" fill="#f1c9a5" />
          <circle cx="120" cy="134" r="30" fill="#f6d4b3" />
          <path d="M92 128c0-20 13-32 28-32s28 12 28 32c-6-8-16-12-28-12s-22 4-28 12z" fill="#28352c" />
          <circle cx="110" cy="134" r="3" fill="#28352c" />
          <circle cx="130" cy="134" r="3" fill="#28352c" />
          <path d="M113 146c4 3 10 3 14 0" stroke="#b9826a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* stethoscope */}
          <path d="M104 176c-10 6-12 20-2 28s24 2 24-10v-6" stroke="#0f6b33" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="126" cy="188" r="4" fill="#0f6b33" />
        </g>
      </svg>
    </div>
  );
}
