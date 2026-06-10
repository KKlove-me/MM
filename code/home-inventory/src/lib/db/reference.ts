import { getDb } from "./connection";
import type { Category, Item, Location, ReferenceData, Unit } from "./types";

export async function loadReferenceData(): Promise<ReferenceData> {
  const db = await getDb();
  const [categories, units, locations, items] = await Promise.all([
    db.select<Category[]>(
      "SELECT id, name, parent_id FROM categories WHERE status = 'NORMAL' ORDER BY sort_order, name",
    ),
    db.select<Unit[]>(
      "SELECT id, name, unit_type, base_unit_id, conversion_rate_to_base FROM units WHERE status = 'NORMAL' ORDER BY id",
    ),
    db.select<Location[]>(
      "SELECT id, path_name FROM locations WHERE status = 'NORMAL' ORDER BY sort_order, path_name",
    ),
    db.select<Item[]>(`
      SELECT i.id, i.name, i.category_id, i.default_unit_id, c.name AS category_name, u.name AS unit_name
      FROM items i
      JOIN categories c ON c.id = i.category_id
      JOIN units u ON u.id = i.default_unit_id
      WHERE i.status = 'NORMAL'
      ORDER BY i.name
    `),
  ]);

  return { categories, units, locations, items };
}
