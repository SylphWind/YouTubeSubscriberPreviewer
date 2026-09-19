# YouTube Subscriber Previewer

在 YouTube 頻道連結上暫停滑鼠，即時預覽該頻道的訂閱者數量，無需開啟頻道頁面。

## 版本

- **v1.4**：新增提示欄位、各欄位快取保留天數與快取空間管理設定。
- **v1.3.1**：修正 Options 頁面的 API Key 驗證流程。
- **v1.3**：新增 Options 頁面的 API Key 驗證功能，並改善少見 API 配額與權限錯誤提示。
- **v1.2**：新增 Options 設定頁，可在不將 API Key 寫入程式碼的情況下使用擴充功能，並改善 API 錯誤提示。
- **v1.1**：包含頻道地區、影片數量、總觀看次數與建立日期預覽。
- **v1.0**：支援頻道 Handle 與 Channel ID，查詢並快取訂閱者數量，提供滑鼠懸停預覽。

## 功能

- 支援 YouTube 頻道 Handle（例如 `/@username`）與 Channel ID（例如 `/channel/UC...`）。
- 滑鼠停留 300 毫秒後顯示提示框，避免快速移動時發出不必要的請求。
- 使用 YouTube Data API v3 取得頻道統計資料。
- 顯示頻道公開的所屬地區。
- 顯示影片數量、頻道總觀看次數與頻道建立日期。
- 將查詢結果儲存在 Chrome 本機儲存空間，並可在 Options 頁為每個欄位設定快取保留天數。
- 以繁體中文及易讀格式顯示頻道資料；未公開或缺少的欄位會顯示「未公開」。
- API Key 由 Options 頁面設定，儲存在 Chrome 的本機儲存空間，不會寫入 GitHub 專案檔案。
- Options 頁可選擇要顯示的欄位；訂閱者、影片與觀看可設定不快取、1、3、7 或 30 天，地區與建立日期則可設定不快取或永久。
- Options 頁會顯示目前快取使用空間，並可只清除頻道快取，不影響 API Key 與其他設定。

## 安裝方式

1. 在 Google Cloud Console 建立 YouTube Data API v3 的 API Key，並限制只能使用 YouTube Data API v3。若設定「應用程式限制」，未封裝 Chrome 擴充功能通常不適用 HTTP referrer 限制，請先選「無」；仍應保留 API 限制與配額限制。
2. 在 Chrome 開啟 `chrome://extensions/`。
3. 開啟右上角的「開發人員模式」。
4. 點選「載入解壓縮擴充功能」，選取本專案資料夾。
5. 在擴充功能的「詳細資料」中開啟「擴充功能選項」，貼上 API Key，按「驗證 API Key」確認設定後再按頁面底部的「儲存所有設定」。也可在此頁選擇顯示欄位與快取保留天數。
6. 開啟或重新整理 YouTube 頁面，將滑鼠移到頻道連結上測試。

更新程式碼後，請在 `chrome://extensions/` 找到本擴充功能並按下「重新載入」，讓 Chrome 套用新的版本與程式碼。

## 使用方式

在 YouTube 的影片、搜尋結果或其他包含頻道連結的頁面，將滑鼠停留在頻道名稱上。提示框會依 Options 設定顯示欄位；若資料來自本機快取，訂閱者欄位會標示「快取」。任何未公開或無法取得的欄位會顯示「未公開」。

## 專案結構

| 檔案 | 用途 |
| --- | --- |
| `manifest.json` | Chrome 擴充功能設定與權限 |
| `background.js` | 從本機設定讀取 API Key、呼叫 YouTube Data API，並管理欄位快取與快取空間 |
| `content.js` | 偵測頻道連結、處理滑鼠事件與建立提示框 |
| `styles.css` | 提示框的外觀與動畫 |
| `options.html` / `options.js` | 設定、驗證、儲存 API Key、顯示欄位、快取保留天數與快取空間 |

## 注意事項

- YouTube Data API 有配額限制；本擴充功能依 Options 中各欄位的保留天數快取查詢結果，降低 API 請求次數。
- API Key 不會放在 GitHub 或擴充功能程式碼中，而是儲存在 Chrome 的 `chrome.storage.local`。請在 Google Cloud Console 限制 API Key 僅能使用 YouTube Data API，並設定適當的配額與限制。
- 若 API Key 無效、限制不相容、超過配額或找不到頻道，提示框會顯示可診斷的錯誤；個別欄位未公開時仍會顯示其他可用資料。
- 若看到 API 請求失敗，請先開啟擴充功能的 Options 頁確認 API Key，並確認 Google Cloud 已啟用 YouTube Data API v3；未封裝擴充功能不應使用 HTTP referrer 應用程式限制。
- 手動驗證時，應確認零訂閱數、零影片數、隱藏訂閱數與缺少頻道地區等資料，分別正確顯示為 `0` 或「未公開」。
- YouTube 可能調整頁面結構，導致頻道連結偵測需要更新。
