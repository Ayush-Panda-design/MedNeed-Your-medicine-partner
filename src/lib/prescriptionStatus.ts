// Client-safe labels for prescription states.
export const RX_LABEL: Record<string, string> = {
  pending: "Waiting for review", needs_info: "We need more information", approved: "Approved", rejected: "Not accepted", withdrawn: "Removed", expired: "Expired",
};
export const RX_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800", needs_info: "bg-orange-50 text-orange-800", approved: "bg-emerald-50 text-emerald-800", rejected: "bg-rose-50 text-rose-800", withdrawn: "bg-slate-100 text-slate-600", expired: "bg-slate-100 text-slate-700",
};
export const rxState = (rx: { status: string; expired?: boolean }) => (rx.status === "approved" && rx.expired ? "expired" : rx.status);
export const fileUrl = (prescriptionId: string, fileId: string) => `/api/prescriptions/${prescriptionId}/files/${fileId}`;
export const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
export const MAX_FILE_MB = 5;
export const MAX_FILES = 5;
