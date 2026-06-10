import Database from "@tauri-apps/plugin-sql";

export const DB_URL = "sqlite:home_inventory.db";

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

export interface Unit {
  id: number;
  name: string;
  unit_type: string;
}

export interface Location {
  id: number;
  path_name: string;
}

export interface Item {
  id: number;
  name: string;
  category_id: number;
  default_unit_id: number;
  category_name: string;
  unit_name: string;
}

export interface StockBatch {
  id: number;
  item_name: string;
  brand: string | null;
  spec: string | null;
  current_quantity: number;
  unit_name: string;
  expiry_date: string | null;
  location_name: string | null;
  status: string;
}

export interface OpenConsumption {
  id: number;
  item_name: string;
  batch_label: string;
  planned_quantity: number | null;
  unit_name: string;
  started_at: string;
  location_snapshot: string | null;
}

export interface DashboardStats {
  item_count: number;
  batch_count: number;
  open_count: number;
  expiring_count: number;
}

export interface ReferenceData {
  categories: Category[];
  units: Unit[];
  locations: Location[];
  items: Item[];
}

export interface NewItemInput {
  name: string;
  categoryId: number;
  defaultUnitId: number;
  enableExpiry: boolean;
}

export interface NewStockBatchInput {
  itemId: number;
  brand: string;
  spec: string;
  quantity: number;
  unitId: number;
  expiryDate: string;
  locationId: number | null;
  note: string;
}

export interface NewConsumptionInput {
  stockBatchId: number;
  consumptionType: "ONCE" | "PARTIAL" | "CONTINUOUS";
  status: "IN_PROGRESS" | "COMPLETED";
  quantity: number | null;
  note: string;
}

let dbPromise: Promise<Database> | null = null;

function getDb() {
  dbPromise ??= Database.load(DB_URL);
  return dbPromise;
}

export async function loadReferenceData(): Promise<ReferenceData> {
  const db = await getDb();
  const [categories, units, locations, items] = await Promise.all([
    db.select<Category[]>(
      "SELECT id, name, parent_id FROM categories WHERE status = 'NORMAL' ORDER BY sort_order, name",
    ),
    db.select<Unit[]>(
      "SELECT id, name, unit_type FROM units WHERE status = 'NORMAL' ORDER BY id",
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

export async function loadDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  const rows = await db.select<DashboardStats[]>(`
    SELECT
      (SELECT COUNT(*) FROM items WHERE status = 'NORMAL') AS item_count,
      (SELECT COUNT(*) FROM stock_batches WHERE status = 'NORMAL' AND current_quantity > 0) AS batch_count,
      (SELECT COUNT(*) FROM consumption_records WHERE status = 'IN_PROGRESS') AS open_count,
      (
        SELECT COUNT(*)
        FROM stock_batches
        WHERE status = 'NORMAL'
          AND expiry_date IS NOT NULL
          AND date(expiry_date) <= date('now', '+7 day')
      ) AS expiring_count
  `);

  return rows[0] ?? { item_count: 0, batch_count: 0, open_count: 0, expiring_count: 0 };
}

export async function loadStockBatches(): Promise<StockBatch[]> {
  const db = await getDb();
  return db.select<StockBatch[]>(`
    SELECT
      b.id,
      i.name AS item_name,
      b.brand,
      b.spec,
      b.current_quantity,
      u.name AS unit_name,
      b.expiry_date,
      l.path_name AS location_name,
      b.status
    FROM stock_batches b
    JOIN items i ON i.id = b.item_id
    JOIN units u ON u.id = b.unit_id
    LEFT JOIN locations l ON l.id = b.location_id
    ORDER BY b.status, b.expiry_date IS NULL, b.expiry_date, b.id DESC
  `);
}

export async function loadOpenConsumptions(): Promise<OpenConsumption[]> {
  const db = await getDb();
  return db.select<OpenConsumption[]>(`
    SELECT
      r.id,
      i.name AS item_name,
      TRIM(COALESCE(b.brand, '') || ' ' || COALESCE(b.spec, '')) AS batch_label,
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

export async function createStockBatch(input: NewStockBatchInput) {
  const db = await getDb();
  await db.execute(
    `
    INSERT INTO stock_batches (
      item_id, brand, spec, initial_quantity, current_quantity, unit_id,
      expiry_date, inbound_date, location_id, note
    )
    VALUES ($1, $2, $3, $4, $4, $5, NULLIF($6, ''), date('now'), $7, NULLIF($8, ''))
    `,
    [
      input.itemId,
      input.brand.trim() || null,
      input.spec.trim() || null,
      input.quantity,
      input.unitId,
      input.expiryDate,
      input.locationId,
      input.note.trim(),
    ],
  );
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
    SELECT b.item_id, b.current_quantity, b.unit_id, l.path_name AS location_snapshot
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

  if (input.status === "COMPLETED" && (!input.quantity || input.quantity <= 0)) {
    throw new Error("完成消耗时必须填写大于 0 的实际消耗量");
  }

  if (input.status === "COMPLETED" && input.quantity && input.quantity > batch.current_quantity) {
    throw new Error("消耗量不能大于当前库存剩余量");
  }

  await db.execute("BEGIN");
  try {
    await db.execute(
      `
      INSERT INTO consumption_records (
        item_id, stock_batch_id, consumption_type, status, planned_quantity,
        actual_quantity, unit_id, completed_at, location_snapshot, note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $4 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE NULL END, $8, NULLIF($9, ''))
      `,
      [
        batch.item_id,
        input.stockBatchId,
        input.consumptionType,
        input.status,
        input.status === "IN_PROGRESS" ? input.quantity : null,
        input.status === "COMPLETED" ? input.quantity : null,
        batch.unit_id,
        batch.location_snapshot,
        input.note.trim(),
      ],
    );

    if (input.status === "COMPLETED" && input.quantity) {
      const nextQuantity = batch.current_quantity - input.quantity;
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
