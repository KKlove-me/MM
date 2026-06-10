<script setup lang="ts">
import AppPanel from "../components/common/AppPanel.vue";
import EmptyState from "../components/common/EmptyState.vue";
import type { StockBatch, Unit } from "../lib/db";
import { batchRemainingText } from "../lib/inventory-format";

defineProps<{
  expiringBatches: StockBatch[];
  units: Unit[];
}>();
</script>

<template>
  <AppPanel title="临期提醒" description="先按 7 天内临期做第一版提醒。">
    <ul v-if="expiringBatches.length > 0" class="record-list">
      <li v-for="batch in expiringBatches" :key="batch.id">
        <strong>{{ batch.item_name }}</strong>
        <span>{{ batch.expiry_date || "无有效期" }}</span>
        <small>{{ batchRemainingText(batch, units) }} · {{ batch.location_name || "未记录位置" }}</small>
      </li>
    </ul>
    <EmptyState v-else text="暂无 7 天内临期物资。" />
  </AppPanel>
</template>
