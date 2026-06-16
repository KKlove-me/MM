import { getDb } from "./connection";
import type { NewStockBatchInput, StockBatch, UpdateStockBatchInput } from "./types";
import { convertQuantity, loadUnitsById, requireUnit, toPositiveNumber } from "./units";

export async function loadStockBatches(): Promise<StockBatch[]> {
  const db = await getDb();
  return db.select<StockBatch[]>(`
    SELECT
      b.id,
      b.item_id,
      i.name AS item_name,
      b.brand,
      b.current_quantity,
      b.unit_id,
      u.name AS unit_name,
      b.package_count,
      b.package_unit_id,
      pu.name AS package_unit_name,
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
    LEFT JOIN units pu ON pu.id = b.package_unit_id
    LEFT JOIN units su ON su.id = b.package_size_unit_id
    LEFT JOIN locations l ON l.id = b.location_id
    ORDER BY b.status, b.expiry_date IS NULL, b.expiry_date, b.id DESC
  `);
}

export async function createStockBatch(input: NewStockBatchInput) {
  const db = await getDb();
  const packageCount = toPositiveNumber(input.packageCount);
  const packageSizeQuantity = toPositiveNumber(input.packageSizeQuantity);
  const hasPackage =
    packageCount !== null &&
    packageSizeQuantity !== null &&
    input.packageUnitId !== null &&
    input.packageSizeUnitId !== null;

  const units = await loadUnitsById(db, [input.unitId, input.packageUnitId, input.packageSizeUnitId]);
  const stockUnit = requireUnit(units, input.unitId, "库存单位");
  let totalQuantity = toPositiveNumber(input.totalQuantity);
  let packageUnitId: number | null = null;
  let packageSizeUnitId: number | null = null;

  if (hasPackage) {
    const packageUnit = requireUnit(units, input.packageUnitId!, "包装单位");
    const packageSizeUnit = requireUnit(units, input.packageSizeUnitId!, "单包装内容单位");
    const perPackageQuantity = convertQuantity(packageSizeQuantity, packageSizeUnit, stockUnit);
    totalQuantity = packageCount * perPackageQuantity;
    packageUnitId = packageUnit.id;
    packageSizeUnitId = packageSizeUnit.id;
  }

  if (!totalQuantity) {
    throw new Error("请填写大于 0 的库存总量");
  }

  await db.execute(
    `
    INSERT INTO stock_batches (
      item_id, brand, initial_quantity, current_quantity, unit_id,
      package_count, package_unit_id, package_size_quantity, package_size_unit_id,
      expiry_date, inbound_date, location_id, note
    )
    VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), date('now'), $10, NULLIF($11, ''))
    `,
    [
      input.itemId,
      input.brand.trim() || null,
      totalQuantity,
      input.unitId,
      hasPackage ? packageCount : null,
      packageUnitId,
      hasPackage ? packageSizeQuantity : null,
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
