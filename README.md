# MyCursor

[![Build and Release](https://github.com/h88782481/MyCursor/actions/workflows/build-public.yml/badge.svg)](https://github.com/h88782481/MyCursor/actions/workflows/build-public.yml)
[![GitHub release](https://img.shields.io/github/v/release/h88782481/MyCursor)](https://github.com/h88782481/MyCursor/releases)

Cursor IDE 账户与 Machine ID 管理工具，免安装单文件运行，单实例。

## 功能

### Machine ID 管理
- 查看、备份、恢复、重置 Machine ID
- 完全重置（含 main.js / workbench.js 修改）
- 自定义 Cursor 路径配置（Windows）
- 禁用 / 恢复 Cursor 自动更新

### 多账户管理
- 添加 / 编辑 / 切换 / 删除账户
- 切换时可选：使用绑定机器码 / 生成新机器码 / 不操作机器码
- 账户自动绑定当前机器码，支持手动编辑
- 导入导出账户，批量刷新
- 标签分组，按标签和订阅类型动态筛选

### 使用量统计
- 查看账户用量、消费明细、模型调用记录
- 支持聚合用量、用户分析、事件明细

### 其他
- 查看绑卡 / 订阅信息（内置浏览器打开 Stripe 管理页）
- 打开 Cursor 主页（内置浏览器，自动注入 Cookie 登录）
- 注销 Cursor 账户（调用官方 API）
- Windows 多用户同步（将当前账号同步到其他 Windows 用户的 Cursor）

## 下载使用

从 [Releases](https://github.com/h88782481/MyCursor/releases) 页面下载：

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `MyCursor.exe` | 免安装，双击直接运行 |
| macOS | `MyCursor_*.dmg` | 拖入 Applications 即可 |
| Linux | `mycursor_*.AppImage` / `.deb` | AppImage 免安装 |

### 数据存储

| 平台 | 路径 |
|------|------|
| Windows | exe 同级 `cursor_data/` |
| macOS / Linux | `~/.cursor_data/` |

数据目录包含：`account_cache.json`（账户）、`usage_data.json`（用量）、`events_data.json`（事件）、`config.json`（配置）、`logs/`（日志）

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 后端 | Rust + Tauri 2 |
| 图表 | Recharts |
| 虚拟滚动 | react-window |

## 本地开发

```bash
npm install        # 安装依赖
npm run tauri:dev  # 开发模式
npm run tauri:build # 构建
npm run lint       # 代码检查
npm run format     # 格式化
```

环境要求：Node.js >= 18、Rust >= 1.70

## 项目结构

```
MyCursor/
├── src/                        # React 前端
│   ├── components/             # UI 组件
│   ├── pages/                  # 页面
│   ├── services/               # 服务层
│   ├── hooks/                  # 自定义 Hooks
│   ├── types/                  # TypeScript 类型
│   ├── context/                # React Context
│   ├── styles/                 # 全局样式
│   └── utils/                  # 工具函数
├── src-tauri/                  # Tauri Rust 后端
│   └── src/
│       ├── lib.rs              # Tauri 命令
│       ├── account_manager.rs  # 账户管理
│       ├── auth_checker.rs     # 认证 & 使用量查询
│       ├── machine_id.rs       # Machine ID 操作
│       └── logger.rs           # 日志系统
├── .github/workflows/          # CI/CD（tag 触发自动构建发布）
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

## 许可证

本项目基于 **MIT License** 开源，完整条款见仓库根目录的 `LICENSE.txt` 文件。

