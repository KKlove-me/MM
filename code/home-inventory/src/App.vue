<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import NoticeMessage from "./components/common/NoticeMessage.vue";
import StatCard from "./components/common/StatCard.vue";
import AlertsPage from "./pages/AlertsPage.vue";
import ConsumptionPage from "./pages/ConsumptionPage.vue";
import InventoryPage from "./pages/InventoryPage.vue";
import ItemsPage from "./pages/ItemsPage.vue";
import {
  loadDashboardStats,
  loadOpenConsumptions,
  loadReferenceData,
  loadStockBatches,
  type Category,
  type DashboardStats,
  type Item,
  type Location,
  type OpenConsumption,
  type StockBatch,
  type Unit,
} from "./lib/db";
import { activeStockBatches, expiringStockBatches } from "./lib/inventory-derived";

type PageKey = "dashboard" | "items" | "inventory" | "consumption" | "alerts";

const navItems: Array<{ key: PageKey; label: string }> = [
  { key: "dashboard", label: "看板" },
  { key: "items", label: "物资" },
  { key: "inventory", label: "库存" },
  { key: "consumption", label: "消耗" },
  { key: "alerts", label: "临期" },
];

const categories = ref<Category[]>([]);
const units = ref<Unit[]>([]);
const locations = ref<Location[]>([]);
const items = ref<Item[]>([]);
const stockBatches = ref<StockBatch[]>([]);
const openConsumptions = ref<OpenConsumption[]>([]);
const stats = ref<DashboardStats>({
  item_count: 0,
  batch_count: 0,
  open_count: 0,
  expiring_count: 0,
});
const activePage = ref<PageKey>("dashboard");
const isLoading = ref(true);
const message = ref("");
const errorMessage = ref("");

const availableStockBatches = computed(() => activeStockBatches(stockBatches.value));
const expiringBatches = computed(() => expiringStockBatches(stockBatches.value));

async function refreshData() {
  const [reference, nextStats, batches, openRecords] = await Promise.all([
    loadReferenceData(),
    loadDashboardStats(),
    loadStockBatches(),
    loadOpenConsumptions(),
  ]);

  categories.value = reference.categories;
  units.value = reference.units;
  locations.value = reference.locations;
  items.value = reference.items;
  stats.value = nextStats;
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
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Home Inventory</p>
        <h1>家庭物资管理</h1>
      </div>
      <button type="button" class="ghost-button" @click="refreshData">刷新</button>
    </header>

    <section class="stats-grid" aria-label="库存概览">
      <StatCard label="物资种类" :value="stats.item_count" />
      <StatCard label="可用批次" :value="stats.batch_count" />
      <StatCard label="正在消耗" :value="stats.open_count" />
      <StatCard label="7 天内临期" :value="stats.expiring_count" tone="warning" />
    </section>

    <nav class="action-nav" aria-label="功能导航">
      <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        :class="{ active: activePage === item.key }"
        @click="activePage = item.key"
      >
        {{ item.label }}
      </button>
    </nav>

    <NoticeMessage :message="message" tone="success" />
    <NoticeMessage :message="errorMessage" tone="error" />
    <NoticeMessage v-if="isLoading" message="正在连接本地 SQLite 数据库..." />

    <section v-if="activePage === 'dashboard'" class="dashboard-actions">
      <button type="button" @click="activePage = 'items'">新增物资</button>
      <button type="button" @click="activePage = 'inventory'">录入库存</button>
      <button type="button" @click="activePage = 'consumption'">记录消耗</button>
      <button type="button" @click="activePage = 'alerts'">查看临期</button>
    </section>

    <ItemsPage
      v-else-if="activePage === 'items'"
      :categories="categories"
      :units="units"
      @saved="handleSaved"
      @error="handleError"
    />
    <InventoryPage
      v-else-if="activePage === 'inventory'"
      :items="items"
      :locations="locations"
      :stock-batches="stockBatches"
      :units="units"
      @saved="handleSaved"
      @error="handleError"
    />
    <ConsumptionPage
      v-else-if="activePage === 'consumption'"
      :active-stock-batches="availableStockBatches"
      :open-consumptions="openConsumptions"
      :units="units"
      @saved="handleSaved"
      @error="handleError"
    />
    <AlertsPage v-else :expiring-batches="expiringBatches" :units="units" />
  </main>
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

.ghost-button {
  width: 72px;
  color: #25635d;
  border: 1px solid #9bb8b3;
  background: transparent;
}

.ghost-button:hover {
  color: #173d39;
  background: #e8f0ed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.action-nav,
.dashboard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.action-nav button,
.dashboard-actions button {
  min-width: 96px;
  padding: 0 14px;
}

.action-nav button {
  color: #25635d;
  border: 1px solid #9bb8b3;
  background: #fffdf9;
}

.action-nav button:hover,
.action-nav button.active {
  color: white;
  background: #25635d;
}

.dashboard-actions {
  border: 1px solid #ddd5c8;
  border-radius: 8px;
  padding: 16px;
  background: #fffdf9;
}

@media (max-width: 980px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .app-shell {
    padding: 18px;
  }
}
</style>
