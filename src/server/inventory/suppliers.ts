import { ApiError } from "../http";
import { audit, isUniqueViolation } from "../auth/users";
import { query, type Row } from "../db";
import type { SupplierInput } from "./schema";
import type { Actor } from "./stock";

const map = (r: Row) => ({
  id: r.id as string, name: r.name as string, phone: r.phone as string, gstin: r.gstin as string, drugLicense: r.drug_license as string,
  address: r.address as string, notes: r.notes as string, isActive: r.is_active as boolean, purchaseCount: Number(r.purchase_count ?? 0),
});
export type Supplier = ReturnType<typeof map>;

export async function listSuppliers(opts: { activeOnly?: boolean } = {}): Promise<Supplier[]> {
  const rows = await query(
    `select s.*, (select count(*) from purchases p where p.supplier_id = s.id) as purchase_count from suppliers s ${opts.activeOnly ? "where s.is_active" : ""} order by s.is_active desc, lower(s.name)`,
  );
  return rows.map(map);
}

export async function createSupplier(actor: Actor, v: SupplierInput) {
  try {
    const [r] = await query<{ id: string }>(
      `insert into suppliers (name, phone, gstin, drug_license, address, notes, is_active) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [v.name, v.phone, v.gstin.toUpperCase(), v.drugLicense, v.address, v.notes, v.isActive],
    );
    await audit(actor.id, "inventory.supplier.created", { id: r.id, name: v.name }, actor.ip);
    return r.id;
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "A supplier with this name already exists.", "duplicate");
    throw err;
  }
}

export async function updateSupplier(actor: Actor, id: string, v: SupplierInput) {
  try {
    const rows = await query<{ id: string }>(
      `update suppliers set name=$2, phone=$3, gstin=$4, drug_license=$5, address=$6, notes=$7, is_active=$8, updated_at=now() where id=$1 returning id`,
      [id, v.name, v.phone, v.gstin.toUpperCase(), v.drugLicense, v.address, v.notes, v.isActive],
    );
    if (!rows[0]) throw new ApiError(404, "Supplier not found.");
    await audit(actor.id, "inventory.supplier.updated", { id, name: v.name, isActive: v.isActive }, actor.ip);
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "A supplier with this name already exists.", "duplicate");
    throw err;
  }
}
