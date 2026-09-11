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
├── constants.py               # AssetCategory / Provider / GoalType enums — single source of truth
├── scheduler.py                # per-provider sync jobs derived from services/providers/*.PROVIDERS
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
│   ├── subscription_service.py  # cycle creation (auto one payment per member) — moved out of subscription_repo
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
    ├── category_rules.py      # is_negative_category() — replaces 3 duplicated Liabilities checks
    ├── secrets.py             # API-key / settings-value masking
    └── hmac_signing.py        # MAX / Pionex request signing
```

See `docs/API.md` for the full endpoint reference grouped by domain.

Tests live in `backend/tests/` (`python -m pytest backend/tests -q`). `backend/requirements-dev.txt`
adds pytest/pytest-mock/httpx on top of `requirements.txt` — the `client` fixture in `conftest.py`
wraps a `TestClient(app)` with `get_db` overridden onto an in-memory SQLite DB (`StaticPool`, since
`TestClient` runs handlers in a worker thread).

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
│   └── ui/                        # shadcn/radix 基礎元件（含 confirm-delete.tsx 共用刪除確認、
│                                   #   section-label.tsx 共用區塊標題、skeleton.tsx 內的 PageError）
└── lib/
    ├── hooks.ts                   # SWR hooks，含 SWR_KEYS / useCategoryVisibility()
    ├── api.ts                     # 唯一的 fetch 入口，所有 mutation 都經過這裡
    ├── types.ts
    ├── constants.ts               # 含 SUB_CATEGORIES / SUB_CATEGORY_ZH / POSITIVE_CATEGORIES
    ├── providers.ts               # PROVIDERS 清單 — IntegrationManager 的 icon/預設名稱/select 選項來源
    ├── useFormSubmit.ts           # 共用 loading/error/try-catch，套在語意相同的 dialog submit（非全套）
    ├── usePrivateMoney.ts         # formatMoney() 的隱私模式包裝
    ├── useTickerLookup.ts
    ├── iconHelper.ts
    └── utils.ts                   # 含 formatMoney()
```

資料抓取全走 `lib/hooks.ts` 的 SWR（`mutate(SWR_KEYS.xxx)` 觸發重整），沒有 `router.refresh()` 或手刻
`useState`+`useEffect` 抓資料的地方。測試用 Vitest + React Testing Library：`*.test.ts(x)` 跟被測試的
模組放在同一層（例如 `lib/utils.test.ts`），設定檔在根目錄的 `vitest.config.mts`/`vitest.setup.ts`，
`npm test` 跑一次、`npm run test:watch` 監看模式。

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

- **`wallet.py` 的「已知代幣更新」跟「自動發現新代幣」兩個迴圈刻意不跟 binance/pionex 共用 `sync_asset_balance()`**：兩者共用的部分（ERC20 `balanceOf()` 呼叫 + 依 decimals 換算）已抽成 `_fetch_erc20_balance()`；但一個只更新既有 asset、另一個只建立新 asset 並設定 name/icon/price，若硬塞進同一個「找或建」函式，會導致自動發現的代幣被使用者手動改名後，下次同步又被覆蓋回去——這是刻意保留的行為差異，不是沒發現的重複。
- **`AssetAccordion.tsx` 的一般資產列跟 web3 群組列沒有合併成單一元件**：兩者共用圖示區塊（`AssetRowIcon`）跟金額計算（`getAssetDisplayValue`），但版面本身（金額+百分比垂直堆疊 vs 金額+展開箭頭水平排列，還有 badge/meta 內容都不同）差異夠大，強行合併會需要一堆條件 prop，判斷不值得，重新評估後維持現狀。
- **`wallet_config.py` 的 `NETWORKS`/`POPULAR_TOKENS` 維持寫死，不搬進 `SystemSetting`**：對單一自架使用者來說這些值幾乎不會變，搬進資料庫只會多一層要維護的間接層，投入產出比不好。
- **Provider（binance/max/pionex/wallet）沒有個別的深度單元測試**：背後都是第三方 SDK/API 呼叫，深度 mock 測試投入產出比低；目前靠 `test_scheduler.py`/`test_dashboard_service.py` 等驗證排程跟資料串接邏輯，個別 provider 的 sync 邏輯靠手動測試 + 生產環境觀察。
- **前端沒有 zod 或其他 runtime API 型別驗證層**：對一人維護、前後端同一個 repo 的專案來說，維護一份 zod schema 跟 `schemas.py` 對齊等於又製造一個要手動同步的來源，投入產出比不好。
- **卡片容器 class 重複（~16 處）跟 `IconPicker.tsx` 的圖示比對邏輯沒有抽成共用元件**：判斷跟上面幾點類似，硬套共用元件會犧牲彈性，維持現狀。
- **DB 層 `nullable=False` 沒有補上**（`CryptoConnection.name`/`Asset.name`/`Goal.target_amount` 等本來就必填但 DB schema 沒擋的欄位）：要補上得對正式資料庫跑 batch-alter migration，對單人自架的既有資料庫來說風險（跑壞既有資料）大於好處（Pydantic 層驗證已經擋住新資料的髒寫入），評估後跳過。
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

- Alembic migrations — 既有的 migration 檔不動；新 migration 一律新增檔案（見 `0005_add_fk_indexes.py`）。
- `scheduler.py` 的 APScheduler 設定（`coalesce`/`misfire_grace_time` 等）——維持現狀；per-provider 的 job 註冊已改成資料驅動（見 `constants.py`/`services/providers/*.PROVIDERS`），加新 provider 不用再動這支檔案。
- `database.py` — 穩定，無需改動。
- Docker / docker-compose — 已乾淨。
- Backend API 端點 — 重寫是前端改版，後端不動。
