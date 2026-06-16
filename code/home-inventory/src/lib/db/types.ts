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
  item_id: number;
  item_name: string;
  brand: string | null;
  current_quantity: number;
  unit_id: number;
  unit_name: string;
  package_count: number | null;
  package_unit_id: number | null;
  package_unit_name: string | null;
  package_size_quantity: number | null;
  package_size_unit_id: number | null;
  package_size_unit_name: string | null;
  expiry_date: string | null;
  location_id: number | null;
  location_name: string | null;
  status: string;
  note: string | null;
  consumption_count: number;
}

export interface OpenConsumption {
  id: number;
  item_name: string;
  batch_label: string;
  planned_quantity: number | null;
  unit_name: string;
  package_quantity: number | null;
  package_unit_name: string | null;
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
  totalQuantity: number | null;
  unitId: number;
  packageCount: number | null;
  packageUnitId: number | null;
  packageSizeQuantity: number | null;
  packageSizeUnitId: number | null;
  expiryDate: string;
  locationId: number | null;
  note: string;
}

export interface UpdateStockBatchInput {
  id: number;
  brand: string;
  expiryDate: string;
  locationId: number | null;
  status: string;
  note: string;
}

export interface NewConsumptionInput {
  stockBatchId: number;
  consumptionType: "ONCE" | "PARTIAL" | "CONTINUOUS";
  status: "IN_PROGRESS" | "COMPLETED";
  mode: "CONTENT" | "PACKAGE";
  quantity: number | null;
  unitId: number | null;
  packageQuantity: number | null;
  note: string;
}
