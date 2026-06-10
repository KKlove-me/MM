<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>

<template>
  <p class="empty-list">{{ text }}</p>
</template>
