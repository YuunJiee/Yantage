# Yantage — Developer Guide

## Project Overview

**Yantage** is a self-hosted personal finance dashboard — minimalist, single-page, zh-TW only.
- **Backend**: FastAPI + SQLAlchemy + SQLite (`backend/`)
- **Frontend**: Next.js 19 + TypeScript + Tailwind (`frontend/`)
- **Deployment**: Docker Compose (`docker-compose.yml`)
- **Data stays local**: no cloud dependency

---

## Current Architecture (as-built)

### Backend
```
backend/
├── models.py
├── schemas.py
├── database.py
├── main.py
├── scheduler.py
├── repositories/
│   ├── base.py               # CrudRepository[ModelT] generic base
│   ├── asset_repo.py
│   ├── connection_repo.py
│   ├── setting_repo.py
│   ├── system_repo.py
│   ├── net_worth_history_repo.py
│   ├── goal_repo.py          # thin CrudRepository subclass
│   ├── budget_repo.py        # thin CrudRepository subclass
│   ├── income_repo.py        # thin CrudRepository subclass
│   └── subscription_repo.py
├── services/
│   ├── price_service.py
│   ├── analytics_service.py
│   ├── dashboard_service.py
│   ├── snapshot_service.py
│   ├── exchange_rate_service.py
│   ├── asset_service.py      # value_twd/unrealized_pl/roi enrichment (sits above asset_repo)
│   ├── settings_service.py
│   ├── system_service.py     # backup/export-csv/reset/refresh
│   ├── ticker_lookup_service.py
│   └── providers/
│       ├── base.py            # ExchangeProvider ABC
│       ├── common.py          # sync_asset_balance(), shared by binance.py/pionex.py
│       ├── binance.py
│       ├── max.py
│       ├── pionex.py
│       ├── wallet.py
│       └── wallet_config.py   # NETWORKS / POPULAR_TOKENS / ERC20_ABI
├── routers/
│   ├── assets.py
│   ├── dashboard.py
│   ├── stats.py
│   ├── goals.py
│   ├── transactions.py
│   ├── budgets.py
│   ├── income.py
│   ├── settings.py
│   ├── integrations.py
│   ├── subscriptions.py
│   └── system.py
└── utils/
    ├── currency.py
    ├── icons.py
    ├── math.py
    ├── secrets.py             # API-key / settings-value masking
    ├── db_path.py             # sqlite:/// URL → filesystem path
    └── hmac_signing.py        # MAX / Pionex request signing
```

See `docs/API.md` for the full endpoint reference grouped by domain.

### Frontend
```
frontend/
├── app/
│   ├── page.tsx                   # 主頁（儀表板）
│   ├── budget/page.tsx            # 預算規劃（從設定齒輪進入）
│   ├── history/page.tsx           # 歷史紀錄（從設定齒輪進入）
│   ├── subscriptions/page.tsx     # 訂閱分帳（從設定齒輪進入）
│   └── settings/page.tsx          # 設定
├── components/
│   ├── TopBar.tsx                 # 頂部極簡 bar（App 名稱 + 隱私 + 設定圖示）
│   ├── ClientLayout.tsx
│   ├── DashboardClient.tsx        # 組裝 NetWorthHero + SortableSections + dialogs
│   ├── AddAssetDialog.tsx
│   ├── AssetActionDialog.tsx
│   ├── AssetAccordion.tsx
│   ├── AssetAllocationWidget.tsx
│   ├── GoalWidget.tsx
│   ├── GoalDialog.tsx
│   ├── NetWorthTrendChart.tsx
│   ├── TopPerformersWidget.tsx
│   ├── CategoryVisibility.tsx
│   ├── IntegrationManager.tsx
│   ├── IntegrationDialog.tsx
│   ├── TransactionEditDialog.tsx
│   ├── IconPicker.tsx
│   ├── PrivacyProvider.tsx
│   ├── ThemeProvider.tsx
│   ├── dashboard/                 # DashboardClient 的子元件
│   │   ├── NetWorthHero.tsx
│   │   └── SortableSections.tsx   # 拖拉排序 + localStorage 持久化，跟顯示內容脫鉤
│   ├── budget/                    # app/budget/page.tsx 的子元件
│   │   ├── constants.ts           # COLOR_OPTIONS / MACRO_GROUPS / GROUP_ZH
│   │   ├── budgetMetrics.ts       # 純函式：差額/緊急預備金/投資佔比計算
│   │   └── BudgetCategoryFormSheet.tsx
│   ├── subscriptions/             # app/subscriptions/page.tsx 的子元件
│   │   ├── helpers.ts
│   │   ├── NewSubscriptionDialog.tsx
│   │   ├── NewCycleDialog.tsx
│   │   ├── PaymentRow.tsx
│   │   ├── CycleCard.tsx
│   │   └── SubscriptionCard.tsx
│   ├── AddAssetDialog/            # AddAssetDialog.tsx 的子元件
│   │   ├── formState.ts
│   │   └── InvestmentDetailsFields.tsx
│   ├── AssetAccordion/            # AssetAccordion.tsx 的子元件
│   │   ├── AssetRowIcon.tsx
│   │   └── helpers.ts             # getAssetDisplayValue()
│   ├── views/                     # AssetActionDialog 的子 view 元件
│   │   ├── AssetHistoryView.tsx
│   │   ├── EditAssetView.tsx
│   │   ├── QuickAdjustView.tsx
│   │   └── IncomeItemDialog.tsx
│   └── ui/                        # shadcn/radix 基礎元件（含 confirm-delete.tsx 共用刪除確認）
└── lib/
    ├── hooks.ts                   # SWR hooks，含 useCategoryVisibility()
    ├── api.ts                     # 唯一的 fetch 入口，所有 mutation 都經過這裡
    ├── types.ts
    ├── constants.ts               # 含 SUB_CATEGORIES / SUB_CATEGORY_ZH
    ├── usePrivateMoney.ts         # formatMoney() 的隱私模式包裝
    ├── useTickerLookup.ts
    ├── iconHelper.ts
    └── utils.ts                   # 含 formatMoney()
```

---

## Design Principles

- **單一主頁面**：所有常用資訊在一個可捲動頁面
- **零導航元件**：無 Sidebar / BottomNav，僅 TopBar
- **次要功能收起**：設定 / 預算 / 歷史 / 訂閱透過右上角齒輪進入
- **zh-TW only**：無多語言切換

### 主頁面結構
```
┌─────────────────────────────┐
│  Yantage           👁  ⚙   │  ← TopBar
├─────────────────────────────┤
│  淨值大數字 + 月變動          │
│  資產分佈（圓餅圖）            │
│  淨值趨勢折線圖 [區間選擇]     │
│  風險指標：年化報酬率/最大回撤  │
│  表現最佳 / 最差              │
│  目標進度                    │
├─────────────────────────────┤
│  [+ 新增資產]  [管理資產 →]   │  ← 底部操作列
└─────────────────────────────┘
```

---

## Known Technical Debt

- **`wallet.py` 的兩個同步迴圈沒有收斂進 `sync_asset_balance()`**：已知代幣更新（只更新既有 asset，不建立新的）跟自動發現新代幣（只建立，不更新）跟 binance/pionex 的「找或建 + 補差額交易」形狀不同，硬套共用函式會犧牲可讀性，所以維持各自實作。
- **`AssetAccordion.tsx` 的一般資產列跟 web3 群組列沒有合併成單一元件**：兩者只共用圖示區塊（`AssetRowIcon`）跟金額計算（`getAssetDisplayValue`），版面本身（金額+百分比垂直堆疊 vs 金額+展開箭頭水平排列）差異夠大，強行合併會需要一堆條件 prop，判斷不值得。
- **`.env.example` 有兩份且內容跟程式碼實際讀取的環境變數對不上**：根目錄跟 `backend/.env.example` 內容不同，且兩者都列了一些程式碼從未讀取的變數（如 `DATABASE_URL`、`PRICE_UPDATE_INTERVAL`）。實際會讀的只有 `YANTAGE_DATA_DIR`、`ALLOWED_ORIGINS`、`LOG_LEVEL`（見 `database.py`/`main.py`）。這次重構只修正了 README 裡壞掉的啟動指令，沒有動 `.env.example` 本身。
- **`lib/types.ts` 的 `IntegrationConnection`（`label` 欄位）跟後端 `ConnectionResponse` 實際回傳的形狀（`name` 欄位）對不上**：`AddAssetDialog.tsx` 用這個型別顯示錢包連線下拉選單時，`c.label` 永遠是 `undefined`，導致一律 fallback 顯示「連接 {id}」而不是真正的連線名稱。這是既有 bug，這次重構過程中順帶發現，但不在核心「維護性重構」範圍內，先記錄下來。
- **通用化 / 多使用者 / i18n**：目前仍是刻意的個人自架單頁工具（zh-TW only、無登入、強制 light mode）。若之後要開放給別人用，需要另外規劃，不是這次重構的目標。

---

## Coding Conventions

- **Routers**: 只處理 HTTP。依賴 services，回傳 Pydantic schemas，不含業務邏輯。
- **Services**: 不寫 SQLAlchemy queries。呼叫 repositories。
- **Repositories**: 只有 SQLAlchemy。不呼叫 services。
- **`utils/`**: 純函式，無 models/db/services 依賴。
- **Schemas**: 所有 Pydantic schema 放在 `schemas.py`，不在 router 內定義。
- **Comments**: 只寫非顯而易見的 WHY，不寫 WHAT。
- **語言**: 所有 UI 文字直接用繁體中文字串，無 i18n 抽象層。
- **主題**: 強制 light mode（`forcedTheme="light"`），無深色模式切換。

---

## What NOT to Change

- Alembic migrations — 穩定，維持現狀。
- `scheduler.py` — APScheduler 設定維持現狀。
- `database.py` — 穩定，無需改動。
- Docker / docker-compose — 已乾淨。
- Backend API 端點 — 重寫是前端改版，後端不動。
