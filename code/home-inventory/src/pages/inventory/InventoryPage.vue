<script setup lang="ts">
import { computed, reactive } from "vue";
import AppPanel from "../../components/common/AppPanel.vue";
import { createStockBatch } from "../../lib/db";
import type { Item, Location, StockBatch, Unit } from "../../lib/db";
import {
  batchRemainingText,
  convertUnitQuantity,
  formatQuantity,
  statusLabel,
} from "../../lib/inventory-format";

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

const stockForm = reactive({
  itemId: 1,
  brand: "",
  spec: "",
  entryMode: "PACKAGE" as "PACKAGE" | "TOTAL",
  totalQuantity: 500 as number | null,
  unitId: 10,
  packageCount: 5 as number | null,
  packageUnitId: 6 as number | null,
  packageSizeQuantity: 1000 as number | null,
  packageSizeUnitId: 10 as number | null,
  expiryDate: "",
  locationId: 4 as number | null,
  note: "",
});

const packageUnits = computed(() => props.units.filter((unit) => unit.unit_type === "count"));
const itemOptions = computed(() =>
  props.items.map((item) => ({
    label: `${item.name} / ${item.category_name}`,
    value: item.id,
  })),
);
const unitOptions = computed(() =>
  props.units.map((unit) => ({
    label: unit.name,
    value: unit.id,
  })),
);
const packageUnitOptions = computed(() =>
  packageUnits.value.map((unit) => ({
    label: unit.name,
    value: unit.id,
  })),
);
const locationOptions = computed(() =>
  props.locations.map((location) => ({
    label: location.path_name,
    value: location.id,
  })),
);

const expiryTimestamp = computed({
  get() {
    return stockForm.expiryDate ? new Date(`${stockForm.expiryDate}T00:00:00`).getTime() : null;
  },
  set(value: number | null) {
    if (!value) {
      stockForm.expiryDate = "";
      return;
    }

    const date = new Date(value);
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    stockForm.expiryDate = `${date.getFullYear()}-${month}-${day}`;
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

function findUnit(unitId: number | null | undefined) {
  return props.units.find((unit) => unit.id === unitId) ?? null;
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
    stockForm.spec = "";
    stockForm.note = "";
    stockForm.expiryDate = "";
    emit("saved", "已录入库存批次");
  } catch (error) {
    emit("error", error instanceof Error ? error.message : String(error));
  }
}
</script>

<template>
  <div class="page-grid">
    <AppPanel title="录入库存" description="每次入库形成一个批次，包装信息会换算为真实库存总量。">
      <n-form class="form-grid" label-placement="top" @submit.prevent="submitStockBatch">
          <n-form-item label="物资">
            <n-select v-model:value="stockForm.itemId" :options="itemOptions" filterable />
          </n-form-item>
          <n-form-item label="品牌">
            <n-input v-model:value="stockForm.brand" placeholder="可选" />
          </n-form-item>
          <n-form-item label="规格">
            <n-input v-model:value="stockForm.spec" placeholder="可选；未填时按包装自动生成" />
          </n-form-item>
          <n-form-item label="入库方式">
            <n-radio-group v-model:value="stockForm.entryMode">
              <n-radio-button value="PACKAGE">按包装录入</n-radio-button>
              <n-radio-button value="TOTAL">直接填总量</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <template v-if="stockForm.entryMode === 'PACKAGE'">
            <div class="inline-fields three-columns">
              <n-form-item label="每件含量">
                <n-input-number
                  v-model:value="stockForm.packageSizeQuantity"
                  :min="0"
                  :step="0.01"
                  placeholder="0"
                />
              </n-form-item>
              <n-form-item label="内容单位">
                <n-select v-model:value="stockForm.packageSizeUnitId" :options="unitOptions" />
              </n-form-item>
              <n-form-item label="包装单位">
                <n-select v-model:value="stockForm.packageUnitId" :options="packageUnitOptions" />
              </n-form-item>
            </div>
            <div class="inline-fields">
              <n-form-item label="包装数量">
                <n-input-number
                  v-model:value="stockForm.packageCount"
                  :min="0"
                  :step="0.01"
                  placeholder="0"
                />
              </n-form-item>
              <n-form-item label="库存单位">
                <n-select v-model:value="stockForm.unitId" :options="unitOptions" />
              </n-form-item>
            </div>
            <n-alert class="form-hint" :show-icon="false" type="info">
              将保存为 {{ formatQuantity(stockTotalPreview) || "待计算" }}
              {{ findUnit(stockForm.unitId)?.name || "" }} 总库存
            </n-alert>
          </template>
          <div v-else class="inline-fields">
            <n-form-item label="总量">
              <n-input-number
                v-model:value="stockForm.totalQuantity"
                :min="0"
                :step="0.01"
                placeholder="0"
              />
            </n-form-item>
            <n-form-item label="单位">
              <n-select v-model:value="stockForm.unitId" :options="unitOptions" />
            </n-form-item>
          </div>
          <n-form-item label="有效期">
            <n-date-picker v-model:value="expiryTimestamp" clearable type="date" />
          </n-form-item>
          <n-form-item label="位置">
            <n-select
              v-model:value="stockForm.locationId"
              :options="locationOptions"
              clearable
              filterable
              placeholder="暂不记录"
            />
          </n-form-item>
          <n-form-item label="备注">
            <n-input v-model:value="stockForm.note" placeholder="可选" type="textarea" />
          </n-form-item>
          <n-button attr-type="submit" block strong type="primary">保存库存</n-button>
      </n-form>
    </AppPanel>

    <AppPanel title="当前库存批次" description="按状态、有效期和录入时间排序。">
      <div class="table-wrap">
        <n-table :bordered="false" :single-line="false">
          <thead>
            <tr>
              <th>物资</th>
              <th>批次</th>
              <th>剩余</th>
              <th>位置</th>
              <th>有效期</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="batch in stockBatches" :key="batch.id">
              <td>{{ batch.item_name }}</td>
              <td>{{ [batch.brand, batch.spec].filter(Boolean).join(" ") || "默认批次" }}</td>
              <td>{{ batchRemainingText(batch, units) }}</td>
              <td>{{ batch.location_name || "未记录" }}</td>
              <td>{{ batch.expiry_date || "无" }}</td>
              <td>
                <n-tag round size="small" type="success">{{ statusLabel(batch.status) }}</n-tag>
              </td>
            </tr>
            <tr v-if="stockBatches.length === 0">
              <td colspan="6" class="empty">还没有库存，先录入一个批次。</td>
            </tr>
          </tbody>
        </n-table>
      </div>
    </AppPanel>
  </div>
</template>

<style scoped>
.page-grid {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

@media (max-width: 980px) {
  .page-grid {
    grid-template-columns: 1fr;
  }
}
</style>
