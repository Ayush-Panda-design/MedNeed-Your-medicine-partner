// Remounts on every navigation, so each page fades in gently (pure CSS, see .mn-page).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="mn-page">{children}</div>;
}
