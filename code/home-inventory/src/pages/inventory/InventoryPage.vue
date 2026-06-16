<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import AppPanel from "../../components/common/AppPanel.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import OptionButtonGroup from "../../components/common/OptionButtonGroup.vue";
import { createStockBatch, deleteStockBatch, updateStockBatch } from "../../lib/db";
import type { Item, Location, NewStockBatchInput, StockBatch, Unit, UpdateStockBatchInput } from "../../lib/db";
import {
  batchRemainingText,
  convertUnitQuantity,
  formatQuantity,
  packageSizeText,
  statusLabel,
} from "../../lib/inventory-format";

type EntryMode = "PACKAGE" | "TOTAL";
type OptionValue = number | string | null;
type Option<T extends OptionValue = OptionValue> = {
  label: string;
  value: T;
  meta?: string;
};

interface InventoryGroup {
  key: string;
  item: Item | null;
  itemName: string;
  locationName: string;
  batches: StockBatch[];
  batchCount: number;
  nearestExpiry: string | null;
  remainingText: string;
}

const props = defineProps<{
  items: Item[];
  locations: Location[];
  stockBatches: StockBatch[];
  units: Unit[];
}>();

const emit = defineEmits<{
  saved: [message: string];
  error: [message: string];
}>();

const showEditModal = ref(false);
const expandedGroupKeys = ref<string[]>([]);

const stockForm = reactive<NewStockBatchInput & { entryMode: EntryMode }>({
  itemId: 0,
  brand: "",
  entryMode: "PACKAGE",
  totalQuantity: 500,
  unitId: 0,
  packageCount: 5,
  packageUnitId: null,
  packageSizeQuantity: 1000,
  packageSizeUnitId: null,
  expiryDate: "",
  locationId: null,
  note: "",
});

const editForm = reactive<UpdateStockBatchInput>({
  id: 0,
  brand: "",
  expiryDate: "",
  locationId: null,
  status: "NORMAL",
  note: "",
});

const packageUnits = computed(() => props.units.filter((unit) => unit.unit_type === "count"));
const selectedStockItem = computed(() => props.items.find((item) => item.id === stockForm.itemId) ?? null);
const editingBatch = computed(() => props.stockBatches.find((batch) => batch.id === editForm.id) ?? null);

const itemOptions = computed<Option<number>[]>(() =>
  props.items.map((item) => ({
    label: item.name,
    value: item.id,
    meta: item.category_name,
  })),
);

const unitOptions = computed<Option<number>[]>(() =>
  props.units.map((unit) => ({
    label: unit.name,
    value: unit.id,
    meta: unit.unit_type,
  })),
);

const packageUnitOptions = computed<Option<number>[]>(() =>
  packageUnits.value.map((unit) => ({
    label: unit.name,
    value: unit.id,
  })),
);

const locationOptions = computed<Option<number | null>[]>(() => [
  { label: "暂不记录", value: null },
  ...props.locations.map((location) => ({
    label: location.path_name,
    value: location.id,
  })),
]);

const entryModeOptions: Option<EntryMode>[] = [
  { label: "按包装录入", value: "PACKAGE" },
  { label: "直接填总量", value: "TOTAL" },
];

const statusOptions: Option<string>[] = [
  { label: "正常", value: "NORMAL" },
  { label: "耗尽", value: "DEPLETED" },
  { label: "过期", value: "EXPIRED" },
  { label: "废弃", value: "DISCARDED" },
];

const stockExpiryTimestamp = computed({
  get() {
    return stockForm.expiryDate ? new Date(`${stockForm.expiryDate}T00:00:00`).getTime() : null;
  },
  set(value: number | null) {
    stockForm.expiryDate = timestampToDate(value);
  },
});

const editExpiryTimestamp = computed({
  get() {
    return editForm.expiryDate ? new Date(`${editForm.expiryDate}T00:00:00`).getTime() : null;
  },
  set(value: number | null) {
    editForm.expiryDate = timestampToDate(value);
  },
});

const stockTotalPreview = computed(() => {
  if (stockForm.entryMode !== "PACKAGE") {
    return stockForm.totalQuantity;
  }

  if (
    !stockForm.packageCount ||
    !stockForm.packageSizeQuantity ||
    !stockForm.packageSizeUnitId ||
    !stockForm.unitId
  ) {
    return null;
  }

  const perPackage = convertUnitQuantity(
    stockForm.packageSizeQuantity,
    stockForm.packageSizeUnitId,
    stockForm.unitId,
    props.units,
  );
  return perPackage === null ? null : stockForm.packageCount * perPackage;
});

const inventoryGroups = computed<InventoryGroup[]>(() => {
  const groups = new Map<string, Omit<InventoryGroup, "batchCount" | "nearestExpiry" | "remainingText">>();

  for (const batch of props.stockBatches) {
    const item = props.items.find((candidate) => candidate.id === batch.item_id) ?? null;
    const locationName = batch.location_name || "未记录位置";
    const key = `${batch.item_id}:${batch.location_id ?? "none"}`;
    const group =
      groups.get(key) ??
      {
        key,
        item,
        itemName: batch.item_name,
        locationName,
        batches: [],
      };

    group.batches.push(batch);
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((group) => {
      const batches = [...group.batches].sort(compareBatches);
      return {
        ...group,
        batches,
        batchCount: batches.length,
        nearestExpiry: nearestExpiry(batches),
        remainingText: totalRemainingText(batches, group.item),
      };
    })
    .sort((a, b) => {
      const itemOrder = a.itemName.localeCompare(b.itemName, "zh-Hans-CN");
      return itemOrder === 0 ? a.locationName.localeCompare(b.locationName, "zh-Hans-CN") : itemOrder;
    });
});

function timestampToDate(value: number | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function findUnit(unitId: number | null | undefined) {
  return props.units.find((unit) => unit.id === unitId) ?? null;
}

function compareBatches(a: StockBatch, b: StockBatch) {
  if (a.status !== b.status) {
    return a.status.localeCompare(b.status);
  }

  if (a.expiry_date && b.expiry_date) {
    return a.expiry_date.localeCompare(b.expiry_date);
  }

  if (a.expiry_date) {
    return -1;
  }

  if (b.expiry_date) {
    return 1;
  }

  return b.id - a.id;
}

function nearestExpiry(batches: StockBatch[]) {
  return batches
    .map((batch) => batch.expiry_date)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
}

function totalRemainingText(batches: StockBatch[], item: Item | null) {
  const totals = new Map<number, number>();
  const preferredUnitId = item?.default_unit_id ?? null;

  for (const batch of batches) {
    const converted =
      preferredUnitId === null
        ? null
        : convertUnitQuantity(batch.current_quantity, batch.unit_id, preferredUnitId, props.units);
    const unitId = converted === null || preferredUnitId === null ? batch.unit_id : preferredUnitId;
    totals.set(unitId, (totals.get(unitId) ?? 0) + (converted ?? batch.current_quantity));
  }

  if (totals.size === 0) {
    return "0";
  }

  return Array.from(totals.entries())
    .map(([unitId, quantity]) => `${formatQuantity(quantity)} ${findUnit(unitId)?.name ?? ""}`.trim())
    .join(" + ");
}

function statusTagType(status: string) {
  if (status === "NORMAL") {
    return "success";
  }

  if (status === "EXPIRED") {
    return "warning";
  }

  if (status === "DISCARDED") {
    return "error";
  }

  return "default";
}

function isExpanded(key: string) {
  return expandedGroupKeys.value.includes(key);
}

function toggleGroup(key: string) {
  expandedGroupKeys.value = isExpanded(key)
    ? expandedGroupKeys.value.filter((current) => current !== key)
    : [...expandedGroupKeys.value, key];
}

function syncNewStockDefaults() {
  const firstItem = props.items[0];
  if (!props.items.some((item) => item.id === stockForm.itemId)) {
    stockForm.itemId = firstItem?.id ?? 0;
  }

  const selectedItem = selectedStockItem.value;
  const firstUnit = props.units[0];
  if (!props.units.some((unit) => unit.id === stockForm.unitId)) {
    stockForm.unitId = selectedItem?.default_unit_id ?? firstUnit?.id ?? 0;
  }

  if (!props.units.some((unit) => unit.id === stockForm.packageSizeUnitId)) {
    stockForm.packageSizeUnitId = selectedItem?.default_unit_id ?? firstUnit?.id ?? null;
  }

  if (!packageUnits.value.some((unit) => unit.id === stockForm.packageUnitId)) {
    stockForm.packageUnitId = packageUnits.value[0]?.id ?? null;
  }
}

function openEditModal(batch: StockBatch) {
  editForm.id = batch.id;
  editForm.brand = batch.brand ?? "";
  editForm.expiryDate = batch.expiry_date ?? "";
  editForm.locationId = batch.location_id;
  editForm.status = batch.status;
  editForm.note = batch.note ?? "";
  showEditModal.value = true;
}

async function submitStockBatch() {
  if (!stockForm.itemId) {
    emit("error", "请选择物资");
    return;
  }

  if (stockForm.entryMode === "PACKAGE") {
    if (
      !stockForm.packageCount ||
      !stockForm.packageUnitId ||
      !stockForm.packageSizeQuantity ||
      !stockForm.packageSizeUnitId
    ) {
      emit("error", "请填写包装数量和单包装内容量");
      return;
    }
  } else if (!stockForm.totalQuantity || stockForm.totalQuantity <= 0) {
    emit("error", "请填写大于 0 的库存总量");
    return;
  }

  try {
    await createStockBatch({
      ...stockForm,
      packageCount: stockForm.entryMode === "PACKAGE" ? stockForm.packageCount : null,
      packageUnitId: stockForm.entryMode === "PACKAGE" ? stockForm.packageUnitId : null,
      packageSizeQuantity: stockForm.entryMode === "PACKAGE" ? stockForm.packageSizeQuantity : null,
      packageSizeUnitId: stockForm.entryMode === "PACKAGE" ? stockForm.packageSizeUnitId : null,
    });
    stockForm.brand = "";
    stockForm.note = "";
    stockForm.expiryDate = "";
    emit("saved", "已录入库存批次");
  } catch (error) {
    emit("error", error instanceof Error ? error.message : String(error));
  }
}

async function submitBatchEdit() {
  try {
    await updateStockBatch(editForm);
    showEditModal.value = false;
    emit("saved", "已更新库存批次");
  } catch (error) {
    emit("error", error instanceof Error ? error.message : String(error));
  }
}

async function removeBatch(batch: StockBatch) {
  if (batch.consumption_count > 0) {
    emit("error", "该批次已经有消耗记录，不能删除");
    return;
  }

  const confirmed = window.confirm(`确定删除“${batch.item_name}”这个批次吗？`);
  if (!confirmed) {
    return;
  }

  try {
    await deleteStockBatch(batch.id);
    emit("saved", "已删除库存批次");
  } catch (error) {
    emit("error", error instanceof Error ? error.message : String(error));
  }
}

watch(
  () => [props.items, props.units, props.locations],
  () => syncNewStockDefaults(),
  { immediate: true },
);

watch(
  () => stockForm.itemId,
  () => {
    const item = selectedStockItem.value;
    if (!item) {
      return;
    }

    stockForm.unitId = item.default_unit_id;
    stockForm.packageSizeUnitId = item.default_unit_id;
  },
);
</script>

<template>
  <div class="inventory-page">
    <AppPanel title="库存总览" description="按物资和位置汇总，点击任意行查看批次。">
      <div v-if="inventoryGroups.length > 0" class="overview-list">
        <section
          v-for="group in inventoryGroups"
          :key="group.key"
          class="overview-item"
          :class="{ expanded: isExpanded(group.key) }"
        >
          <button class="overview-main" type="button" @click="toggleGroup(group.key)">
            <span class="expand-mark">{{ isExpanded(group.key) ? "收起" : "展开" }}</span>
            <span class="overview-name">
              <strong>{{ group.itemName }}</strong>
              <small>{{ group.locationName }}</small>
            </span>
            <span class="overview-metric">
              <strong>{{ group.remainingText }}</strong>
              <small>剩余库存</small>
            </span>
            <span class="overview-metric">
              <strong>{{ group.batchCount }}</strong>
              <small>批次</small>
            </span>
            <span class="overview-metric">
              <strong>{{ group.nearestExpiry || "无" }}</strong>
              <small>最近有效期</small>
            </span>
          </button>

          <div v-if="isExpanded(group.key)" class="batch-list">
            <article v-for="batch in group.batches" :key="batch.id" class="batch-row">
              <div class="batch-info">
                <div class="batch-title">
                  <strong>{{ batch.brand || "默认批次" }}</strong>
                  <n-tag round size="small" :type="statusTagType(batch.status)">
                    {{ statusLabel(batch.status) }}
                  </n-tag>
                </div>
                <p>{{ batchRemainingText(batch, units) }}</p>
                <small>
                  {{ packageSizeText(batch) || "无包装折算" }} · 有效期
                  {{ batch.expiry_date || "无" }} · {{ batch.note || "无备注" }}
                </small>
              </div>
              <div class="batch-actions">
                <n-button secondary size="small" @click="openEditModal(batch)">编辑</n-button>
                <n-button
                  secondary
                  size="small"
                  type="error"
                  :disabled="batch.consumption_count > 0"
                  :title="batch.consumption_count > 0 ? '已有消耗记录，不能删除' : '删除批次'"
                  @click="removeBatch(batch)"
                >
                  删除
                </n-button>
              </div>
            </article>
          </div>
        </section>
      </div>
      <EmptyState v-else text="还没有库存，先在下方录入第一个批次。" />
    </AppPanel>

    <AppPanel title="新增库存" description="在这里录入新的库存批次。">
      <n-form class="compact-form create-form" label-placement="top" @submit.prevent="submitStockBatch">
        <n-form-item class="span-3" label="物资">
          <OptionButtonGroup v-model="stockForm.itemId" :options="itemOptions" />
        </n-form-item>

        <n-form-item class="span-2" label="品牌">
          <n-input v-model:value="stockForm.brand" placeholder="可选" />
        </n-form-item>
        <n-form-item label="入库方式">
          <OptionButtonGroup
            v-model="stockForm.entryMode"
            compact
            variant="segmented"
            :options="entryModeOptions"
          />
        </n-form-item>

        <template v-if="stockForm.entryMode === 'PACKAGE'">
          <n-form-item label="每件含量">
            <n-input-number
              v-model:value="stockForm.packageSizeQuantity"
              :min="0"
              :step="0.01"
              placeholder="0"
            />
          </n-form-item>
          <n-form-item label="内容单位">
            <OptionButtonGroup
              v-model="stockForm.packageSizeUnitId"
              compact
              variant="segmented"
              :options="unitOptions"
            />
          </n-form-item>
          <n-form-item label="包装单位">
            <OptionButtonGroup
              v-model="stockForm.packageUnitId"
              compact
              variant="segmented"
              :options="packageUnitOptions"
            />
          </n-form-item>

          <n-form-item label="包装数量">
            <n-input-number
              v-model:value="stockForm.packageCount"
              :min="0"
              :step="0.01"
              placeholder="0"
            />
          </n-form-item>
          <n-form-item label="库存单位">
            <OptionButtonGroup
              v-model="stockForm.unitId"
              compact
              variant="segmented"
              :options="unitOptions"
            />
          </n-form-item>
          <n-alert class="form-hint span-1" :show-icon="false" type="info">
            {{ formatQuantity(stockTotalPreview) || "待计算" }}
            {{ findUnit(stockForm.unitId)?.name || "" }}
          </n-alert>
        </template>

        <template v-else>
          <n-form-item label="总量">
            <n-input-number
              v-model:value="stockForm.totalQuantity"
              :min="0"
              :step="0.01"
              placeholder="0"
            />
          </n-form-item>
          <n-form-item class="span-2" label="单位">
            <OptionButtonGroup
              v-model="stockForm.unitId"
              compact
              variant="segmented"
              :options="unitOptions"
            />
          </n-form-item>
        </template>

        <n-form-item label="有效期">
          <n-date-picker v-model:value="stockExpiryTimestamp" clearable type="date" />
        </n-form-item>
        <n-form-item class="span-2" label="位置">
          <OptionButtonGroup
            v-model="stockForm.locationId"
            compact
            dense
            :options="locationOptions"
          />
        </n-form-item>
        <n-form-item class="span-3" label="备注">
          <n-input v-model:value="stockForm.note" placeholder="可选" type="textarea" />
        </n-form-item>
        <div class="form-actions span-3">
          <n-button attr-type="submit" strong type="primary">保存库存</n-button>
        </div>
      </n-form>
    </AppPanel>

    <n-modal v-model:show="showEditModal" preset="card" :title="`编辑${editingBatch?.item_name}的批次`" class="inventory-modal common-modal-width">
      <n-form class="compact-form" label-placement="top" @submit.prevent="submitBatchEdit">
        <n-form-item label="品牌">
          <n-input v-model:value="editForm.brand" placeholder="可选" />
        </n-form-item>
        <n-form-item label="有效期">
          <n-date-picker v-model:value="editExpiryTimestamp" clearable type="date" />
        </n-form-item>
        <n-form-item class="span-3" label="位置">
          <OptionButtonGroup
            v-model="editForm.locationId"
            compact
            dense
            :options="locationOptions"
          />
        </n-form-item>
        <n-form-item class="span-3" label="状态">
          <OptionButtonGroup
            v-model="editForm.status"
            compact
            variant="segmented"
            :options="statusOptions"
          />
        </n-form-item>
        <n-form-item class="span-3" label="备注">
          <n-input v-model:value="editForm.note" placeholder="可选" type="textarea" />
        </n-form-item>
        <div class="form-actions span-3">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button attr-type="submit" strong type="primary">保存修改</n-button>
        </div>
      </n-form>
    </n-modal>
  </div>
</template>

<style scoped>
.inventory-page {
  display: grid;
  gap: 18px;
}

.overview-list {
  display: grid;
  gap: 10px;
}

.overview-item {
  border: 1px solid #e4dacf;
  border-radius: 8px;
  background: #fffdfa;
  overflow: hidden;
}

.overview-item.expanded {
  border-color: #c6a36d;
}

.overview-main {
  display: grid;
  grid-template-columns: 58px minmax(180px, 1.4fr) repeat(3, minmax(120px, 1fr));
  align-items: center;
  width: 100%;
  gap: 14px;
  border: 0;
  padding: 14px 16px;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.overview-main:hover {
  background: #faf5ed;
}

.expand-mark {
  color: #7a5c2f;
  font-size: 12px;
  font-weight: 800;
}

.overview-name,
.overview-metric,
.batch-info {
  display: grid;
  gap: 2px;
}

.overview-name strong,
.overview-metric strong {
  font-size: 15px;
}

.overview-name small,
.overview-metric small,
.batch-info small {
  color: #63717c;
  font-size: 12px;
}

.batch-list {
  display: grid;
  gap: 8px;
  border-top: 1px solid #efe6dc;
  padding: 10px;
  background: #fbf8f3;
}

.batch-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 1px solid #eadfd3;
  border-radius: 8px;
  padding: 10px 12px;
  background: white;
}

.batch-title {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.batch-info p {
  margin: 0;
  color: #34404a;
}

.batch-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}


.create-form {
  border: 1px solid #eadfd3;
  border-radius: 8px;
  padding: 14px;
  background: #fffdfa;
}

@media (max-width: 980px) {
  .overview-main {
    grid-template-columns: 1fr 1fr;
  }

  .expand-mark {
    grid-column: 1 / -1;
  }

  .overview-name {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .batch-row {
    grid-template-columns: 1fr;
  }

  .batch-actions {
    justify-content: stretch;
  }

  .batch-actions :deep(.n-button) {
    flex: 1;
  }
}
</style>
