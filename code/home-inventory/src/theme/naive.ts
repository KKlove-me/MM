import type { GlobalThemeOverrides } from "naive-ui";

export const naiveThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: "#25635d",
    primaryColorHover: "#1d4f4a",
    primaryColorPressed: "#173d39",
    primaryColorSuppl: "#2f766f",
    borderRadius: "6px",
    fontFamily:
      'Inter, "Microsoft YaHei", "PingFang SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  Button: {
    borderRadiusMedium: "6px",
    heightMedium: "42px",
    textColorText: "#25635d",
    textColorTextHover: "#173d39",
    textColorTextPressed: "#173d39",
  },
  Card: {
    borderRadius: "8px",
    color: "#fffdf9",
  },
};
