declare module "vue" {
  export interface GlobalComponents {
    NAlert: typeof import("naive-ui")["NAlert"];
    NButton: typeof import("naive-ui")["NButton"];
    NCard: typeof import("naive-ui")["NCard"];
    NCheckbox: typeof import("naive-ui")["NCheckbox"];
    NConfigProvider: typeof import("naive-ui")["NConfigProvider"];
    NDatePicker: typeof import("naive-ui")["NDatePicker"];
    NEmpty: typeof import("naive-ui")["NEmpty"];
    NForm: typeof import("naive-ui")["NForm"];
    NFormItem: typeof import("naive-ui")["NFormItem"];
    NGrid: typeof import("naive-ui")["NGrid"];
    NGridItem: typeof import("naive-ui")["NGridItem"];
    NInput: typeof import("naive-ui")["NInput"];
    NInputNumber: typeof import("naive-ui")["NInputNumber"];
    NList: typeof import("naive-ui")["NList"];
    NListItem: typeof import("naive-ui")["NListItem"];
    NPagination: typeof import("naive-ui")["NPagination"];
    NRadioButton: typeof import("naive-ui")["NRadioButton"];
    NRadioGroup: typeof import("naive-ui")["NRadioGroup"];
    NSelect: typeof import("naive-ui")["NSelect"];
    NSpace: typeof import("naive-ui")["NSpace"];
    NStatistic: typeof import("naive-ui")["NStatistic"];
    NTable: typeof import("naive-ui")["NTable"];
    NTag: typeof import("naive-ui")["NTag"];
  }
}

export {};
