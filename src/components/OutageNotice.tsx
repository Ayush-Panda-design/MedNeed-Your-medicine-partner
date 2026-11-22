"use client";

/*
 * Friendly "we're briefly unavailable" screen shown when a page fails to render (for example when the database is
 * unreachable or over quota). Plain inline styles and no data access, so it still works when everything else is down.
 */
export function OutageNotice({ retry }: { retry: () => void }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f4faf6",
        color: "#14301f",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 440 }}>
        <div
          aria-hidden
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 20px",
            borderRadius: 18,
            background: "#16a34a",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          +
        </div>
        <h1 style={{ fontSize: 24, margin: "0 0 10px" }}>MedNeed will be right back</h1>
        <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 24px", color: "#3d5a48" }}>
          We are having a temporary problem and could not load this page. Your orders and details are safe. Please try
          again in a few minutes.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            background: "#16a34a",
            color: "#fff",
            border: 0,
            borderRadius: 10,
            padding: "12px 28px",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <p style={{ fontSize: 13, margin: "20px 0 0", color: "#5f7a6b" }}>
          For urgent medicine needs, please call your nearest pharmacy.
        </p>
      </div>
    </main>
  );
}
