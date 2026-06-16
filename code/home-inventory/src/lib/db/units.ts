import type Database from "@tauri-apps/plugin-sql";
import type { Unit } from "./types";

export function toPositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function convertQuantity(quantity: number, fromUnit: Unit, toUnit: Unit) {
  if (fromUnit.id === toUnit.id) {
    return quantity;
  }

  throw new Error(`单位 ${fromUnit.name} 不能自动换算为 ${toUnit.name}`);
}

export async function loadUnitsById(db: Database, ids: Array<number | null | undefined>) {
  const unitIds = Array.from(new Set(ids.filter((id): id is number => typeof id === "number")));
  if (unitIds.length === 0) {
    return new Map<number, Unit>();
  }

  const placeholders = unitIds.map((_, index) => `$${index + 1}`).join(", ");
  const units = await db.select<Unit[]>(
    `
    SELECT id, name, unit_type
    FROM units
    WHERE id IN (${placeholders})
    `,
    unitIds,
  );

  return new Map(units.map((unit) => [unit.id, unit]));
}

export function requireUnit(units: Map<number, Unit>, unitId: number, label: string) {
  const unit = units.get(unitId);
  if (!unit) {
    throw new Error(`未找到${label}`);
  }
  return unit;
}
