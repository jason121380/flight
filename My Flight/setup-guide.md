# Google Apps Script 設定指南

## 🚀 完整設定步驟

### 第一步：建立 Google Sheets
1. 建立新的 Google Sheets
2. 將工作表重新命名為 `My Flights`
3. 設定以下欄位結構：

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| date | airline | departure | arrival | dept_time | arr_time | flight_no | airline_en |
| 2025-09-16 | 長榮航空 | 台北桃園 | 上海浦東 | 09:55 | 12:05 | BR712 | EVA Air |

### 第二步：設定 Google Apps Script
1. 在 Google Sheets 中，點選「擴充功能」→「Apps Script」
2. 將 `apps-script-code.js` 的內容貼到編輯器中
3. 修改程式碼中的 `SPREADSHEET_ID`：
   ```javascript
   const SPREADSHEET_ID = '您的試算表ID';
   ```
   
   **如何取得試算表 ID？**
   - 從網址中複製：`https://docs.google.com/spreadsheets/d/[這裡是ID]/edit`

### 第三步：部署 Web App
1. 點選「部署」→「新增部署作業」
2. 設定如下：
   - **類型**：網路應用程式
   - **執行身分**：我
   - **存取權限**：任何人（或依需求調整）
3. 點選「部署」
4. **複製 Web App URL**（類似：`https://script.google.com/macros/s/[ID]/exec`）

### 第四步：更新 HTML 檔案
在 `flight_calendar_with_list.html` 中找到這一行：
```javascript
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
```

替換為您的實際 Web App URL：
```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/[您的ID]/exec';
```

## 🎯 功能說明

### 自動載入資料
- 網頁開啟時會自動從 Google Sheets 載入最新航班資料
- 支援即時更新：修改試算表後重新整理網頁即可看到變更

### API 端點
- **取得所有航班**：`{WEB_APP_URL}?action=getFlights`
- 回傳 JSON 格式資料，包含所有航班資訊

### 資料格式
每個航班包含以下欄位：
```json
{
  "date": "2025-09-16",
  "airline": "長榮航空",
  "departure": "台北桃園",
  "arrival": "上海浦東",
  "deptTime": "09:55",
  "arrTime": "12:05",
  "flightNo": "BR712",
  "airlineEn": "EVA Air",
  "departureShort": "桃園",
  "arrivalShort": "浦東"
}
```

## 🔧 測試步驟

### 1. 測試 Apps Script
在 Apps Script 編輯器中：
1. 選擇函數 `testGetFlights`
2. 點選「執行」
3. 查看執行記錄檔，確認資料正確載入

### 2. 測試 Web App
1. 直接在瀏覽器開啟 Web App URL
2. 應該看到 JSON 格式的航班資料

### 3. 測試網頁整合
1. 開啟 `flight_calendar_with_list.html`
2. 開啟瀏覽器開發者工具（F12）
3. 查看 Console 是否有載入成功的訊息
4. 確認日曆上顯示從試算表載入的航班

## 🎨 自訂功能

### 新增航班
直接在 Google Sheets 的 `My Flights` 工作表中新增行即可

### 修改航班
直接在試算表中編輯，重新整理網頁即可看到變更

### 地名簡化
在 Apps Script 的 `simplifyLocation` 函數中可以自訂地名簡化規則

## 🚨 常見問題

### Q: 網頁顯示「請設定 APPS_SCRIPT_URL」
A: 請確認已將 HTML 中的 URL 替換為實際的 Web App URL

### Q: 載入資料失敗
A: 檢查：
1. 試算表 ID 是否正確
2. Web App 權限設定是否為「任何人」
3. 試算表工作表名稱是否為 `My Flights`

### Q: 日曆上沒有顯示航班
A: 確認：
1. 試算表中的日期格式為 YYYY-MM-DD
2. 日期對應的月份在 HTML 中存在
3. 瀏覽器 Console 沒有錯誤訊息

## 📱 手機版功能
- 自動支援簡化顯示和彈窗詳情
- 地名會自動簡化（如：台北桃園 → 桃園）
- 點擊事件會顯示完整資訊彈窗
