<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import AppPanel from "../components/common/AppPanel.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { createConsumption } from "../lib/db";
import type { NewConsumptionInput, OpenConsumption, StockBatch, Unit } from "../lib/db";
import {
  batchRemainingText,
  batchTitle,
  openConsumptionText,
  packageSizeText,
  remainingPackageText,
} from "../lib/inventory-format";

const props = defineProps<{
  activeStockBatches: StockBatch[];
  openConsumptions: OpenConsumption[];
  units: Unit[];
}>();

const emit = defineEmits<{
  saved: [message: string];
  error: [message: string];
}>();

const consumptionForm = reactive<NewConsumptionInput>({
  stockBatchId: 0,
  consumptionType: "PARTIAL",
  status: "COMPLETED",
  mode: "CONTENT",
  quantity: 500,
  unitId: 10,
  packageQuantity: 1,
  note: "",
});

const selectedConsumptionBatch = computed(
  () => props.activeStockBatches.find((batch) => batch.id === consumptionForm.stockBatchId) ?? null,
);

const canConsumeByPackage = computed(() => {
  const batch = selectedConsumptionBatch.value;
  return Boolean(batch?.package_unit_id && batch.package_size_quantity && batch.package_size_unit_id);
});

function syncConsumptionBatch() {
  const firstBatch = props.activeStockBatches[0];
  const selectedBatchIsActive = props.activeStockBatches.some(
    (batch) => batch.id === consumptionForm.stockBatchId,
  );

  if ((!consumptionForm.stockBatchId || !selectedBatchIsActive) && firstBatch) {
    consumptionForm.stockBatchId = firstBatch.id;
  } else if (!firstBatch) {
    consumptionForm.stockBatchId = 0;
  }
}

function syncConsumptionUnit() {
  const batch = selectedConsumptionBatch.value;
  if (!batch) {
    return;
  }

  consumptionForm.unitId = batch.unit_id;
  if (!canConsumeByPackage.value && consumptionForm.mode === "PACKAGE") {
    consumptionForm.mode = "CONTENT";
  }
}

async function submitConsumption() {
  if (!consumptionForm.stockBatchId) {
    emit("error", "请选择库存批次");
    return;
  }

  try {
    await createConsumption({
      ...consumptionForm,
      unitId: consumptionForm.mode === "CONTENT" ? consumptionForm.unitId : null,
    });
    consumptionForm.note = "";
    emit("saved", consumptionForm.status === "IN_PROGRESS" ? "已标记为消耗中" : "已记录消耗");
  } catch (error) {
    emit("error", error instanceof Error ? error.message : String(error));
  }
}

watch(
  () => props.activeStockBatches,
  () => {
    syncConsumptionBatch();
    syncConsumptionUnit();
  },
  { immediate: true },
);

watch(
  () => consumptionForm.stockBatchId,
  () => syncConsumptionUnit(),
);

watch(canConsumeByPackage, (canUsePackage) => {
  if (!canUsePackage && consumptionForm.mode === "PACKAGE") {
    consumptionForm.mode = "CONTENT";
  }
});
</script>

<template>
  <div class="page-grid">
    <AppPanel title="记录消耗 / 开封" description="已完成会扣减库存；消耗中用于管理已开封。">
      <form class="form-grid" @submit.prevent="submitConsumption">
        <label>
          批次
          <select v-model.number="consumptionForm.stockBatchId">
            <option v-for="batch in activeStockBatches" :key="batch.id" :value="batch.id">
              {{ batchTitle(batch) }}，剩余 {{ batchRemainingText(batch, units) }}
            </option>
          </select>
        </label>
        <label>
          类型
          <select v-model="consumptionForm.consumptionType">
            <option value="ONCE">一次性</option>
            <option value="PARTIAL">部分消耗</option>
            <option value="CONTINUOUS">持续消耗</option>
          </select>
        </label>
        <label>
          状态
          <select v-model="consumptionForm.status">
            <option value="COMPLETED">已完成并扣减</option>
            <option value="IN_PROGRESS">消耗中 / 已开封</option>
          </select>
        </label>
        <label>
          消耗方式
          <select v-model="consumptionForm.mode">
            <option value="CONTENT">按内容量消耗</option>
            <option :disabled="!canConsumeByPackage" value="PACKAGE">按包装消耗</option>
          </select>
        </label>
        <div v-if="consumptionForm.mode === 'PACKAGE'" class="inline-fields">
          <label>
            包装数量
            <input v-model.number="consumptionForm.packageQuantity" min="0" step="0.01" type="number" />
          </label>
          <label>
            包装单位
            <input :value="selectedConsumptionBatch?.package_unit_name || ''" disabled />
          </label>
        </div>
        <div v-else class="inline-fields">
          <label>
            内容量
            <input v-model.number="consumptionForm.quantity" min="0" step="0.01" type="number" />
          </label>
          <label>
            单位
            <select v-model.number="consumptionForm.unitId">
              <option v-for="unit in units" :key="unit.id" :value="unit.id">
                {{ unit.name }}
              </option>
            </select>
          </label>
        </div>
        <p v-if="selectedConsumptionBatch && canConsumeByPackage" class="form-hint">
          当前包装：{{ packageSizeText(selectedConsumptionBatch) }}；剩余约
          {{ remainingPackageText(selectedConsumptionBatch, units) }}
        </p>
        <label>
          备注
          <textarea v-model="consumptionForm.note" rows="2" placeholder="例如：做晚饭用掉" />
        </label>
        <button type="submit">保存消耗</button>
      </form>
    </AppPanel>

    <AppPanel title="正在消耗" description="来自状态为消耗中的消耗单。">
      <ul v-if="openConsumptions.length > 0" class="record-list">
        <li v-for="record in openConsumptions" :key="record.id">
          <strong>{{ record.item_name }}</strong>
          <span>{{ record.batch_label || "默认批次" }}</span>
          <small>
            {{ openConsumptionText(record) }} ·
            {{ record.location_snapshot || "未记录位置" }}
          </small>
        </li>
      </ul>
      <EmptyState v-else text="暂无已开封或消耗中的物资。" />
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
