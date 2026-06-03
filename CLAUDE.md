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
│   ├── asset_repo.py
│   ├── goal_repo.py
│   ├── budget_repo.py
│   └── income_repo.py
├── services/
│   ├── price_service.py
│   ├── analytics_service.py
│   ├── dashboard_service.py
│   ├── snapshot_service.py
│   ├── exchange_rate_service.py
│   └── providers/
│       ├── base.py          # ExchangeProvider ABC
│       ├── binance.py
│       ├── max.py
│       ├── pionex.py
│       └── wallet.py
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
│   └── system.py
└── utils/
    ├── currency.py
    ├── icons.py
    └── math.py
```

### Frontend
```
frontend/
├── app/
│   ├── page.tsx              # 主頁（儀表板）
│   ├── expenses/page.tsx     # 預算規劃（設定區）
│   ├── history/page.tsx      # 歷史紀錄（設定區）
│   └── settings/page.tsx     # 設定
├── components/
│   ├── ClientLayout.tsx
│   ├── AppSidebar.tsx
│   ├── BottomNav.tsx
│   └── ...
└── lib/
    ├── hooks.ts
    ├── api.ts
    └── types.ts
```

---

## Active Redesign: Minimalist Single-Page

### 設計原則
- **單一主頁面**：所有常用資訊在一個可捲動頁面
- **零導航元件**：移除 AppSidebar 和 BottomNav
- **次要功能收起**：設定/預算/歷史透過右上角齒輪進入
- **zh-TW only**：無多語言切換

### 主頁面結構
```
┌─────────────────────────────┐
│  Yantage           👁  ⚙   │  ← 頂部極簡 bar
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

### 待刪除的頁面
| 頁面 | 原因 |
|---|---|
| `app/analytics/page.tsx` | 內容移入主頁 |
| `app/stock/page.tsx` | 表現最佳/最差移入主頁 |
| `app/assets/page.tsx` | 改為主頁呼出的 Sheet |

### 待調整的頁面
| 頁面 | 調整方式 |
|---|---|
| `app/history/page.tsx` | 保留但從設定齒輪進入 |
| `app/expenses/page.tsx` | 保留但從設定齒輪進入 |
| `app/settings/page.tsx` | 保留但從設定齒輪進入 |

### 待刪除的元件
- `components/AppSidebar.tsx`
- `components/BottomNav.tsx`

### 待新增的元件
- `components/TopBar.tsx` — 頂部極簡 bar（App 名稱 + 隱私 + 設定圖示）
- `components/AssetManagerSheet.tsx` — 資產管理 Sheet（取代 assets 頁面）

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
