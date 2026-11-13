import type { Metadata } from "next";
import { requireStaff } from "@/server/auth/session";
import { embeddingStats } from "@/server/ai/vector-index";
import { EmbeddingPanel } from "./EmbeddingPanel";

export const metadata: Metadata = { title: "AI search" };
export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  await requireStaff("/admin/ai", ["admin"]);
  const stats = await embeddingStats();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">AI search</h1>
        <p className="text-sm text-slate-500">Semantic search embeds your catalogue so customers can find medicines by meaning.</p>
      </div>
      <EmbeddingPanel initial={stats} />
    </div>
  );
}
