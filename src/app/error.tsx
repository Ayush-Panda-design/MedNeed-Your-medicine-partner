"use client";

import { OutageNotice } from "@/components/OutageNotice";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <OutageNotice retry={retry} />;
}
