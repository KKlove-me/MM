ALTER TABLE stock_batches ADD COLUMN package_count REAL;
ALTER TABLE stock_batches ADD COLUMN package_unit_id INTEGER REFERENCES units(id);
ALTER TABLE stock_batches ADD COLUMN package_size_quantity REAL;
ALTER TABLE stock_batches ADD COLUMN package_size_unit_id INTEGER REFERENCES units(id);

ALTER TABLE consumption_records ADD COLUMN package_quantity REAL;
ALTER TABLE consumption_records ADD COLUMN package_unit_id INTEGER REFERENCES units(id);
