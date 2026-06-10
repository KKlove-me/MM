# 家庭物资管理系统

本项目是家庭物资管理系统的第一版桌面端骨架，技术栈为 Vue 3 + Tauri 2 + SQLite。

## 已实现

- Vue 3 + TypeScript + Vite 前端骨架。
- Tauri 2 桌面端骨架。
- `tauri-plugin-sql` SQLite 插件接入。
- SQLite 初始迁移：
  - 分类 `categories`
  - 单位 `units`
  - 位置 `locations`
  - 通用物资 `items`
  - 库存批次 `stock_batches`
  - 消耗单 `consumption_records`
- 默认分类、单位、位置和示例通用物资。
- 第一版工作台：
  - 新增通用物资
  - 录入库存批次
  - 记录已完成消耗
  - 标记消耗中/已开封
  - 查看库存批次
  - 查看正在消耗
  - 查看 7 天内临期提醒

## 开发命令

首次进入项目后安装依赖：

```powershell
pnpm install
```

启动桌面端开发环境：

```powershell
$env:Path="$env:USERPROFILE\.cargo\bin;$env:Path"
pnpm tauri dev
```

只检查前端构建：

```powershell
pnpm build
```

检查 Rust/Tauri 侧：

```powershell
$env:Path="$env:USERPROFILE\.cargo\bin;$env:Path"
cd src-tauri
cargo check
```

## 说明

- SQLite 数据库连接名为 `sqlite:home_inventory.db`。
- 数据库文件由 Tauri SQL 插件放在应用数据目录中，不在项目源码目录内。
- 如果新终端里能直接运行 `cargo --version`，可以省略临时追加 `$env:Path` 的命令。
