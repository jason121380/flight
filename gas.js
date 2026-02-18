/**
 * 部署步驟：
 * 1. 開啟你的 Google 試算表 → 擴充功能 → Apps Script
 * 2. 貼上此檔案內容（取代預設的 Code.gs）
 * 3. 部署 → 新增部署 → 類型選「網頁應用程式」
 *    - 執行身分：我（你的帳戶）
 *    - 存取權：所有人
 * 4. 複製部署後的網址，貼到 index.html 的 GAS_WRITE_URL 變數
 *
 * 試算表欄位順序（第一列為標題列，從第二列開始寫資料）：
 * A=日期, B=航空公司(中), C=出發地, D=目的地,
 * E=起飛時間, F=抵達時間, G=航班號, H=航空公司(英)
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    sheet.appendRow([
      data.date     || '',
      data.airline  || '',
      data.departure|| '',
      data.arrival  || '',
      data.deptTime || '',
      data.arrTime  || '',
      data.flightNo || '',
      data.airlineEn|| ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 讓瀏覽器預檢（OPTIONS）可以通過
function doGet(e) {
  return ContentService
    .createTextOutput('OK')
    .setMimeType(ContentService.MimeType.TEXT);
}
