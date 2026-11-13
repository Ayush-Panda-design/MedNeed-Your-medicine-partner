import { db } from "../db";
import { audit } from "../auth/users";
import { classify, type CategorySlug } from "./classify";
import type { Db } from "../db";

export type CategoriseResult = { examined: number; assigned: Record<string, number>; left: number; flaggedNoOnlineSale: number };

/**
 * Places draft medicines that sit in "Uncategorised" into a section based on their ingredients (see classify.ts).
 * Never touches live products or items someone already categorised. Items with possible narcotic, psychotropic or
 * tranquilizer ingredients are also marked "never sold online" until a pharmacist clears them.
 */
export async function autoCategorise(database?: Db, actor?: { id: string; ip?: string }): Promise<CategoriseResult> {
  const d = database ?? (await db());
  const rows = await d.query<{ id: string; name: string; form: string; salts: string[] }>(
    `select m.id, m.name, m.form,
            coalesce(array_agg(s.name order by ms.position) filter (where s.name is not null), '{}') as salts
     from medicines m
     join categories c on c.id = m.category_id and c.slug = 'uncategorised'
     left join medicine_salts ms on ms.medicine_id = m.id
     left join salts s on s.id = ms.salt_id
     where m.status in ('draft','catalog')
     group by m.id`,
  );

  const byCat = new Map<CategorySlug, string[]>();
  const restricted: string[] = [];
  for (const r of rows) {
    const out = classify({ name: r.name, form: r.form, salts: r.salts });
    if (out.restricted) restricted.push(r.id);
    if (out.category) (byCat.get(out.category) ?? byCat.set(out.category, []).get(out.category)!).push(r.id);
  }

  const CHUNK = 5000;
  const assigned: Record<string, number> = {};
  let newlyFlagged = 0;
  await d.tx(async (t) => {
    for (const [slug, ids] of byCat) {
      const [cat] = await t.query<{ id: string }>(`select id from categories where slug = $1`, [slug]);
      if (!cat) continue; // category was deleted by an admin; leave those items alone
      for (let i = 0; i < ids.length; i += CHUNK) {
        await t.query(`update medicines set category_id = $1, updated_at = now() where id = any($2::uuid[]) and status in ('draft','catalog')`, [cat.id, ids.slice(i, i + CHUNK)]);
      }
      assigned[slug] = ids.length;
    }
    for (let i = 0; i < restricted.length; i += CHUNK) {
      const flagged = await t.query(`update medicines set no_online_sale = true, updated_at = now() where id = any($1::uuid[]) and status in ('draft','catalog') and not no_online_sale returning id`, [restricted.slice(i, i + CHUNK)]);
      newlyFlagged += flagged.length;
    }
  });

  const assignedTotal = Object.values(assigned).reduce((a, b) => a + b, 0);
  const result: CategoriseResult = { examined: rows.length, assigned, left: rows.length - assignedTotal, flaggedNoOnlineSale: newlyFlagged };
  if (actor) await audit(actor.id, "catalog.auto_categorise", { ...result }, actor.ip);
  return result;
}
