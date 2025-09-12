/**
 * Google Apps Script for Flight Calendar
 * 讀取 Google Sheets 中的航班資料並提供 API
 */

// 設定試算表 ID（請替換為您的試算表 ID）
const SPREADSHEET_ID = '1CW6jTkpaAYvQUeFGHalQKHsjY9TG54VWTE1jh-aO84s';
const SHEET_NAME = '工作表2';

/**
 * 主要 API 函數 - 取得所有航班資料
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'getFlights';
    const callback = params.callback;
    
    let result;
    switch(action) {
      case 'getFlights':
        result = getFlights(params);
        break;
      default:
        result = createResponse({error: '未知的動作'}, 400);
        break;
    }
    
    // 支援 JSONP
    if (callback) {
      const jsonContent = result.getContent();
      return ContentService
        .createTextOutput(callback + '(' + jsonContent + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return result;
  } catch (error) {
    console.error('API 錯誤:', error);
    const errorResult = createResponse({error: error.toString()}, 500);
    
    if (params && params.callback) {
      const jsonContent = errorResult.getContent();
      return ContentService
        .createTextOutput(params.callback + '(' + jsonContent + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return errorResult;
  }
}

/**
 * 取得航班資料
 */
function getFlights(params) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = resolveSheet(spreadsheet, params);
    
    if (!sheet) {
      const names = spreadsheet.getSheets().map(s => s.getName()).join(', ');
      throw new Error(`找不到工作表: ${SHEET_NAME}（可用工作表：${names}）`);
    }
    
    console.log(`成功找到工作表: ${sheet.getName()}`);
    
    // 取得所有資料（跳過標題列）
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    if (values.length <= 1) {
      return createResponse({flights: []});
    }
    
    // 轉換資料格式
    const flights = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // 跳過空白行
      if (!row[0]) continue;
      
      // 快速處理時間格式化（減少 console.log 提升效能）
      const deptTimeFormatted = formatTime(row[4]);
      const arrTimeFormatted = formatTime(row[5]);
      
      const flight = {
        date: formatDate(row[0]),
        airline: row[1] || '',
        departure: row[2] || '',
        arrival: row[3] || '',
        deptTime: String(deptTimeFormatted), // 強制轉為字串
        arrTime: String(arrTimeFormatted),   // 強制轉為字串
        flightNo: row[6] || '',
        airlineEn: row[7] || '',
        // 產生簡化版本的地名
        departureShort: simplifyLocation(row[2]),
        arrivalShort: simplifyLocation(row[3])
      };
      
      flights.push(flight);
    }
    
    // 按日期排序
    flights.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return createResponse({
      flights: flights,
      lastUpdated: new Date().toISOString(),
      total: flights.length
    });
    
  } catch (error) {
    console.error('取得航班資料錯誤:', error);
    throw error;
  }
}

/**
 * 解析要讀取的工作表，優先順序：gid 參數 > 指定名稱 > 自動偵測
 */
function resolveSheet(spreadsheet, params) {
  console.log('開始尋找工作表...');
  const allSheets = spreadsheet.getSheets();
  const allNames = allSheets.map(s => s.getName());
  console.log('所有工作表:', allNames);
  
  // 1) 以 gid（sheetId）優先
  const gid = params && params.gid ? Number(params.gid) : null;
  if (!isNaN(gid) && gid !== null) {
    console.log('嘗試以 gid 尋找:', gid);
    try {
      const byId = spreadsheet.getSheetById(gid);
      if (byId) {
        console.log('以 gid 找到工作表:', byId.getName());
        return byId;
      }
    } catch(e) {
      console.log('以 gid 尋找失敗:', e.toString());
    }
  }

  // 2) 以固定名稱
  console.log('嘗試以名稱尋找:', SHEET_NAME);
  const byName = spreadsheet.getSheetByName(SHEET_NAME);
  if (byName) {
    console.log('以名稱找到工作表:', byName.getName());
    return byName;
  }

  // 3) 如果只有一個工作表，直接使用
  if (allSheets.length === 1) {
    console.log('只有一個工作表，直接使用:', allSheets[0].getName());
    return allSheets[0];
  }

  // 4) 尋找包含航班資料的工作表
  console.log('嘗試自動偵測...');
  for (var i = 0; i < allSheets.length; i++) {
    var sh = allSheets[i];
    console.log('檢查工作表:', sh.getName());
    
    try {
      // 檢查是否有航班相關資料
      const range = sh.getDataRange();
      if (range.getNumRows() < 2) continue; // 至少要有標題和一行資料
      
      const values = range.getValues();
      for (var row = 0; row < Math.min(5, values.length); row++) {
        const rowData = values[row].map(String).map(function(x){return x.toLowerCase().trim();});
        // 尋找日期格式的資料
        const hasDate = rowData.some(function(cell) {
          return /^\d{4}-\d{2}-\d{2}$/.test(cell) || cell.includes('date') || cell.includes('日期');
        });
        const hasAirline = rowData.some(function(cell) {
          return cell.includes('airline') || cell.includes('航空') || cell.includes('eva') || cell.includes('長榮');
        });
        
        if (hasDate || hasAirline) {
          console.log('找到疑似航班資料的工作表:', sh.getName());
          return sh;
        }
      }
    } catch(e) {
      console.log('檢查工作表時出錯:', e.toString());
      continue;
    }
  }
  
  console.log('找不到合適的工作表');
  return null;
}

/**
 * 格式化日期為 YYYY-MM-DD
 */
function formatDate(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return date.toString();
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 格式化時間為 HH:MM
 */
function formatTime(time) {
  if (!time) return '';
  
  // 1. 如果是 Date 物件（最常見）
  if (time instanceof Date || Object.prototype.toString.call(time) === '[object Date]') {
    // 檢查是否是 1899 年的日期（Google Sheets 的時間基準）
    if (time.getFullYear() === 1899) {
      // Google Sheets 時間格式，需要加上 8 小時轉換為台灣時間
      const utcHours = time.getUTCHours();
      const utcMinutes = time.getUTCMinutes();
      
      let localHours = utcHours + 8;
      
      // 處理跨日情況
      if (localHours >= 24) {
        localHours -= 24;
      }
      
      return `${String(localHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
    } else {
      // 正常日期，使用本地時間
      const hours = time.getHours();
      const minutes = time.getMinutes();
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }
  
  // 2. 如果是字串
  if (typeof time === 'string') {
    // 已經是 HH:MM 格式
    if (/^\d{1,2}:\d{2}$/.test(time.trim())) {
      return time.trim();
    }
    
    // ISO 時間字串
    if (time.includes('T') || time.includes('Z')) {
      try {
        const d = new Date(time);
        if (!isNaN(d.getTime())) {
          // 如果是 1899 年，加上 8 小時轉換為台灣時間
          if (d.getFullYear() === 1899) {
            const utcHours = d.getUTCHours();
            const utcMinutes = d.getUTCMinutes();
            
            let localHours = utcHours + 8;
            if (localHours >= 24) {
              localHours -= 24;
            }
            
            return `${String(localHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
          } else {
            const hours = d.getHours();
            const minutes = d.getMinutes();
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }
        }
      } catch (e) {
        // 靜默處理錯誤
      }
    }
  }
  
  // 3. 如果是數字（Excel/Sheets 序列值）
  if (typeof time === 'number' && time >= 0 && time < 1) {
    // 小數表示時間部分，加上 8 小時轉換為台灣時間
    const totalMinutes = Math.round(time * 24 * 60) + (8 * 60);
    let hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours >= 24) {
      hours -= 24;
    }
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  
  // 4. 最後嘗試作為 Date 解析
  try {
    const d = new Date(time);
    if (!isNaN(d.getTime())) {
      if (d.getFullYear() === 1899) {
        const utcHours = d.getUTCHours();
        const utcMinutes = d.getUTCMinutes();
        
        let localHours = utcHours + 8;
        if (localHours >= 24) {
          localHours -= 24;
        }
        
        return `${String(localHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
      } else {
        const hours = d.getHours();
        const minutes = d.getMinutes();
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }
  } catch (e) {
    // 靜默處理錯誤
  }
  
  return String(time);
}

/**
 * 簡化地名（用於手機版顯示）
 */
function simplifyLocation(location) {
  if (!location) return '';
  
  const simplifications = {
    '台北桃園': '桃園',
    '台北松山': '松山',
    '上海浦東': '浦東',
    '上海虹橋': '虹橋',
    '首爾仁川': '仁川',
    '首爾金浦': '金浦'
  };
  
  return simplifications[location] || location;
}

/**
 * 建立 API 回應
 */
function createResponse(data, statusCode = 200) {
  const response = {
    success: statusCode < 400,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  const output = ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
    
  // 手動設定 CORS 標頭 - 透過 callback 參數
  return output;
}

/**
 * 處理 CORS 預檢請求
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

/**
 * 測試函數 - 可在 Apps Script 編輯器中執行
 */
function testGetFlights() {
  const result = getFlights();
  const jsonResponse = JSON.parse(result.getContent());
  console.log('測試結果:', jsonResponse);
  return jsonResponse;
}

/**
 * 初始化範例資料（選用）
 */
function initializeSampleData() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  
  // 設定標題列
  const headers = [
    'date', 'airline', 'departure', 'arrival', 
    'dept_time', 'arr_time', 'flight_no', 'airline_en'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // 範例資料
  const sampleData = [
    ['2025-09-16', '長榮航空', '台北桃園', '上海浦東', '09:55', '12:05', 'BR712', 'EVA Air'],
    ['2025-09-21', '長榮航空', '上海虹橋', '台北松山', '19:40', '21:45', 'BR771', 'EVA Air'],
    ['2025-10-03', '長榮航空', '台北桃園', '香港', '12:40', '14:25', 'BR869', 'EVA Air'],
    ['2025-10-03', '卡達航空', '香港', '杜哈', '19:40', '23:05', 'QR817', 'Qatar Airways'],
    ['2025-10-04', '卡達航空', '杜哈', '漢堡', '02:05', '07:25', 'QR091', 'Qatar Airways']
  ];
  
  sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  
  console.log('範例資料已初始化');
}
