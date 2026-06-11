<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from "vue";
import NoticeMessage from "./components/common/NoticeMessage.vue";
import {
  loadOpenConsumptions,
  loadReferenceData,
  loadStockBatches,
} from "./lib/db";
import type {
  Category,
  Item,
  Location,
  OpenConsumption,
  StockBatch,
  Unit,
} from "./lib/db";
import { activeStockBatches, expiringStockBatches } from "./lib/inventory-derived";
import { naiveThemeOverrides } from "./theme/naive";

const navItems = [
  { to: "/", label: "首页" },
  { to: "/items", label: "物资" },
  { to: "/inventory", label: "库存" },
  { to: "/consumption", label: "消耗" },
  { to: "/alerts", label: "临期" },
];

const categories = shallowRef<Category[]>([]);
const units = shallowRef<Unit[]>([]);
const locations = shallowRef<Location[]>([]);
const items = shallowRef<Item[]>([]);
const stockBatches = shallowRef<StockBatch[]>([]);
const openConsumptions = shallowRef<OpenConsumption[]>([]);
const isLoading = ref(true);
const message = ref("");
const errorMessage = ref("");

const availableStockBatches = computed(() => activeStockBatches(stockBatches.value));
const expiringBatches = computed(() => expiringStockBatches(stockBatches.value));

async function refreshData() {
  const referencePromise = loadReferenceData();
  const batchesPromise = loadStockBatches();
  const openRecordsPromise = loadOpenConsumptions();

  const reference = await referencePromise;
  const batches = await batchesPromise;
  const openRecords = await openRecordsPromise;

  categories.value = reference.categories;
  units.value = reference.units;
  locations.value = reference.locations;
  items.value = reference.items;
  stockBatches.value = batches;
  openConsumptions.value = openRecords;
}

async function handleSaved(successMessage: string) {
  message.value = "";
  errorMessage.value = "";
  await refreshData();
  message.value = successMessage;
}

function handleError(nextError: string) {
  message.value = "";
  errorMessage.value = nextError;
}

onMounted(async () => {
  try {
    await refreshData();
  } catch (error) {
    errorMessage.value =
      "数据库初始化失败。请确认正在通过 `pnpm tauri dev` 运行桌面端，而不是单独打开浏览器。";
    console.error(error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <n-config-provider :theme-overrides="naiveThemeOverrides">
    <main class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Home Inventory</p>
          <h1>家庭物资管理</h1>
        </div>
        <n-button secondary strong type="primary" @click="refreshData">刷新</n-button>
      </header>

      <nav class="action-nav" aria-label="功能导航">
        <router-link v-for="item in navItems" :key="item.to" v-slot="{ href, navigate, isExactActive }" custom :to="item.to">
          <n-button
            tag="a"
            :href="href"
            :secondary="!isExactActive"
            strong
            :type="isExactActive ? 'primary' : 'default'"
            @click="navigate"
          >
            {{ item.label }}
          </n-button>
        </router-link>
      </nav>

      <NoticeMessage :message="message" tone="success" />
      <NoticeMessage :message="errorMessage" tone="error" />
      <NoticeMessage v-if="isLoading" message="正在连接本地 SQLite 数据库..." />

      <router-view v-slot="{ Component, route }">
        <component
          :is="Component"
          v-if="route.name === 'items'"
          :categories="categories"
          :units="units"
          @error="handleError"
          @saved="handleSaved"
        />
        <component
          :is="Component"
          v-else-if="route.name === 'inventory'"
          :items="items"
          :locations="locations"
          :stock-batches="stockBatches"
          :units="units"
          @error="handleError"
          @saved="handleSaved"
        />
        <component
          :is="Component"
          v-else-if="route.name === 'consumption'"
          :active-stock-batches="availableStockBatches"
          :open-consumptions="openConsumptions"
          :units="units"
          @error="handleError"
          @saved="handleSaved"
        />
        <component
          :is="Component"
          v-else-if="route.name === 'alerts'"
          :expiring-batches="expiringBatches"
          :units="units"
        />
        <component :is="Component" v-else />
      </router-view>
    </main>
  </n-config-provider>
</template>

<style scoped>
.app-shell {
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 28px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #7a5c2f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.action-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

@media (max-width: 980px) {
  .app-shell {
    padding: 18px;
  }
}
</style>
