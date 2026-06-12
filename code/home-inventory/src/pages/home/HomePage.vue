<script setup lang="ts">
const entries = [
  { to: "/items", label: "物资清单", description: "维护分类、默认单位和有效期策略" },
  { to: "/inventory", label: "录入库存", description: "按批次记录品牌、规格、位置和包装" },
  { to: "/consumption", label: "记录消耗", description: "扣减库存或标记已开封物资" },
  { to: "/alerts", label: "查看临期", description: "集中查看即将到期的批次" },
];
</script>

<template>
  <n-grid class="home-actions" :cols="4" :x-gap="12" :y-gap="12" responsive="screen">
    <n-grid-item v-for="entry in entries" :key="entry.to">
      <router-link v-slot="{ href, navigate }" custom :to="entry.to">
        <n-card class="entry-card" hoverable :bordered="true" @click="navigate">
          <a class="entry-link" :href="href" @click="navigate">
            <strong>{{ entry.label }}</strong>
            <span>{{ entry.description }}</span>
          </a>
        </n-card>
      </router-link>
    </n-grid-item>
  </n-grid>
</template>

<style scoped>
.home-actions {
  margin-top: 2px;
}

.entry-card {
  min-height: 122px;
  cursor: pointer;
}

.entry-card :deep(.n-card__content) {
  height: 100%;
}

.entry-link {
  display: grid;
  gap: 8px;
  width: 100%;
  min-height: 82px;
  color: inherit;
  text-decoration: none;
}

.entry-link strong {
  color: #173d39;
  font-size: 18px;
}

.entry-link span {
  color: #63717c;
  font-size: 13px;
}
</style>
