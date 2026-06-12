<script setup lang="ts">
defineProps<{
  label: string;
  value: number;
  tone?: "warning";
}>();
</script>

<template>
  <n-card class="stat-card" :class="tone" :bordered="true">
    <n-statistic :label="label" :value="value" />
  </n-card>
</template>
