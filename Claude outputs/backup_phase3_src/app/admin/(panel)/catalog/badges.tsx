const status: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  catalog: "bg-sky-100 text-sky-700",
  discontinued: "bg-rose-100 text-rose-700",
};
const data: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-700",
  unverified: "bg-amber-100 text-amber-800",
  sample: "bg-violet-100 text-violet-700",
};
const label: Record<string, string> = { active: "Live", draft: "Draft", catalog: "Catalog only", discontinued: "Discontinued", verified: "Verified", unverified: "Unverified", sample: "Sample data" };

export const StatusBadge = ({ value }: { value: string }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${status[value] ?? "bg-slate-100"}`}>{label[value] ?? value}</span>
);
export const DataBadge = ({ value }: { value: string }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${data[value] ?? "bg-slate-100"}`}>{label[value] ?? value}</span>
);
export const ScheduleBadge = ({ value }: { value: string }) => (
  <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold ${value === "OTC" ? "bg-slate-100 text-slate-600" : value === "unknown" ? "bg-amber-100 text-amber-800" : value === "X" ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-700"}`}>{value === "OTC" ? "OTC" : value === "unknown" ? "Rx? unconfirmed" : `Sch ${value}`}</span>
);
