declare module "vue" {
  export interface GlobalComponents {
    NButton: typeof import("naive-ui")["NButton"];
    NConfigProvider: typeof import("naive-ui")["NConfigProvider"];
  }
}

export {};
