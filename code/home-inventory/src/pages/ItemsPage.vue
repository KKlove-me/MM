<script setup lang="ts">
import { reactive } from "vue";
import AppPanel from "../components/common/AppPanel.vue";
import { createItem, type Category, type Unit } from "../lib/db";

defineProps<{
  categories: Category[];
  units: Unit[];
}>();

const emit = defineEmits<{
  saved: [message: string];
  error: [message: string];
}>();

const itemForm = reactive({
  name: "",
  categoryId: 101,
  defaultUnitId: 10,
  enableExpiry: true,
});

async function submitItem() {
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
</script>

<template>
  <AppPanel title="新增通用物资" description="用于把不同品牌和规格归并到同一统计口径。">
    <form class="form-grid" @submit.prevent="submitItem">
      <label>
        名称
        <input v-model="itemForm.name" placeholder="例如：面粉" />
      </label>
      <label>
        分类
        <select v-model.number="itemForm.categoryId">
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </label>
      <label>
        默认单位
        <select v-model.number="itemForm.defaultUnitId">
          <option v-for="unit in units" :key="unit.id" :value="unit.id">
            {{ unit.name }}
          </option>
        </select>
      </label>
      <label class="checkbox-line">
        <input v-model="itemForm.enableExpiry" type="checkbox" />
        启用有效期
      </label>
      <button type="submit">保存物资</button>
    </form>
  </AppPanel>
</template>
