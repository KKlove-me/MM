<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import AppPanel from "../../components/common/AppPanel.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import { createConsumption } from "../../lib/db";
import type { NewConsumptionInput, OpenConsumption, StockBatch, Unit } from "../../lib/db";
import {
  batchRemainingText,
  batchTitle,
  openConsumptionText,
  packageSizeText,
  remainingPackageText,
} from "../../lib/inventory-format";

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

const batchOptions = computed(() =>
  props.activeStockBatches.map((batch) => ({
    label: `${batchTitle(batch)}，剩余 ${batchRemainingText(batch, props.units)}`,
    value: batch.id,
  })),
);

const unitOptions = computed(() =>
  props.units.map((unit) => ({
    label: unit.name,
    value: unit.id,
  })),
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
      <n-form class="form-grid" label-placement="top" @submit.prevent="submitConsumption">
          <n-form-item label="批次">
            <n-select v-model:value="consumptionForm.stockBatchId" :options="batchOptions" filterable />
          </n-form-item>
          <n-form-item label="类型">
            <n-radio-group v-model:value="consumptionForm.consumptionType">
              <n-radio-button value="ONCE">一次性</n-radio-button>
              <n-radio-button value="PARTIAL">部分消耗</n-radio-button>
              <n-radio-button value="CONTINUOUS">持续消耗</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="状态">
            <n-radio-group v-model:value="consumptionForm.status">
              <n-radio-button value="COMPLETED">已完成并扣减</n-radio-button>
              <n-radio-button value="IN_PROGRESS">消耗中 / 已开封</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="消耗方式">
            <n-radio-group v-model:value="consumptionForm.mode">
              <n-radio-button value="CONTENT">按内容量消耗</n-radio-button>
              <n-radio-button :disabled="!canConsumeByPackage" value="PACKAGE">按包装消耗</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <div v-if="consumptionForm.mode === 'PACKAGE'" class="inline-fields">
            <n-form-item label="包装数量">
              <n-input-number
                v-model:value="consumptionForm.packageQuantity"
                :min="0"
                :step="0.01"
                placeholder="0"
              />
            </n-form-item>
            <n-form-item label="包装单位">
              <n-input :value="selectedConsumptionBatch?.package_unit_name || ''" disabled />
            </n-form-item>
          </div>
          <div v-else class="inline-fields">
            <n-form-item label="内容量">
              <n-input-number
                v-model:value="consumptionForm.quantity"
                :min="0"
                :step="0.01"
                placeholder="0"
              />
            </n-form-item>
            <n-form-item label="单位">
              <n-select v-model:value="consumptionForm.unitId" :options="unitOptions" />
            </n-form-item>
          </div>
          <n-alert v-if="selectedConsumptionBatch && canConsumeByPackage" class="form-hint" :show-icon="false" type="info">
            当前包装：{{ packageSizeText(selectedConsumptionBatch) }}；剩余约
            {{ remainingPackageText(selectedConsumptionBatch, units) }}
          </n-alert>
          <n-form-item label="备注">
            <n-input v-model:value="consumptionForm.note" placeholder="例如：做晚饭用掉" type="textarea" />
          </n-form-item>
          <n-button attr-type="submit" block strong type="primary">保存消耗</n-button>
      </n-form>
    </AppPanel>

    <AppPanel title="正在消耗" description="来自状态为消耗中的消耗单。">
      <n-list v-if="openConsumptions.length > 0" class="record-list" hoverable>
        <n-list-item v-for="record in openConsumptions" :key="record.id">
          <div class="record-item">
            <strong>{{ record.item_name }}</strong>
            <span>{{ record.batch_label || "默认批次" }}</span>
            <small>
              {{ openConsumptionText(record) }} ·
              {{ record.location_snapshot || "未记录位置" }}
            </small>
          </div>
        </n-list-item>
      </n-list>
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

.record-item {
  display: grid;
  gap: 3px;
}

.record-item span,
.record-item small {
  color: #63717c;
}

@media (max-width: 980px) {
  .page-grid {
    grid-template-columns: 1fr;
  }
}
</style>
