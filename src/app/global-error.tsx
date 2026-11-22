"use client";

import { OutageNotice } from "@/components/OutageNotice";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <OutageNotice retry={retry} />
      </body>
    </html>
  );
}
