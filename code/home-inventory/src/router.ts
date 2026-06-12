import { createRouter, createWebHashHistory } from "vue-router";
import AlertsPage from "./pages/alerts/AlertsPage.vue";
import ConsumptionPage from "./pages/consumption/ConsumptionPage.vue";
import HomePage from "./pages/home/HomePage.vue";
import InventoryPage from "./pages/inventory/InventoryPage.vue";
import ItemsCreatePage from "./pages/items/ItemsCreatePage.vue";
import ItemsPage from "./pages/items/ItemsPage.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomePage,
    },
    {
      path: "/items",
      name: "items",
      component: ItemsPage,
    },
    {
      path: "/items/new",
      name: "items-new",
      component: ItemsCreatePage,
    },
    {
      path: "/inventory",
      name: "inventory",
      component: InventoryPage,
    },
    {
      path: "/consumption",
      name: "consumption",
      component: ConsumptionPage,
    },
    {
      path: "/alerts",
      name: "alerts",
      component: AlertsPage,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

export default router;
