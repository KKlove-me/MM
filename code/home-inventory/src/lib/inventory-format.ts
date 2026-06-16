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
  if (!batch.package_size_quantity || !batch.package_size_unit_name || !batch.package_unit_name) {
    return "";
  }

  return `${formatQuantity(batch.package_size_quantity)} ${batch.package_size_unit_name}/${batch.package_unit_name}`;
}

export function remainingPackageText(batch: StockBatch, units: Unit[]) {
  const perPackage = packageSizeInBatchUnit(batch, units);
  if (!perPackage || !batch.package_unit_name) {
    return "";
  }

  return `${formatQuantity(batch.current_quantity / perPackage)} ${batch.package_unit_name}`;
}

export function batchRemainingText(batch: StockBatch, units: Unit[]) {
  const contentText = `${formatQuantity(batch.current_quantity)} ${batch.unit_name}`;
  const packageText = remainingPackageText(batch, units);
  return packageText ? `${contentText}，约 ${packageText}` : contentText;
}

export function openConsumptionText(record: OpenConsumption) {
  const contentText =
    record.planned_quantity === null
      ? `未估算 ${record.unit_name}`
      : `${formatQuantity(record.planned_quantity)} ${record.unit_name}`;

  if (!record.package_quantity || !record.package_unit_name) {
    return contentText;
  }

  return `${contentText}，约 ${formatQuantity(record.package_quantity)} ${record.package_unit_name}`;
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
