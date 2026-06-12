import type { App } from "vue";
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NConfigProvider,
  NDatePicker,
  NEmpty,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NList,
  NListItem,
  NPagination,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NStatistic,
  NTable,
  NTag,
} from "naive-ui";

const naiveComponents = [
  ["NAlert", NAlert],
  ["NButton", NButton],
  ["NCard", NCard],
  ["NCheckbox", NCheckbox],
  ["NConfigProvider", NConfigProvider],
  ["NDatePicker", NDatePicker],
  ["NEmpty", NEmpty],
  ["NForm", NForm],
  ["NFormItem", NFormItem],
  ["NGrid", NGrid],
  ["NGridItem", NGridItem],
  ["NInput", NInput],
  ["NInputNumber", NInputNumber],
  ["NList", NList],
  ["NListItem", NListItem],
  ["NPagination", NPagination],
  ["NRadioButton", NRadioButton],
  ["NRadioGroup", NRadioGroup],
  ["NSelect", NSelect],
  ["NSpace", NSpace],
  ["NStatistic", NStatistic],
  ["NTable", NTable],
  ["NTag", NTag],
] as const;

export function installNaive(app: App) {
  naiveComponents.forEach(([name, component]) => {
    app.component(name, component);
  });
}
