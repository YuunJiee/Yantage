# Yantage — 個人資產儀表板

自架的個人財務儀表板。單一可捲動頁面追蹤各類資產淨值，連接交易所與鏈上錢包，資料存於本機 SQLite，無雲端依賴。

![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 功能

- **6 大資產類別**：流動資產、股票、加密貨幣、固定資產、應收帳款、負債
- **即時報價**：台股 / 美股（Yahoo Finance）、加密貨幣（Binance CCXT）
- **交易所同步**：MAX、Binance、Pionex — 唯讀 API Key 自動同步餘額
- **鏈上錢包**：Ethereum / Scroll / BSC / Arbitrum — 直接 RPC，無第三方 API
- **淨值趨勢圖**：可選時間區間（30天 / 3個月 / 6個月 / 1年 / 全部）
- **月結快照**：逐月淨值與漲跌一覽
- **目標追蹤**：FIRE 淨值目標（含預測達成日）、資產配置目標
- **預算規劃**：月度類別預算、收入追蹤、投資比率警示
- **隱私模式**：一鍵遮蔽全站數字
- **PWA**：可安裝至手機或桌面主畫面

---

## 快速啟動（Docker）

```bash
git clone https://github.com/YuunJiee/Personal-Asset-Dash.git
cd Personal-Asset-Dash
docker compose up --build
```

- 儀表板 → http://localhost:3001
- API 文件 → http://localhost:8000/docs

資料存於 `yantage_data` named volume，重建容器不會遺失。

| 指令 | 用途 |
|---|---|
| `docker compose up -d` | 背景啟動 |
| `docker compose down` | 停止 |
| `docker compose down -v` | 停止並**清除資料** ⚠️ |
| `docker compose logs -f` | 即時查看 log |

---

## 開發環境

```bash
# 後端（Python 3.8+）
cd backend && pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 前端（Node.js 18+）
cd frontend && npm install && npm run dev
```

---

## 環境變數

| 變數 | 預設值 | 說明 |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS 允許來源 |
| `LOG_LEVEL` | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `YANTAGE_DATA_DIR` | *(backend 目錄)* | SQLite DB 存放路徑 |

---

## 技術棧

| 層 | 技術 |
|---|---|
| 前端 | Next.js 19 · TypeScript · Tailwind CSS v4 |
| 後端 | FastAPI · SQLAlchemy · SQLite |
| 排程 | APScheduler（每日自動更新報價 + 快照） |
| 容器 | Docker Compose |

---

MIT License
