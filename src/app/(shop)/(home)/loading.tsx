// Shown at once while the homepage is prepared. It matches the real hero (warm backdrop, text on the left, product scene on
// the right) so the page never flashes a different layout first. Pure CSS, no scripts.
export default function HomeLoading() {
  return (
    <div id="mn-cine" data-tone="light" className="hl" aria-busy="true" aria-label="Loading">
      <div className="hl-copy">
        <span className="hl-bar hl-h1" />
        <span className="hl-bar hl-h2" />
        <span className="hl-bar hl-p1" />
        <span className="hl-bar hl-p2" />
        <div className="hl-actions"><span className="hl-bar hl-btn" /><span className="hl-bar hl-btn hl-ghost" /></div>
      </div>
      <div className="hl-art"><span /></div>
      <style>{`
        .hl { position: relative; min-height: 100svh; overflow: hidden; display: flex; align-items: center; gap: 2rem; padding: 7.5rem max(1.5rem, calc((100vw - 80rem) / 2 + 1.5rem)) 3rem;
          background: linear-gradient(135deg, #f4f5ee 0%, #edf1e8 55%, #f3f2e8 100%); }
        .hl::before { content: ""; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(46% 40% at 0% 0%, rgb(126 178 146 / .5), transparent 70%), radial-gradient(40% 42% at 0% 100%, rgb(126 178 146 / .42), transparent 70%); }
        .hl-copy { position: relative; flex: 1 1 50%; max-width: 40rem; }
        .hl-bar { display: block; border-radius: .6rem; background: linear-gradient(90deg, rgb(20 97 58 / .10) 25%, rgb(20 97 58 / .18) 45%, rgb(20 97 58 / .10) 65%); background-size: 200% 100%; animation: hl-sh 1.4s linear infinite; }
        .hl-h1 { height: 3.2rem; width: 92%; } .hl-h2 { height: 3.2rem; width: 70%; margin-top: .6rem; }
        .hl-p1 { height: 1rem; width: 78%; margin-top: 1.4rem; } .hl-p2 { height: 1rem; width: 56%; margin-top: .6rem; }
        .hl-actions { display: flex; gap: .8rem; margin-top: 1.6rem; } .hl-btn { height: 3rem; width: 11rem; border-radius: .95rem; } .hl-ghost { width: 12.5rem; }
        .hl-art { position: relative; flex: 1 1 50%; display: grid; place-items: center; }
        .hl-art span { display: block; width: min(100%, 34rem); aspect-ratio: 1200 / 774; border-radius: 2rem; background: radial-gradient(closest-side, rgb(126 178 146 / .22), transparent); }
        @keyframes hl-sh { to { background-position: -200% 0; } }
        @media (max-width: 900px) { .hl { flex-direction: column; align-items: stretch; padding-top: 7rem; } .hl-h1 { height: 2.2rem; } .hl-h2 { height: 2.2rem; } .hl-art { flex: none; } }
        @media (prefers-reduced-motion: reduce) { .hl-bar { animation: none; } }
      `}</style>
    </div>
  );
}
