ALTER TABLE stock_batches ADD COLUMN entry_mode TEXT NOT NULL DEFAULT 'COUNT';
ALTER TABLE stock_batches ADD COLUMN package_count REAL;
ALTER TABLE stock_batches ADD COLUMN package_size_quantity REAL;
ALTER TABLE stock_batches ADD COLUMN package_size_unit_id INTEGER REFERENCES units(id);
