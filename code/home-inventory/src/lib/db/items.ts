import { getDb } from "./connection";
import type { NewItemInput } from "./types";

export async function createItem(input: NewItemInput) {
  const db = await getDb();
  await db.execute(
    `
    INSERT INTO items (name, category_id, default_unit_id, enable_expiry)
    VALUES ($1, $2, $3, $4)
    `,
    [input.name.trim(), input.categoryId, input.defaultUnitId, input.enableExpiry ? 1 : 0],
  );
}
