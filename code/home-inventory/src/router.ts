import { createRouter, createWebHashHistory } from "vue-router";
import AlertsPage from "./pages/AlertsPage.vue";
import ConsumptionPage from "./pages/ConsumptionPage.vue";
import HomePage from "./pages/HomePage.vue";
import InventoryPage from "./pages/InventoryPage.vue";
import ItemsPage from "./pages/ItemsPage.vue";

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
