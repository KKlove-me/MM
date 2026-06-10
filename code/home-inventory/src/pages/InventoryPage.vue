<script setup lang="ts">
import { computed, reactive } from "vue";
import AppPanel from "../components/common/AppPanel.vue";
import {
  createStockBatch,
  type Item,
  type Location,
  type StockBatch,
  type Unit,
} from "../lib/db";
import {
  batchRemainingText,
  convertUnitQuantity,
  formatQuantity,
  statusLabel,
} from "../lib/inventory-format";

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
      <form class="form-grid" @submit.prevent="submitStockBatch">
        <label>
          物资
          <select v-model.number="stockForm.itemId">
            <option v-for="item in items" :key="item.id" :value="item.id">
              {{ item.name }} / {{ item.category_name }}
            </option>
          </select>
        </label>
        <label>
          品牌
          <input v-model="stockForm.brand" placeholder="可选" />
        </label>
        <label>
          规格
          <input v-model="stockForm.spec" placeholder="可选；未填时按包装自动生成" />
        </label>
        <label>
          入库方式
          <select v-model="stockForm.entryMode">
            <option value="PACKAGE">按包装录入</option>
            <option value="TOTAL">直接填总量</option>
          </select>
        </label>
        <template v-if="stockForm.entryMode === 'PACKAGE'">
          <div class="inline-fields three-columns">
            <label>
              每件含量
              <input v-model.number="stockForm.packageSizeQuantity" min="0" step="0.01" type="number" />
            </label>
            <label>
              内容单位
              <select v-model.number="stockForm.packageSizeUnitId">
                <option v-for="unit in units" :key="unit.id" :value="unit.id">
                  {{ unit.name }}
                </option>
              </select>
            </label>
            <label>
              包装单位
              <select v-model.number="stockForm.packageUnitId">
                <option v-for="unit in packageUnits" :key="unit.id" :value="unit.id">
                  {{ unit.name }}
                </option>
              </select>
            </label>
          </div>
          <div class="inline-fields">
            <label>
              包装数量
              <input v-model.number="stockForm.packageCount" min="0" step="0.01" type="number" />
            </label>
            <label>
              库存单位
              <select v-model.number="stockForm.unitId">
                <option v-for="unit in units" :key="unit.id" :value="unit.id">
                  {{ unit.name }}
                </option>
              </select>
            </label>
          </div>
          <p class="form-hint">
            将保存为 {{ formatQuantity(stockTotalPreview) || "待计算" }}
            {{ findUnit(stockForm.unitId)?.name || "" }} 总库存
          </p>
        </template>
        <div v-else class="inline-fields">
          <label>
            总量
            <input v-model.number="stockForm.totalQuantity" min="0" step="0.01" type="number" />
          </label>
          <label>
            单位
            <select v-model.number="stockForm.unitId">
              <option v-for="unit in units" :key="unit.id" :value="unit.id">
                {{ unit.name }}
              </option>
            </select>
          </label>
        </div>
        <label>
          有效期
          <input v-model="stockForm.expiryDate" type="date" />
        </label>
        <label>
          位置
          <select v-model.number="stockForm.locationId">
            <option :value="null">暂不记录</option>
            <option v-for="location in locations" :key="location.id" :value="location.id">
              {{ location.path_name }}
            </option>
          </select>
        </label>
        <label>
          备注
          <textarea v-model="stockForm.note" rows="2" placeholder="可选" />
        </label>
        <button type="submit">保存库存</button>
      </form>
    </AppPanel>

    <AppPanel title="当前库存批次" description="按状态、有效期和录入时间排序。">
      <div class="table-wrap">
        <table>
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
                <span class="pill">{{ statusLabel(batch.status) }}</span>
              </td>
            </tr>
            <tr v-if="stockBatches.length === 0">
              <td colspan="6" class="empty">还没有库存，先录入一个批次。</td>
            </tr>
          </tbody>
        </table>
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
