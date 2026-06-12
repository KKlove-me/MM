<script setup lang="ts">
import AppPanel from "../../components/common/AppPanel.vue";
import EmptyState from "../../components/common/EmptyState.vue";
import type { StockBatch, Unit } from "../../lib/db";
import { batchRemainingText } from "../../lib/inventory-format";

defineProps<{
  expiringBatches: StockBatch[];
  units: Unit[];
}>();
</script>

<template>
  <AppPanel title="临期提醒" description="先按 7 天内临期做第一版提醒。">
    <n-list v-if="expiringBatches.length > 0" class="record-list" hoverable>
      <n-list-item v-for="batch in expiringBatches" :key="batch.id">
        <div class="record-item">
          <div class="record-heading">
            <strong>{{ batch.item_name }}</strong>
            <n-tag round size="small" type="warning">{{ batch.expiry_date || "无有效期" }}</n-tag>
          </div>
          <small>{{ batchRemainingText(batch, units) }} · {{ batch.location_name || "未记录位置" }}</small>
        </div>
      </n-list-item>
    </n-list>
    <EmptyState v-else text="暂无 7 天内临期物资。" />
  </AppPanel>
</template>

<style scoped>
.record-item {
  display: grid;
  gap: 6px;
}

.record-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.record-item small {
  color: #63717c;
}

@media (max-width: 560px) {
  .record-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
