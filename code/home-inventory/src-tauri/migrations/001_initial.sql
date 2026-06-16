CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES categories(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'NORMAL',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  unit_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NORMAL'
);

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES locations(id),
  path_name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'NORMAL',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  default_unit_id INTEGER NOT NULL REFERENCES units(id),
  enable_expiry INTEGER NOT NULL DEFAULT 0,
  expiry_remind_days INTEGER,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'NORMAL',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, category_id)
);

CREATE TABLE IF NOT EXISTS stock_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id),
  brand TEXT,
  initial_quantity REAL NOT NULL CHECK(initial_quantity > 0),
  current_quantity REAL NOT NULL CHECK(current_quantity >= 0),
  unit_id INTEGER NOT NULL REFERENCES units(id),
  production_date TEXT,
  expiry_date TEXT,
  inbound_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  location_id INTEGER REFERENCES locations(id),
  status TEXT NOT NULL DEFAULT 'NORMAL',
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consumption_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id),
  stock_batch_id INTEGER NOT NULL REFERENCES stock_batches(id),
  consumption_type TEXT NOT NULL,
  status TEXT NOT NULL,
  planned_quantity REAL,
  actual_quantity REAL,
  unit_id INTEGER NOT NULL REFERENCES units(id),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  location_snapshot TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_item ON stock_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_batches_status ON stock_batches(status);
CREATE INDEX IF NOT EXISTS idx_consumption_records_item ON consumption_records(item_id);
CREATE INDEX IF NOT EXISTS idx_consumption_records_status ON consumption_records(status);

INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES
  (1, '食物', 10),
  (2, '用品', 20),
  (3, '园艺', 30);

INSERT OR IGNORE INTO categories (id, name, parent_id, sort_order) VALUES
  (101, '烹饪食材', 1, 101),
  (102, '成品预制', 1, 102),
  (103, '油盐酱醋', 1, 103),
  (104, '零食饮料', 1, 104),
  (105, '宠物饮食', 1, 105),
  (201, '清洁养护', 2, 201),
  (202, '次抛消耗', 2, 202),
  (203, '耗材工具', 2, 203),
  (204, '医药健康', 2, 204),
  (301, '肥料药品', 3, 301),
  (302, '工具配件', 3, 302);

INSERT OR IGNORE INTO units (id, name, unit_type) VALUES
  (1, '个', 'count'),
  (10, 'g', 'weight'),
  (20, 'ml', 'volume'),
  (30, 'cm', 'length');

INSERT OR IGNORE INTO locations (id, name, parent_id, path_name, sort_order) VALUES
  (1, '冰箱', NULL, '冰箱', 10),
  (2, '冷藏层', 1, '冰箱 / 冷藏层', 11),
  (3, '冷冻层', 1, '冰箱 / 冷冻层', 12),
  (4, '厨房柜子', NULL, '厨房柜子', 20),
  (5, '阳台柜子', NULL, '阳台柜子', 30),
  (6, '书房架子', NULL, '书房架子', 40),
  (8, '卫生间', NULL, '卫生间', 50),
  (9, '储物间', NULL, '储物间', 60),
  (10, '其他', NULL, '其他', 90);
