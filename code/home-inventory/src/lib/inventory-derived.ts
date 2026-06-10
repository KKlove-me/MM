import type { StockBatch } from "./db";

export function activeStockBatches(stockBatches: StockBatch[]) {
  return stockBatches.filter((batch) => batch.status === "NORMAL" && batch.current_quantity > 0);
}

export function expiringStockBatches(stockBatches: StockBatch[]) {
  return activeStockBatches(stockBatches).filter((batch) => {
    if (!batch.expiry_date) {
      return false;
    }

    const today = new Date();
    const expiry = new Date(`${batch.expiry_date}T00:00:00`);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
    return diffDays <= 7;
  });
}
