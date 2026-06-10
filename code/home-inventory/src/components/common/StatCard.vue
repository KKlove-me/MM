<script setup lang="ts">
defineProps<{
  label: string;
  value: number;
  tone?: "warning";
}>();
</script>

<template>
  <article class="stat-card" :class="tone">
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
  </article>
</template>
