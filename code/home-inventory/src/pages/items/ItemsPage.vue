<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppPanel from "../../components/common/AppPanel.vue";
import type { Item } from "../../lib/db";

const props = defineProps<{
  items: Item[];
}>();

const page = ref(1);
const pageSize = 10;

const pagedItems = computed(() => {
  const start = (page.value - 1) * pageSize;
  return props.items.slice(start, start + pageSize);
});

watch(
  () => props.items.length,
  (itemCount) => {
    const maxPage = Math.max(1, Math.ceil(itemCount / pageSize));
    if (page.value > maxPage) {
      page.value = maxPage;
    }
  },
);
</script>

<template>
  <AppPanel title="物资清单" description="统一维护家庭物资的分类和默认计量单位。">
    <template #actions>
      <router-link v-slot="{ href, navigate }" custom to="/items/new">
        <n-button tag="a" :href="href" strong type="primary" @click="navigate">新增</n-button>
      </router-link>
    </template>

    <div class="table-wrap">
      <n-table :bordered="false" :single-line="false">
        <thead>
          <tr>
            <th>名称</th>
            <th>分类</th>
            <th>默认单位</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in pagedItems" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.category_name }}</td>
            <td>{{ item.unit_name }}</td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="3" class="empty">暂无物资，先新增一个。</td>
          </tr>
        </tbody>
      </n-table>
    </div>

    <div v-if="items.length > pageSize" class="pagination-row">
      <n-pagination v-model:page="page" :item-count="items.length" :page-size="pageSize" />
    </div>
  </AppPanel>
</template>

<style scoped>
.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
