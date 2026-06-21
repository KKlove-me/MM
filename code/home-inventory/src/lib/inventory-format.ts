import type { OpenConsumption, StockBatch, Unit } from "./db";

export function formatQuantity(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }

  return Number(value.toFixed(3)).toString();
}

export function convertUnitQuantity(
  quantity: number,
  fromUnitId: number,
  toUnitId: number,
  units: Unit[],
) {
  const fromUnit = units.find((unit) => unit.id === fromUnitId);
  const toUnit = units.find((unit) => unit.id === toUnitId);

  if (!fromUnit || !toUnit) {
    return null;
  }

  if (fromUnit.id === toUnit.id) {
    return quantity;
  }

  return null;
}

export function batchTitle(batch: StockBatch) {
  return batch.brand ? `${batch.item_name} - ${batch.brand}` : batch.item_name;
}

export function packageSizeInBatchUnit(batch: StockBatch, units: Unit[]) {
  if (!batch.package_size_quantity || !batch.package_size_unit_id) {
    return null;
  }

  return convertUnitQuantity(batch.package_size_quantity, batch.package_size_unit_id, batch.unit_id, units);
}

export function packageSizeText(batch: StockBatch) {
  if (batch.entry_mode !== "CONTENT" || !batch.package_size_quantity || !batch.package_size_unit_name) {
    return "";
  }

  const countText = batch.package_count ? ` × ${formatQuantity(batch.package_count)} 个` : "";
  return `${formatQuantity(batch.package_size_quantity)} ${batch.package_size_unit_name}/个${countText}`;
}

export function remainingPackageText(batch: StockBatch, units: Unit[]) {
  const perPackage = packageSizeInBatchUnit(batch, units);
  if (batch.entry_mode !== "CONTENT" || !perPackage) {
    return "";
  }

  return `${formatQuantity(batch.current_quantity / perPackage)} 个`;
}

export function batchRemainingText(batch: StockBatch, units: Unit[]) {
  const contentText = `${formatQuantity(batch.current_quantity)} ${batch.unit_name}`;
  const packageText = remainingPackageText(batch, units);
  return packageText ? `${contentText}，约 ${packageText}` : contentText;
}

export function openConsumptionText(record: OpenConsumption) {
  return record.planned_quantity === null
    ? `未估算 ${record.unit_name}`
    : `${formatQuantity(record.planned_quantity)} ${record.unit_name}`;
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    NORMAL: "正常",
    DEPLETED: "耗尽",
    EXPIRED: "过期",
    DISCARDED: "废弃",
  };
  return labels[status] ?? status;
}
