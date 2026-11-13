import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { getSettings, saveSettings, settingsSchema } from "@/server/orders/settings";

export const GET = handle(async () => {
  await requireApiStaff(["admin"]);
  return ok({ settings: await getSettings() });
});

export const PUT = handle(async (req) => {
  const { user } = await requireApiStaff(["admin"]);
  await saveSettings({ id: user.id, ip: clientIp(req) }, await readJson(req, settingsSchema));
  return ok({ settings: await getSettings() });
});
