import { getDb } from "./connection";
import type { NewStockBatchInput, StockBatch } from "./types";
import { convertQuantity, loadUnitsById, requireUnit, toPositiveNumber } from "./units";

export async function loadStockBatches(): Promise<StockBatch[]> {
  const db = await getDb();
  return db.select<StockBatch[]>(`
    SELECT
      b.id,
      i.name AS item_name,
      b.brand,
      b.spec,
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
      l.path_name AS location_name,
      b.status
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
  let spec = input.spec.trim();

  if (hasPackage) {
    const packageUnit = requireUnit(units, input.packageUnitId!, "包装单位");
    const packageSizeUnit = requireUnit(units, input.packageSizeUnitId!, "单包装内容单位");
    const perPackageQuantity = convertQuantity(packageSizeQuantity, packageSizeUnit, stockUnit);
    totalQuantity = packageCount * perPackageQuantity;
    packageUnitId = packageUnit.id;
    packageSizeUnitId = packageSizeUnit.id;
    spec ||= `${packageSizeQuantity}${packageSizeUnit.name}/${packageUnit.name}`;
  }

  if (!totalQuantity) {
    throw new Error("请填写大于 0 的库存总量");
  }

  await db.execute(
    `
    INSERT INTO stock_batches (
      item_id, brand, spec, initial_quantity, current_quantity, unit_id,
      package_count, package_unit_id, package_size_quantity, package_size_unit_id,
      expiry_date, inbound_date, location_id, note
    )
    VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), date('now'), $11, NULLIF($12, ''))
    `,
    [
      input.itemId,
      input.brand.trim() || null,
      spec || null,
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
