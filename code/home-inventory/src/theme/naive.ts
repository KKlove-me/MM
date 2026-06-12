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
    borderColor: "#ddd5c8",
    titleFontWeight: "800",
  },
  Form: {
    labelFontWeight: "700",
    labelTextColor: "#394652",
  },
  Input: {
    border: "1px solid #c9c3b8",
    borderHover: "1px solid #25635d",
    borderFocus: "1px solid #25635d",
    boxShadowFocus: "0 0 0 2px rgba(37, 99, 93, 0.16)",
  },
  Select: {
    peers: {
      InternalSelection: {
        border: "1px solid #c9c3b8",
        borderHover: "1px solid #25635d",
        borderActive: "1px solid #25635d",
        boxShadowActive: "0 0 0 2px rgba(37, 99, 93, 0.16)",
      },
    },
  },
  Tag: {
    borderRadius: "999px",
  },
};
