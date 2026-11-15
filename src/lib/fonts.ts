import localFont from "next/font/local";

export const lexend = localFont({
  src: [
    { path: "../app/fonts/Lexend-Regular.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/Lexend-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-lexend",
  display: "swap",
});

/** Display serif for the homepage hero headline (Instrument Serif, SIL Open Font License 1.1). */
export const displaySerif = localFont({
  src: [
    { path: "../app/fonts/InstrumentSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/InstrumentSerif-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-display-serif",
  display: "swap",
});
