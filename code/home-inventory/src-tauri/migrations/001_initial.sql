CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES categories(id),
  default_expiry_remind_days INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'NORMAL',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  unit_type TEXT NOT NULL,
  base_unit_id INTEGER REFERENCES units(id),
  conversion_rate_to_base REAL NOT NULL DEFAULT 1,
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
  spec TEXT,
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

INSERT OR IGNORE INTO categories (id, name, default_expiry_remind_days, sort_order) VALUES
  (1, '食品', 7, 10),
  (2, '日用', 30, 20),
  (3, '园艺', 30, 30),
  (4, '药品/护理', 30, 40),
  (5, '工具/耗材', NULL, 50),
  (6, '其他', NULL, 60);

INSERT OR IGNORE INTO categories (id, name, parent_id, default_expiry_remind_days, sort_order) VALUES
  (101, '干货', 1, 30, 101),
  (102, '冷冻', 1, 14, 102),
  (103, '冷藏', 1, 7, 103),
  (104, '半成品', 1, 7, 104),
  (105, '即食', 1, 3, 105),
  (106, '调料', 1, 90, 106),
  (201, '厨房耗材', 2, NULL, 201),
  (202, '洗护用品', 2, NULL, 202),
  (203, '清洁用品', 2, NULL, 203),
  (301, '肥料', 3, 180, 301),
  (302, '种子', 3, 365, 302);

INSERT OR IGNORE INTO units (id, name, unit_type, base_unit_id, conversion_rate_to_base) VALUES
  (1, '个', 'count', NULL, 1),
  (2, '只', 'count', NULL, 1),
  (3, '块', 'count', NULL, 1),
  (4, '瓶', 'count', NULL, 1),
  (5, '包', 'count', NULL, 1),
  (6, '袋', 'count', NULL, 1),
  (7, '盒', 'count', NULL, 1),
  (10, 'g', 'weight', NULL, 1),
  (11, 'kg', 'weight', 10, 1000),
  (20, 'ml', 'volume', NULL, 1),
  (21, 'L', 'volume', 20, 1000),
  (30, 'm', 'length', NULL, 1),
  (31, 'cm', 'length', 30, 0.01);

INSERT OR IGNORE INTO locations (id, name, parent_id, path_name, sort_order) VALUES
  (1, '冰箱', NULL, '冰箱', 10),
  (2, '冷藏层', 1, '冰箱 / 冷藏层', 11),
  (3, '冷冻层', 1, '冰箱 / 冷冻层', 12),
  (4, '厨房柜子', NULL, '厨房柜子', 20),
  (5, '阳台柜子', NULL, '阳台柜子', 30),
  (6, '书房架子', NULL, '书房架子', 40),
  (7, '第 2 层', 6, '书房架子 / 第 2 层', 41),
  (8, '卫生间', NULL, '卫生间', 50),
  (9, '储物间', NULL, '储物间', 60),
  (10, '其他', NULL, '其他', 90);

INSERT OR IGNORE INTO items (id, name, category_id, default_unit_id, enable_expiry, expiry_remind_days, note) VALUES
  (1, '面粉', 101, 10, 1, 30, '不同品牌和规格统一按面粉统计'),
  (2, '饭团', 102, 1, 1, 7, '冷冻/冷藏即食类'),
  (3, '沐浴露', 202, 20, 0, NULL, '适合持续消耗/已开封管理'),
  (4, '保鲜袋', 201, 2, 0, NULL, NULL),
  (5, '肥料', 301, 10, 0, NULL, NULL);
