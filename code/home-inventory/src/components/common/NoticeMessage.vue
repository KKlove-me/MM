<script setup lang="ts">
defineProps<{
  message: string;
  tone?: "success" | "error" | "neutral";
}>();
</script>

<template>
  <p v-if="message" class="notice" :class="tone">{{ message }}</p>
</template>
