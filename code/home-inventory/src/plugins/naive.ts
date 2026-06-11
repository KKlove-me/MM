import type { App } from "vue";
import { NButton, NConfigProvider } from "naive-ui";

const naiveComponents = [
  ["NButton", NButton],
  ["NConfigProvider", NConfigProvider],
] as const;

export function installNaive(app: App) {
  naiveComponents.forEach(([name, component]) => {
    app.component(name, component);
  });
}
