# YouTube Subscriber Previewer

在 YouTube 頻道連結上暫停滑鼠，即時預覽該頻道的訂閱者數量，無需開啟頻道頁面。

## 功能

- 支援 YouTube 頻道 Handle（例如 `/@username`）與 Channel ID（例如 `/channel/UC...`）。
- 滑鼠停留 300 毫秒後顯示提示框，避免快速移動時發出不必要的請求。
- 使用 YouTube Data API v3 取得頻道統計資料。
- 顯示頻道公開的所屬地區。
- 將查詢結果儲存在 Chrome 本機儲存空間，快取有效期為 7 天。
- 以繁體中文及易讀格式顯示訂閱者數量。

## 安裝方式

1. 取得 YouTube Data API v3 的 API Key。
2. 開啟 `background.js`，將 `API_KEY` 替換成自己的 API Key。
3. 在 Chrome 開啟 `chrome://extensions/`。
4. 開啟右上角的「開發人員模式」。
5. 點選「載入解壓縮擴充功能」，選取本專案資料夾。
6. 開啟或重新整理 YouTube 頁面，將滑鼠移到頻道連結上測試。

## 使用方式

在 YouTube 的影片、搜尋結果或其他包含頻道連結的頁面，將滑鼠停留在頻道名稱上。提示框會顯示目前取得的訂閱者數量與頻道公開地區；若資料來自本機快取，會標示「快取」。未公開地區的頻道會顯示「未公開」。

## 專案結構

| 檔案 | 用途 |
| --- | --- |
| `manifest.json` | Chrome 擴充功能設定與權限 |
| `background.js` | 呼叫 YouTube Data API，並管理訂閱數快取 |
| `content.js` | 偵測頻道連結、處理滑鼠事件與建立提示框 |
| `styles.css` | 提示框的外觀與動畫 |

## 注意事項

- YouTube Data API 有配額限制；本擴充功能以 7 天快取降低 API 請求次數。
- API Key 會放在瀏覽器擴充功能程式碼中，請在 Google Cloud Console 限制 API Key 僅能使用 YouTube Data API，並依部署方式設定適當的限制。
- 若 API Key 無效、超過配額或頻道沒有可用的統計資料，提示框會顯示無法取得訂閱數。
- YouTube 可能調整頁面結構，導致頻道連結偵測需要更新。
