<script setup lang="ts">
type OptionValue = number | string | null;

export interface OptionButtonOption {
  label: string;
  value: OptionValue;
  meta?: string;
  disabled?: boolean;
}

withDefaults(
  defineProps<{
    modelValue: OptionValue;
    options: OptionButtonOption[];
    variant?: "grid" | "segmented";
    compact?: boolean;
    dense?: boolean;
  }>(),
  {
    variant: "grid",
    compact: false,
    dense: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: OptionValue];
}>();

function selectOption(option: OptionButtonOption) {
  if (option.disabled) {
    return;
  }

  emit("update:modelValue", option.value);
}
</script>

<template>
  <div class="option-button-group" :class="[variant, { dense }]">
    <button
      v-for="option in options"
      :key="String(option.value)"
      class="option-button"
      :class="{ compact, selected: modelValue === option.value }"
      type="button"
      :disabled="option.disabled"
      @click="selectOption(option)"
    >
      <span>{{ option.label }}</span>
      <small v-if="option.meta">{{ option.meta }}</small>
    </button>
  </div>
</template>

<style scoped>
.option-button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
}

.option-button-group.grid {
  max-height: 150px;
  overflow: auto;
}

.option-button-group.grid.dense {
  max-height: 120px;
}

.option-button {
  display: inline-grid;
  gap: 1px;
  align-content: center;
  min-height: 34px;
  border: 1px solid #d8ccbd;
  border-radius: 7px;
  padding: 5px 10px;
  color: #30424f;
  background: white;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
}

.option-button.compact {
  min-height: 30px;
  padding: 4px 9px;
}

.option-button small {
  color: #7b8791;
  font-size: 11px;
  font-weight: 600;
}

.option-button:hover:not(:disabled) {
  border-color: #b9925d;
  background: #fff9ef;
}

.option-button.selected {
  border-color: #8a6532;
  color: #ffffff;
  background: #8a6532;
}

.option-button.selected small {
  color: #f8ead6;
}

.option-button:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}
</style>
