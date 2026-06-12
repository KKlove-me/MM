<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>

<template>
  <n-empty class="empty-list" :description="text" size="small" />
</template>
