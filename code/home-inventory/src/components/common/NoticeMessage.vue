<script setup lang="ts">
defineProps<{
  message: string;
  tone?: "success" | "error" | "neutral";
}>();
</script>

<template>
  <n-alert
    v-if="message"
    class="notice"
    :show-icon="false"
    :type="tone === 'error' ? 'error' : tone === 'success' ? 'success' : 'default'"
  >
    {{ message }}
  </n-alert>
</template>
