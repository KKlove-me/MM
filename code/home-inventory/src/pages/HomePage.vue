<script setup lang="ts">
const entries = [
  { to: "/items", label: "新增物资" },
  { to: "/inventory", label: "录入库存" },
  { to: "/consumption", label: "记录消耗" },
  { to: "/alerts", label: "查看临期" },
];
</script>

<template>
  <section class="home-actions" aria-label="功能入口">
    <router-link v-for="entry in entries" :key="entry.to" v-slot="{ href, navigate }" custom :to="entry.to">
      <n-button tag="a" class="entry-link" :href="href" secondary strong type="primary" @click="navigate">
        {{ entry.label }}
      </n-button>
    </router-link>
  </section>
</template>

<style scoped>
.home-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.entry-link {
  width: 100%;
  min-height: 72px;
  text-decoration: none;
}

@media (max-width: 980px) {
  .home-actions {
    grid-template-columns: 1fr;
  }
}
</style>
