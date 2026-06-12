<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import AppPanel from "../../components/common/AppPanel.vue";
import { createItem } from "../../lib/db";
import type { Category, Unit } from "../../lib/db";

const props = defineProps<{
  categories: Category[];
  units: Unit[];
}>();

const emit = defineEmits<{
  saved: [message: string];
  error: [message: string];
}>();

const itemForm = reactive({
  name: "",
  categoryId: 0,
  defaultUnitId: 0,
  enableExpiry: true,
});

const categoryOptions = computed(() =>
  props.categories.map((category) => ({
    label: category.name,
    value: category.id,
  })),
);

const unitOptions = computed(() =>
  props.units.map((unit) => ({
    label: unit.name,
    value: unit.id,
  })),
);

const canSubmitItem = computed(() => props.categories.length > 0 && props.units.length > 0);

function syncReferenceSelection() {
  const selectedCategoryExists = props.categories.some(
    (category) => category.id === itemForm.categoryId,
  );
  const selectedUnitExists = props.units.some((unit) => unit.id === itemForm.defaultUnitId);

  if (!selectedCategoryExists) {
    itemForm.categoryId = props.categories[0]?.id ?? 0;
  }

  if (!selectedUnitExists) {
    itemForm.defaultUnitId =
      props.units.find((unit) => unit.id === 10)?.id ?? props.units[0]?.id ?? 0;
  }
}

async function submitItem() {
  syncReferenceSelection();

  if (!canSubmitItem.value || !itemForm.categoryId || !itemForm.defaultUnitId) {
    emit("error", "分类和单位还没有加载完成，请稍后再试");
    return;
  }

  if (!itemForm.name.trim()) {
    emit("error", "请填写物资名称");
    return;
  }

  try {
    await createItem({
      name: itemForm.name,
      categoryId: itemForm.categoryId,
      defaultUnitId: itemForm.defaultUnitId,
      enableExpiry: itemForm.enableExpiry,
    });
    itemForm.name = "";
    emit("saved", "已新增通用物资");
  } catch (error) {
    emit("error", error instanceof Error ? error.message : String(error));
  }
}

watch(
  () => [props.categories, props.units],
  () => syncReferenceSelection(),
  { immediate: true },
);
</script>

<template>
  <AppPanel title="新增通用物资" description="用于把不同品牌和规格归并到同一统计口径。">
    <template #actions>
      <router-link v-slot="{ href, navigate }" custom to="/items">
        <n-button tag="a" :href="href" secondary strong @click="navigate">返回清单</n-button>
      </router-link>
    </template>

    <n-form class="form-grid" label-placement="top" @submit.prevent="submitItem">
      <n-form-item label="名称">
        <n-input v-model:value="itemForm.name" placeholder="例如：面粉" />
      </n-form-item>
      <n-form-item label="分类">
        <n-select v-model:value="itemForm.categoryId" :options="categoryOptions" />
      </n-form-item>
      <n-form-item label="默认单位">
        <n-select v-model:value="itemForm.defaultUnitId" :options="unitOptions" />
      </n-form-item>
      <n-form-item :show-label="false">
        <n-checkbox v-model:checked="itemForm.enableExpiry">启用有效期</n-checkbox>
      </n-form-item>
      <n-button attr-type="submit" block strong type="primary" :disabled="!canSubmitItem">
        保存物资
      </n-button>
    </n-form>
  </AppPanel>
</template>
