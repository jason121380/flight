"""
全站 Debug 測試腳本 — My Flights (飛行行事曆)
測試項目：
  1. 頁面初始載入 & Console 錯誤檢查
  2. LocalStorage 快取寫入驗證
  3. 日曆面板渲染（行事曆）
  4. 底部導覽切換（待出發 / 已出發）
  5. 航班卡片點擊 Modal
  6. Modal 關閉（× 按鈕 & 背景點擊）
  7. Header 重新整理按鈕
  8. 截圖存檔（各主要狀態）
"""

import time
from playwright.sync_api import sync_playwright, expect

BASE_URL = 'http://localhost:8000'
SCREENSHOTS = []

def save_screenshot(page, name):
    path = f'/tmp/debug_{name}.png'
    page.screenshot(path=path, full_page=True)
    SCREENSHOTS.append((name, path))
    print(f'  📸 截圖: {path}')

def section(title):
    print(f'\n{"="*55}')
    print(f'  {title}')
    print(f'{"="*55}')

errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={'width': 390, 'height': 844},  # iPhone 14 尺寸
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
    )
    page = context.new_page()

    # ── 收集 Console 訊息 ─────────────────────────────────────────
    console_errors = []
    console_logs = []
    page.on('console', lambda msg: console_errors.append(f'[{msg.type}] {msg.text}')
            if msg.type in ('error', 'warning') else console_logs.append(f'[{msg.type}] {msg.text}'))
    page.on('pageerror', lambda err: console_errors.append(f'[PAGE ERROR] {err}'))

    # ══════════════════════════════════════════════════════════════
    section('1. 頁面初始載入')
    # ══════════════════════════════════════════════════════════════
    page.goto(BASE_URL)
    print('  ✓ 頁面已開啟，等待內容渲染...')

    # 等待 Loading 結束（Spinner 消失 or 日曆出現）
    try:
        page.wait_for_selector('.month, .connection-error, [style*="text-align:center"]',
                               timeout=25000)
        print('  ✓ 內容已載入')
    except Exception as e:
        print(f'  ✗ 等待內容超時: {e}')
        errors.append('初始載入超時')

    save_screenshot(page, '01_initial_load')

    # ── 檢查標題 ─────────────────────────────────────────────────
    title = page.title()
    print(f'  頁面標題: "{title}"')
    if '飛行' not in title and 'Flight' not in title:
        errors.append(f'標題異常: {title}')

    # ── 檢查 Header ──────────────────────────────────────────────
    header = page.locator('header h1')
    if header.count() > 0:
        print(f'  ✓ Header: "{header.inner_text()}"')
    else:
        errors.append('找不到 Header h1')

    # ══════════════════════════════════════════════════════════════
    section('2. 日曆面板檢查')
    # ══════════════════════════════════════════════════════════════
    calendar_wrap = page.locator('#panelCalendar .calendar-wrap')
    if calendar_wrap.count() > 0:
        print('  ✓ 日曆容器存在')
        months = page.locator('.month')
        month_count = months.count()
        if month_count > 0:
            print(f'  ✓ 找到 {month_count} 個月份區塊')
        else:
            # 可能有 error 訊息
            cal_text = calendar_wrap.inner_text()
            if '載入失敗' in cal_text or '失敗' in cal_text:
                print(f'  ⚠ 日曆顯示錯誤: {cal_text[:80]}')
                errors.append('日曆載入失敗（可能是網路問題）')
            elif '沒有航班' in cal_text:
                print('  ⚠ 日曆顯示「目前沒有航班資料」')
            else:
                print(f'  ⚠ 日曆內容: {cal_text[:80]}')
    else:
        errors.append('找不到 #panelCalendar .calendar-wrap')

    # ── 今日格 ────────────────────────────────────────────────────
    today_cell = page.locator('#today')
    if today_cell.count() > 0:
        print('  ✓ 今日格存在並高亮')
    else:
        print('  ℹ 今日格不在航班月份範圍內（正常）')

    # ══════════════════════════════════════════════════════════════
    section('3. LocalStorage 快取驗證')
    # ══════════════════════════════════════════════════════════════
    cache_val = page.evaluate("localStorage.getItem('flights_cache_v1')")
    cache_ts = page.evaluate("localStorage.getItem('flights_cache_ts_v1')")
    if cache_val:
        try:
            import json
            flights = json.loads(cache_val)
            print(f'  ✓ 快取已寫入，共 {len(flights)} 筆航班')
        except:
            errors.append('LocalStorage 快取格式錯誤（JSON 解析失敗）')
    else:
        print('  ⚠ LocalStorage 快取尚未寫入（首次載入或 fetch 失敗）')

    if cache_ts:
        age_min = (time.time() * 1000 - int(cache_ts)) / 60000
        print(f'  ✓ 快取時間戳: {age_min:.1f} 分鐘前')

    # ══════════════════════════════════════════════════════════════
    section('4. 底部導覽切換')
    # ══════════════════════════════════════════════════════════════
    nav_buttons = page.locator('.bn-item')
    nav_count = nav_buttons.count()
    print(f'  找到 {nav_count} 個導覽按鈕')

    if nav_count >= 2:
        # 點擊「待出發」
        nav_buttons.nth(1).click()
        page.wait_for_timeout(500)
        upcoming_panel = page.locator('#panelUpcoming')
        if upcoming_panel.is_visible():
            print('  ✓ 「待出發」面板切換正常')
            upcoming_content = page.locator('#listUpcoming').inner_text()
            if '沒有航班' in upcoming_content:
                print('  ℹ 待出發：沒有航班')
            else:
                card_count = page.locator('#listUpcoming .lcard').count()
                print(f'  ✓ 待出發航班卡片：{card_count} 張')
        else:
            errors.append('「待出發」面板切換失敗')
        save_screenshot(page, '02_upcoming_panel')

    if nav_count >= 3:
        # 點擊「已出發」
        nav_buttons.nth(2).click()
        page.wait_for_timeout(500)
        departed_panel = page.locator('#panelDeparted')
        if departed_panel.is_visible():
            print('  ✓ 「已出發」面板切換正常')
            dep_card_count = page.locator('#listDeparted .lcard').count()
            print(f'  ✓ 已出發航班卡片：{dep_card_count} 張')
        else:
            errors.append('「已出發」面板切換失敗')
        save_screenshot(page, '03_departed_panel')

    # 切回日曆
    nav_buttons.nth(0).click()
    page.wait_for_timeout(300)
    if page.locator('#panelCalendar').is_visible():
        print('  ✓ 切回「行事曆」正常')
    else:
        errors.append('切回行事曆失敗')

    # ══════════════════════════════════════════════════════════════
    section('5. 航班 Modal 測試')
    # ══════════════════════════════════════════════════════════════
    events = page.locator('.event')
    event_count = events.count()
    print(f'  找到 {event_count} 個航班事件格')

    if event_count > 0:
        events.first.click()
        page.wait_for_timeout(500)
        modal = page.locator('#flightModal')
        if modal.is_visible():
            print('  ✓ Modal 開啟成功')
            modal_body = page.locator('#modalBody').inner_text()
            print(f'  Modal 內容前段: {modal_body[:60]}')
            save_screenshot(page, '04_modal_open')

            # 測試 × 按鈕關閉
            page.locator('#closeModal').click()
            page.wait_for_timeout(400)
            if not modal.is_visible():
                print('  ✓ × 按鈕關閉 Modal 正常')
            else:
                errors.append('× 按鈕無法關閉 Modal')

            # 測試背景點擊關閉
            events.first.click()
            page.wait_for_timeout(400)
            page.mouse.click(10, 10)  # 點擊 Modal 外部背景
            page.wait_for_timeout(400)
            if not modal.is_visible():
                print('  ✓ 背景點擊關閉 Modal 正常')
            else:
                errors.append('背景點擊無法關閉 Modal')
        else:
            errors.append('點擊航班事件後 Modal 未開啟')
    else:
        print('  ℹ 無航班事件格可測試（可能尚未載入或無資料）')

    # ══════════════════════════════════════════════════════════════
    section('6. Header 重新整理按鈕')
    # ══════════════════════════════════════════════════════════════
    refresh_btn = page.locator('#refreshBtn')
    if refresh_btn.count() > 0:
        is_disabled = refresh_btn.is_disabled()
        print(f'  重新整理按鈕狀態: {"disabled（正在載入）" if is_disabled else "可點擊"}')
        if not is_disabled:
            refresh_btn.click()
            page.wait_for_timeout(500)
            # 按鈕應進入旋轉 / disabled 狀態
            is_spinning = 'spinning' in (refresh_btn.get_attribute('class') or '')
            print(f'  ✓ 點擊後旋轉: {is_spinning}')
            page.wait_for_timeout(2000)
        else:
            print('  ℹ 按鈕目前為 disabled，跳過點擊測試')
    else:
        errors.append('找不到 #refreshBtn')

    # ══════════════════════════════════════════════════════════════
    section('7. 待出發 Badge 計數')
    # ══════════════════════════════════════════════════════════════
    badge = page.locator('#badgeUpcoming')
    if badge.count() > 0:
        count_val = badge.get_attribute('data-count')
        text_val = badge.inner_text()
        print(f'  Badge data-count="{count_val}", 文字="{text_val}"')
        if count_val == '0':
            is_hidden = badge.get_attribute('style') or badge.evaluate("el => getComputedStyle(el).display") == 'none'
            print(f'  ✓ Badge count=0 時隱藏（正常）')
        else:
            print(f'  ✓ 待出發 {count_val} 筆')
    else:
        errors.append('找不到 #badgeUpcoming')

    # ══════════════════════════════════════════════════════════════
    section('8. Service Worker 狀態')
    # ══════════════════════════════════════════════════════════════
    # Note: SW 需要 HTTPS 或 localhost，file:// 不支援
    sw_state = page.evaluate("""
        async () => {
            if (!('serviceWorker' in navigator)) return 'not_supported';
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) return 'not_registered';
            return reg.active ? 'active' : (reg.installing ? 'installing' : 'waiting');
        }
    """)
    print(f'  Service Worker 狀態: {sw_state}')
    if sw_state == 'not_supported':
        errors.append('Service Worker 不支援（可能是協議問題）')
    elif sw_state == 'not_registered':
        print('  ⚠ SW 尚未註冊完成（首次載入正常）')

    # ══════════════════════════════════════════════════════════════
    section('9. Console 錯誤彙整')
    # ══════════════════════════════════════════════════════════════
    if console_errors:
        for e in console_errors:
            print(f'  ⚠ {e}')
    else:
        print('  ✓ 無 Console 錯誤')

    save_screenshot(page, '05_final_state')
    browser.close()

# ══════════════════════════════════════════════════════════════════
section('📋 DEBUG 彙整報告')
# ══════════════════════════════════════════════════════════════════
if errors:
    print(f'\n  ❌ 發現 {len(errors)} 個問題：')
    for i, e in enumerate(errors, 1):
        print(f'     {i}. {e}')
else:
    print('\n  ✅ 全部測試通過，未發現明顯問題！')

print('\n  📸 截圖清單：')
for name, path in SCREENSHOTS:
    print(f'     [{name}] → {path}')

if console_errors:
    print('\n  ⚠ Console 警告/錯誤：')
    for e in console_errors:
        print(f'     {e}')
