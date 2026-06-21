import { getDb } from "./connection";
import type { NewStockBatchInput, StockBatch, UpdateStockBatchInput } from "./types";
import { toPositiveNumber } from "./units";

export async function loadStockBatches(): Promise<StockBatch[]> {
  const db = await getDb();
  return db.select<StockBatch[]>(`
    SELECT
      b.id,
      b.item_id,
      i.name AS item_name,
      b.brand,
      b.entry_mode,
      b.current_quantity,
      b.unit_id,
      u.name AS unit_name,
      b.package_count,
      b.package_size_quantity,
      b.package_size_unit_id,
      su.name AS package_size_unit_name,
      b.expiry_date,
      b.location_id,
      l.path_name AS location_name,
      b.status,
      b.note,
      (
        SELECT COUNT(*)
        FROM consumption_records r
        WHERE r.stock_batch_id = b.id
      ) AS consumption_count
    FROM stock_batches b
    JOIN items i ON i.id = b.item_id
    JOIN units u ON u.id = b.unit_id
    LEFT JOIN units su ON su.id = b.package_size_unit_id
    LEFT JOIN locations l ON l.id = b.location_id
    ORDER BY b.status, b.expiry_date IS NULL, b.expiry_date, b.id DESC
  `);
}

export async function createStockBatch(input: NewStockBatchInput) {
  const db = await getDb();
  const items = await db.select<Array<{ default_unit_id: number; unit_type: string }>>(
    `
    SELECT i.default_unit_id, u.unit_type
    FROM items i
    JOIN units u ON u.id = i.default_unit_id
    WHERE i.id = $1
    `,
    [input.itemId],
  );
  const item = items[0];

  if (!item) {
    throw new Error("未找到物资");
  }

  let totalQuantity: number | null = null;
  let packageCount: number | null = null;
  let packageSizeQuantity: number | null = null;
  let packageSizeUnitId: number | null = null;

  if (input.entryMode === "CONTENT") {
    packageCount = toPositiveNumber(input.packageCount);
    packageSizeQuantity = toPositiveNumber(input.packageSizeQuantity);
    if (!packageCount || !packageSizeQuantity) {
      throw new Error("请填写数量和每个内容量");
    }

    totalQuantity = packageCount * packageSizeQuantity;
    packageSizeUnitId = item.default_unit_id;
  } else {
    if (item.unit_type !== "count") {
      throw new Error("只有默认单位为计数单位的物资才能按总个数录入");
    }

    totalQuantity = toPositiveNumber(input.totalQuantity);
  }

  if (!totalQuantity) {
    throw new Error("请填写大于 0 的库存总量");
  }

  await db.execute(
    `
    INSERT INTO stock_batches (
      item_id, brand, entry_mode, initial_quantity, current_quantity, unit_id,
      package_count, package_size_quantity, package_size_unit_id,
      expiry_date, inbound_date, location_id, note
    )
    VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, NULLIF($9, ''), date('now'), $10, NULLIF($11, ''))
    `,
    [
      input.itemId,
      input.brand.trim() || null,
      input.entryMode,
      totalQuantity,
      item.default_unit_id,
      packageCount,
      packageSizeQuantity,
      packageSizeUnitId,
      input.expiryDate,
      input.locationId,
      input.note.trim(),
    ],
  );
}

export async function updateStockBatch(input: UpdateStockBatchInput) {
  const db = await getDb();
  await db.execute(
    `
    UPDATE stock_batches
    SET brand = NULLIF($1, ''),
        expiry_date = NULLIF($2, ''),
        location_id = $3,
        status = $4,
        note = NULLIF($5, ''),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    `,
    [
      input.brand.trim(),
      input.expiryDate,
      input.locationId,
      input.status,
      input.note.trim(),
      input.id,
    ],
  );
}

export async function deleteStockBatch(id: number) {
  const db = await getDb();
  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) AS count FROM consumption_records WHERE stock_batch_id = $1",
    [id],
  );
  const consumptionCount = rows[0]?.count ?? 0;

  if (consumptionCount > 0) {
    throw new Error("该批次已经有消耗记录，不能删除");
  }

  await db.execute("DELETE FROM stock_batches WHERE id = $1", [id]);
}
