<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <n-card class="app-panel" :bordered="true">
    <template #header>
      <div class="panel-header">
        <div class="section-title">
          <h2>{{ title }}</h2>
          <p v-if="description">{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="panel-actions">
          <slot name="actions" />
        </div>
      </div>
    </template>
    <slot />
  </n-card>
</template>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

@media (max-width: 640px) {
  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
