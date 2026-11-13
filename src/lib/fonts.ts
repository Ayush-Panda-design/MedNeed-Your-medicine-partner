import localFont from "next/font/local";

export const lexend = localFont({
  src: [
    { path: "../app/fonts/Lexend-Regular.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/Lexend-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-lexend",
  display: "swap",
});
