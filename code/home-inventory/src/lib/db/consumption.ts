import { getDb } from "./connection";
import type { NewConsumptionInput, OpenConsumption } from "./types";
import { toPositiveNumber } from "./units";

export async function loadOpenConsumptions(): Promise<OpenConsumption[]> {
  const db = await getDb();
  return db.select<OpenConsumption[]>(`
    SELECT
      r.id,
      i.name AS item_name,
      COALESCE(b.brand, '') AS batch_label,
      r.planned_quantity,
      u.name AS unit_name,
      r.started_at,
      r.location_snapshot
    FROM consumption_records r
    JOIN items i ON i.id = r.item_id
    JOIN stock_batches b ON b.id = r.stock_batch_id
    JOIN units u ON u.id = r.unit_id
    WHERE r.status = 'IN_PROGRESS'
    ORDER BY r.started_at DESC
  `);
}

export async function createConsumption(input: NewConsumptionInput) {
  const db = await getDb();
  const batches = await db.select<
    Array<{
      item_id: number;
      current_quantity: number;
      unit_id: number;
      location_snapshot: string | null;
    }>
  >(
    `
    SELECT
      b.item_id,
      b.current_quantity,
      b.unit_id,
      l.path_name AS location_snapshot
    FROM stock_batches b
    LEFT JOIN locations l ON l.id = b.location_id
    WHERE b.id = $1
    `,
    [input.stockBatchId],
  );
  const batch = batches[0];

  if (!batch) {
    throw new Error("未找到库存批次");
  }

  const inputQuantity = toPositiveNumber(input.quantity);
  if (!inputQuantity) {
    throw new Error("请填写大于 0 的实际消耗量");
  }

  const quantity = inputQuantity;

  if (input.status === "COMPLETED" && quantity <= 0) {
    throw new Error("完成消耗时必须填写大于 0 的实际消耗量");
  }

  if (input.status === "COMPLETED" && quantity > batch.current_quantity) {
    throw new Error("消耗量不能大于当前库存剩余量");
  }

  await db.execute(
    `
      INSERT INTO consumption_records (
        item_id, stock_batch_id, consumption_type, status, planned_quantity,
        actual_quantity, unit_id,
        completed_at, location_snapshot, note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $4 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE NULL END, $8, NULLIF($9, ''))
      `,
    [
      batch.item_id,
      input.stockBatchId,
      input.consumptionType,
      input.status,
      input.status === "IN_PROGRESS" ? quantity : null,
      input.status === "COMPLETED" ? quantity : null,
      batch.unit_id,
      batch.location_snapshot,
      input.note.trim(),
    ],
  );

  if (input.status === "COMPLETED") {
    const nextQuantity = Math.max(0, batch.current_quantity - quantity);
    await db.execute(
      `
      UPDATE stock_batches
      SET current_quantity = $1,
          status = CASE WHEN $1 = 0 THEN 'DEPLETED' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [nextQuantity, input.stockBatchId],
    );
  }
}
