import { createApp } from "vue";
import App from "./App.vue";
import { installNaive } from "./plugins/naive";
import router from "./router";
import "./styles.css";

const app = createApp(App);

installNaive(app);
app.use(router).mount("#app");
