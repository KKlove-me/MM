import Database from "@tauri-apps/plugin-sql";

export const DB_URL = "sqlite:home_inventory.db";

let dbPromise: Promise<Database> | null = null;

export function getDb() {
  dbPromise ??= Database.load(DB_URL);
  return dbPromise;
}
