import { getDb } from "./connection";
import type { DashboardStats } from "./types";

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
