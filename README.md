# ✈️ My Flights — 飛行行事曆

個人航班管理 PWA，資料來自 Google Sheets，支援離線快取，針對 iOS / Android 行動裝置最佳化。

---

## 📋 功能特色

- **月曆檢視**：以月份為單位顯示所有航班，今日格自動高亮
- **待出發清單**：列出尚未起飛的航班，並顯示數量 Badge
- **已出發清單**：歸檔所有已離港航班
- **航班詳情 Modal**：點擊任一航班顯示詳細資訊（航空公司、航線、時間、航班號）
- **離線快取**：首次載入後，斷網情況下仍可瀏覽上次資料
- **PWA 支援**：可安裝至 iOS / Android 主畫面，以全螢幕 App 模式執行

---

## 🏗️ 技術架構

| 項目 | 技術 |
|------|------|
| 前端 | 純 HTML + Vanilla JavaScript + Inline CSS |
| 資料來源 | Google Sheets 公開 CSV |
| 快取層 1 | LocalStorage（`flights_cache_v1`） |
| 快取層 2 | Service Worker（Stale-While-Revalidate） |
| PWA | Web App Manifest + Service Worker |
| 測試 | Playwright（Python） |

> 無任何外部框架或建置工具，單一 `index.html` 即可部署。

---

## 📁 檔案結構

```
flight/
├── index.html       # 主應用程式（HTML / CSS / JS 全合一）
├── sw.js            # Service Worker（靜態資源 Cache-First；CSV Stale-While-Revalidate）
├── manifest.json    # PWA Manifest
├── icon.svg         # App 圖示（SVG）
└── debug_test.py    # Playwright 自動化測試腳本
```

---

## 📊 資料格式

資料來源為 Google Sheets，發布為公開 CSV，欄位順序如下：

| 欄位 | 說明 | 範例 |
|------|------|------|
| A | 日期 | `2026-03-15` |
| B | 航空公司（中文） | `長榮航空` |
| C | 出發地 | `台北桃園` |
| D | 目的地 | `首爾仁川` |
| E | 出發時間 | `08:30` |
| F | 到達時間 | `13:00` |
| G | 航班號 | `BR170` |
| H | 航空公司（英文） | `EVA Air` |

> 在 Google Sheets 中：「檔案 → 共用 → 發布到網路 → CSV」即可取得公開 CSV 網址。

---

## 🚀 本地執行

不需要任何安裝，使用任意靜態伺服器即可：

```bash
# 方法一：Python（推薦）
cd flight
python3 -m http.server 8000

# 方法二：Node.js npx
npx serve .
```

開啟瀏覽器訪問 `http://localhost:8000`

---

## ⚙️ 設定資料來源

在 `index.html` 第 569 行修改 CSV 網址：

```javascript
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub?gid=YOUR_GID&single=true&output=csv';
```

---

## 🧪 執行測試

測試腳本使用 Playwright，需先安裝依賴並在本地啟動伺服器：

```bash
# 安裝依賴
pip install playwright
playwright install chromium

# 啟動伺服器（另開終端機）
python3 -m http.server 8000

# 執行測試
python3 debug_test.py
```

### 測試覆蓋項目

1. 頁面初始載入 & Console 錯誤檢查
2. 日曆面板渲染驗證
3. LocalStorage 快取寫入驗證
4. 底部導覽切換（行事曆 / 待出發 / 已出發）
5. 航班 Modal 開啟 / 關閉（× 按鈕 & 背景點擊）
6. Header 重新整理按鈕
7. 待出發 Badge 計數
8. Service Worker 狀態

測試執行後，截圖會儲存至 `/tmp/debug_*.png`。

---

## 📱 PWA 安裝方式

### iOS（Safari）
1. 在 Safari 開啟網站
2. 點擊下方「分享」按鈕 →「加入主畫面」

### Android（Chrome）
1. 在 Chrome 開啟網站
2. 點擊右上角選單 →「新增至主畫面」

---

## 🔄 快取策略說明

```
使用者開啟 App
  │
  ├─ 有 LocalStorage 快取？
  │     ├─ 是 → 立即顯示快取資料 → 背景 fetch 新資料 → 靜默更新 UI → 顯示「已更新」提示
  │     └─ 否 → 顯示 Loading → fetch 資料 → 渲染
  │
  └─ fetch 失敗？
        ├─ 有快取 → 顯示「無法更新，顯示快取資料」提示
        └─ 無快取 → 顯示錯誤訊息 + 重新載入按鈕
```

Service Worker 另有獨立的 CSV 快取（`flight-csv-v5`），提供雙層離線保護。

---

## 📄 授權

MIT License
