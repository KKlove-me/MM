import { getDb } from "./connection";
import type { NewConsumptionInput, OpenConsumption } from "./types";
import { convertQuantity, loadUnitsById, requireUnit, toPositiveNumber } from "./units";

export async function loadOpenConsumptions(): Promise<OpenConsumption[]> {
  const db = await getDb();
  return db.select<OpenConsumption[]>(`
    SELECT
      r.id,
      i.name AS item_name,
      TRIM(COALESCE(b.brand, '') || ' ' || COALESCE(b.spec, '')) AS batch_label,
      r.planned_quantity,
      u.name AS unit_name,
      r.package_quantity,
      pu.name AS package_unit_name,
      r.started_at,
      r.location_snapshot
    FROM consumption_records r
    JOIN items i ON i.id = r.item_id
    JOIN stock_batches b ON b.id = r.stock_batch_id
    JOIN units u ON u.id = r.unit_id
    LEFT JOIN units pu ON pu.id = r.package_unit_id
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
      package_unit_id: number | null;
      package_size_quantity: number | null;
      package_size_unit_id: number | null;
      location_snapshot: string | null;
    }>
  >(
    `
    SELECT
      b.item_id,
      b.current_quantity,
      b.unit_id,
      b.package_unit_id,
      b.package_size_quantity,
      b.package_size_unit_id,
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

  const units = await loadUnitsById(db, [batch.unit_id, batch.package_size_unit_id, input.unitId]);
  const batchUnit = requireUnit(units, batch.unit_id, "库存单位");
  let quantity = 0;
  let packageQuantity: number | null = null;
  let packageUnitId: number | null = null;

  if (input.mode === "PACKAGE") {
    packageQuantity = toPositiveNumber(input.packageQuantity ?? input.quantity);
    if (!packageQuantity) {
      throw new Error("请填写大于 0 的包装消耗数量");
    }

    if (!batch.package_unit_id || !batch.package_size_quantity || !batch.package_size_unit_id) {
      throw new Error("该批次没有包装规格，不能按包装消耗");
    }

    const packageSizeUnit = requireUnit(units, batch.package_size_unit_id, "单包装内容单位");
    quantity = packageQuantity * convertQuantity(batch.package_size_quantity, packageSizeUnit, batchUnit);
    packageUnitId = batch.package_unit_id;
  } else {
    const contentQuantity = toPositiveNumber(input.quantity);
    if (!contentQuantity) {
      throw new Error("请填写大于 0 的实际消耗量");
    }

    const sourceUnit = requireUnit(units, input.unitId ?? batch.unit_id, "消耗单位");
    quantity = convertQuantity(contentQuantity, sourceUnit, batchUnit);
  }

  if (input.status === "COMPLETED" && quantity <= 0) {
    throw new Error("完成消耗时必须填写大于 0 的实际消耗量");
  }

  if (input.status === "COMPLETED" && quantity > batch.current_quantity) {
    throw new Error("消耗量不能大于当前库存剩余量");
  }

  await db.execute("BEGIN");
  try {
    await db.execute(
      `
      INSERT INTO consumption_records (
        item_id, stock_batch_id, consumption_type, status, planned_quantity,
        actual_quantity, unit_id, package_quantity, package_unit_id,
        completed_at, location_snapshot, note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $4 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE NULL END, $10, NULLIF($11, ''))
      `,
      [
        batch.item_id,
        input.stockBatchId,
        input.consumptionType,
        input.status,
        input.status === "IN_PROGRESS" ? quantity : null,
        input.status === "COMPLETED" ? quantity : null,
        batch.unit_id,
        packageQuantity,
        packageUnitId,
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

    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}
