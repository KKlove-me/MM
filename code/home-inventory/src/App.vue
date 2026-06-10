<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  createConsumption,
  createItem,
  createStockBatch,
  loadDashboardStats,
  loadOpenConsumptions,
  loadReferenceData,
  loadStockBatches,
  type DashboardStats,
  type Item,
  type Location,
  type OpenConsumption,
  type StockBatch,
  type Unit,
} from "./lib/db";

const categories = ref<Array<{ id: number; name: string; parent_id: number | null }>>([]);
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
const isLoading = ref(true);
const message = ref("");
const errorMessage = ref("");

const itemForm = reactive({
  name: "",
  categoryId: 101,
  defaultUnitId: 10,
  enableExpiry: true,
});

const stockForm = reactive({
  itemId: 1,
  brand: "",
  spec: "",
  quantity: 500,
  unitId: 10,
  expiryDate: "",
  locationId: 4 as number | null,
  note: "",
});

const consumptionForm = reactive({
  stockBatchId: 0,
  consumptionType: "PARTIAL" as "ONCE" | "PARTIAL" | "CONTINUOUS",
  status: "COMPLETED" as "IN_PROGRESS" | "COMPLETED",
  quantity: 1 as number | null,
  note: "",
});

const activeStockBatches = computed(() =>
  stockBatches.value.filter((batch) => batch.status === "NORMAL" && batch.current_quantity > 0),
);

const expiringBatches = computed(() =>
  activeStockBatches.value.filter((batch) => {
    if (!batch.expiry_date) {
      return false;
    }

    const today = new Date();
    const expiry = new Date(`${batch.expiry_date}T00:00:00`);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
    return diffDays <= 7;
  }),
);

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

  if (!stockForm.itemId && reference.items[0]) {
    stockForm.itemId = reference.items[0].id;
  }

  if (!stockForm.unitId && reference.units[0]) {
    stockForm.unitId = reference.units[0].id;
  }

  if (!consumptionForm.stockBatchId && batches[0]) {
    consumptionForm.stockBatchId = batches[0].id;
  }
}

async function runAction(action: () => Promise<void>, success: string) {
  message.value = "";
  errorMessage.value = "";

  try {
    await action();
    await refreshData();
    message.value = success;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  }
}

async function submitItem() {
  if (!itemForm.name.trim()) {
    errorMessage.value = "请填写物资名称";
    return;
  }

  await runAction(async () => {
    await createItem({
      name: itemForm.name,
      categoryId: itemForm.categoryId,
      defaultUnitId: itemForm.defaultUnitId,
      enableExpiry: itemForm.enableExpiry,
    });
    itemForm.name = "";
  }, "已新增通用物资");
}

async function submitStockBatch() {
  if (!stockForm.itemId || stockForm.quantity <= 0) {
    errorMessage.value = "请选择物资并填写大于 0 的数量";
    return;
  }

  await runAction(async () => {
    await createStockBatch({ ...stockForm });
    stockForm.brand = "";
    stockForm.spec = "";
    stockForm.note = "";
    stockForm.expiryDate = "";
  }, "已录入库存批次");
}

async function submitConsumption() {
  if (!consumptionForm.stockBatchId) {
    errorMessage.value = "请选择库存批次";
    return;
  }

  await runAction(async () => {
    await createConsumption({ ...consumptionForm });
    consumptionForm.note = "";
  }, consumptionForm.status === "IN_PROGRESS" ? "已标记为消耗中" : "已记录消耗");
}

function batchTitle(batch: StockBatch) {
  const detail = [batch.brand, batch.spec].filter(Boolean).join(" ");
  return detail ? `${batch.item_name} - ${detail}` : batch.item_name;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    NORMAL: "正常",
    DEPLETED: "耗尽",
    EXPIRED: "过期",
    DISCARDED: "废弃",
  };
  return labels[status] ?? status;
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
      <article class="stat-card">
        <span>物资种类</span>
        <strong>{{ stats.item_count }}</strong>
      </article>
      <article class="stat-card">
        <span>可用批次</span>
        <strong>{{ stats.batch_count }}</strong>
      </article>
      <article class="stat-card">
        <span>正在消耗</span>
        <strong>{{ stats.open_count }}</strong>
      </article>
      <article class="stat-card warning">
        <span>7 天内临期</span>
        <strong>{{ stats.expiring_count }}</strong>
      </article>
    </section>

    <p v-if="message" class="notice success">{{ message }}</p>
    <p v-if="errorMessage" class="notice error">{{ errorMessage }}</p>
    <p v-if="isLoading" class="notice">正在连接本地 SQLite 数据库...</p>

    <section class="workspace">
      <div class="input-column">
        <section class="panel">
          <div class="section-title">
            <h2>新增通用物资</h2>
            <p>用于把不同品牌和规格归并到同一统计口径。</p>
          </div>
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
        </section>

        <section class="panel">
          <div class="section-title">
            <h2>录入库存</h2>
            <p>每次入库形成一个批次，品牌、规格、位置可以不同。</p>
          </div>
          <form class="form-grid" @submit.prevent="submitStockBatch">
            <label>
              物资
              <select v-model.number="stockForm.itemId">
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.name }} / {{ item.category_name }}
                </option>
              </select>
            </label>
            <label>
              品牌
              <input v-model="stockForm.brand" placeholder="可选" />
            </label>
            <label>
              规格
              <input v-model="stockForm.spec" placeholder="例如：500g/袋" />
            </label>
            <div class="inline-fields">
              <label>
                数量
                <input v-model.number="stockForm.quantity" min="0" step="0.01" type="number" />
              </label>
              <label>
                单位
                <select v-model.number="stockForm.unitId">
                  <option v-for="unit in units" :key="unit.id" :value="unit.id">
                    {{ unit.name }}
                  </option>
                </select>
              </label>
            </div>
            <label>
              有效期
              <input v-model="stockForm.expiryDate" type="date" />
            </label>
            <label>
              位置
              <select v-model.number="stockForm.locationId">
                <option :value="null">暂不记录</option>
                <option v-for="location in locations" :key="location.id" :value="location.id">
                  {{ location.path_name }}
                </option>
              </select>
            </label>
            <label>
              备注
              <textarea v-model="stockForm.note" rows="2" placeholder="可选" />
            </label>
            <button type="submit">保存库存</button>
          </form>
        </section>

        <section class="panel">
          <div class="section-title">
            <h2>记录消耗 / 开封</h2>
            <p>已完成会扣减库存；消耗中用于管理已开封。</p>
          </div>
          <form class="form-grid" @submit.prevent="submitConsumption">
            <label>
              批次
              <select v-model.number="consumptionForm.stockBatchId">
                <option v-for="batch in activeStockBatches" :key="batch.id" :value="batch.id">
                  {{ batchTitle(batch) }}，剩余 {{ batch.current_quantity }} {{ batch.unit_name }}
                </option>
              </select>
            </label>
            <label>
              类型
              <select v-model="consumptionForm.consumptionType">
                <option value="ONCE">一次性</option>
                <option value="PARTIAL">部分消耗</option>
                <option value="CONTINUOUS">持续消耗</option>
              </select>
            </label>
            <label>
              状态
              <select v-model="consumptionForm.status">
                <option value="COMPLETED">已完成并扣减</option>
                <option value="IN_PROGRESS">消耗中 / 已开封</option>
              </select>
            </label>
            <label>
              数量
              <input v-model.number="consumptionForm.quantity" min="0" step="0.01" type="number" />
            </label>
            <label>
              备注
              <textarea v-model="consumptionForm.note" rows="2" placeholder="例如：做晚饭用掉" />
            </label>
            <button type="submit">保存消耗</button>
          </form>
        </section>
      </div>

      <div class="data-column">
        <section class="panel">
          <div class="section-title">
            <h2>当前库存批次</h2>
            <p>按状态、有效期和录入时间排序。</p>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>物资</th>
                  <th>批次</th>
                  <th>剩余</th>
                  <th>位置</th>
                  <th>有效期</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="batch in stockBatches" :key="batch.id">
                  <td>{{ batch.item_name }}</td>
                  <td>{{ [batch.brand, batch.spec].filter(Boolean).join(" ") || "默认批次" }}</td>
                  <td>{{ batch.current_quantity }} {{ batch.unit_name }}</td>
                  <td>{{ batch.location_name || "未记录" }}</td>
                  <td>{{ batch.expiry_date || "无" }}</td>
                  <td>
                    <span class="pill">{{ statusLabel(batch.status) }}</span>
                  </td>
                </tr>
                <tr v-if="stockBatches.length === 0">
                  <td colspan="6" class="empty">还没有库存，先录入一个批次。</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="split-row">
          <article class="panel">
            <div class="section-title">
              <h2>正在消耗</h2>
              <p>来自状态为消耗中的消耗单。</p>
            </div>
            <ul class="record-list">
              <li v-for="record in openConsumptions" :key="record.id">
                <strong>{{ record.item_name }}</strong>
                <span>{{ record.batch_label || "默认批次" }}</span>
                <small>
                  {{ record.planned_quantity ?? "未估算" }} {{ record.unit_name }} ·
                  {{ record.location_snapshot || "未记录位置" }}
                </small>
              </li>
              <li v-if="openConsumptions.length === 0" class="empty-list">
                暂无已开封或消耗中的物资。
              </li>
            </ul>
          </article>

          <article class="panel">
            <div class="section-title">
              <h2>临期提醒</h2>
              <p>先按 7 天内临期做第一版提醒。</p>
            </div>
            <ul class="record-list">
              <li v-for="batch in expiringBatches" :key="batch.id">
                <strong>{{ batch.item_name }}</strong>
                <span>{{ batch.expiry_date || "无有效期" }}</span>
                <small>{{ batch.current_quantity }} {{ batch.unit_name }} · {{ batch.location_name || "未记录位置" }}</small>
              </li>
              <li v-if="expiringBatches.length === 0" class="empty-list">
                暂无 7 天内临期物资。
              </li>
            </ul>
          </article>
        </section>
      </div>
    </section>
  </main>
</template>

<style>
:root {
  color: #1f2933;
  background: #f4f1eb;
  font-family:
    Inter, "Microsoft YaHei", "PingFang SC", system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.5;
  font-weight: 400;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  min-height: 42px;
  border: 0;
  border-radius: 6px;
  color: white;
  background: #25635d;
  cursor: pointer;
}

button:hover {
  background: #1d4f4a;
}

input,
select,
textarea {
  width: 100%;
  min-height: 40px;
  border: 1px solid #c9c3b8;
  border-radius: 6px;
  padding: 8px 10px;
  color: #1f2933;
  background: #fffdf9;
}

textarea {
  resize: vertical;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid #e2ddd3;
  padding: 10px 8px;
  text-align: left;
  vertical-align: top;
}

th {
  color: #53606b;
  font-size: 13px;
  font-weight: 700;
}
</style>

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

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 30px;
  line-height: 1.2;
}

h2 {
  font-size: 18px;
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

.stat-card {
  min-height: 94px;
  border: 1px solid #ddd5c8;
  border-radius: 8px;
  padding: 16px;
  background: #fffdf9;
}

.stat-card span {
  display: block;
  color: #53606b;
  font-size: 13px;
}

.stat-card strong {
  display: block;
  margin-top: 8px;
  font-size: 30px;
  line-height: 1;
}

.stat-card.warning strong {
  color: #b45309;
}

.notice {
  border: 1px solid #d8d0c3;
  border-radius: 8px;
  margin: 12px 0;
  padding: 10px 12px;
  background: #fffdf9;
}

.notice.success {
  color: #14532d;
  border-color: #9ec8aa;
  background: #eef8f0;
}

.notice.error {
  color: #991b1b;
  border-color: #e3aaa7;
  background: #fff1f0;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.input-column,
.data-column {
  display: grid;
  gap: 16px;
}

.panel {
  border: 1px solid #ddd5c8;
  border-radius: 8px;
  padding: 16px;
  background: #fffdf9;
}

.section-title {
  margin-bottom: 14px;
}

.section-title p {
  margin-top: 4px;
  color: #63717c;
  font-size: 13px;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.form-grid label {
  display: grid;
  gap: 6px;
  color: #394652;
  font-size: 13px;
  font-weight: 700;
}

.inline-fields {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 10px;
}

.checkbox-line {
  grid-template-columns: 18px 1fr;
  align-items: center;
}

.checkbox-line input {
  min-height: auto;
}

.table-wrap {
  overflow-x: auto;
}

.pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 2px 9px;
  color: #25635d;
  background: #e8f0ed;
  font-size: 12px;
  font-weight: 700;
}

.split-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.record-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.record-list li {
  display: grid;
  gap: 2px;
  border-bottom: 1px solid #e8e1d7;
  padding-bottom: 10px;
}

.record-list span,
.record-list small {
  color: #63717c;
}

.empty,
.empty-list {
  color: #7b8791;
}

@media (max-width: 980px) {
  .stats-grid,
  .workspace,
  .split-row {
    grid-template-columns: 1fr;
  }

  .app-shell {
    padding: 18px;
  }
}
</style>
