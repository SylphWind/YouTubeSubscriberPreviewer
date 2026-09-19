// content.js

let hoverTimer = null;
let activeTooltip = null;
let currentTargetLink = null;

// 1. 使用全域 mouseover 事件委派，自動相容 YouTube SPA 動態渲染的 DOM
document.addEventListener("mouseover", (event) => {
  // 尋找是否停留於頻道連結上（支援 /@handle 與 /channel/UCxxx）
  const link = event.target.closest("a[href*='/@'], a[href*='/channel/UC']");
  if (!link) return;

  // 防止同一連結重複觸發
  if (currentTargetLink === link) return;
  currentTargetLink = link;

  // 解析頻道識別碼
  const identifier = extractIdentifier(link.getAttribute("href"));
  if (!identifier) return;

  // 2. 防抖機制 (Debounce)：滑鼠停頓超過 300ms 才啟動查詢
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    showTooltip(link, "載入中...");

    // 向 background.js 請求訂閱數
    chrome.runtime.sendMessage(
      { action: "getSubscriberCount", identifier: identifier },
      (response) => {
        // 確保滑鼠依然停留在原連結上才更新 UI
        if (currentTargetLink !== link) return;

        if (response && response.success) {
          const formattedCount = formatSubscriberCount(response.subscriberCount);
          const formattedRegion = formatChannelRegion(response.country);
          const cacheTag = response.fromCache ? " (快取)" : "";
          updateTooltipText(
            `訂閱者：${formattedCount}${cacheTag}\n地區：${formattedRegion}`
          );
        } else {
          updateTooltipText("無法取得訂閱數");
        }
      }
    );
  }, 300);
});

// 3. 監聽 mouseout，當滑鼠離開時清除計時器並銷毀 Tooltip
document.addEventListener("mouseout", (event) => {
  const link = event.target.closest("a[href*='/@'], a[href*='/channel/UC']");
  if (link && link === currentTargetLink) {
    clearTimeout(hoverTimer);
    removeTooltip();
    currentTargetLink = null;
  }
});

/**
 * 從 href 提取 Handle (@xxx) 或 Channel ID (UCxxx)
 */
function extractIdentifier(href) {
  if (!href) return null;
  try {
    const url = new URL(href, window.location.origin);
    const path = url.pathname;

    // 匹配 /@username
    const handleMatch = path.match(/\/(@[^\/]+)/);
    if (handleMatch) return handleMatch[1];

    // 匹配 /channel/UCxxx
    const channelMatch = path.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
    if (channelMatch) return channelMatch[1];
  } catch (e) {
    console.error("網址解析失敗:", e);
  }
  return null;
}

/**
 * 計算座標並顯示懸浮泡泡 (Tooltip)
 */
function showTooltip(targetElement, text) {
  removeTooltip();

  const tooltip = document.createElement("div");
  tooltip.className = "yt-sub-preview-tooltip";
  tooltip.innerText = text;

  // 插入至 document.body 避免受父元素 overflow: hidden 影響
  document.body.appendChild(tooltip);
  activeTooltip = tooltip;

  // 取得連結與 Tooltip 的像素尺寸
  const rect = targetElement.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // 計算座標 (預設顯示在連結正上方，水平置中)
  let top = rect.top - tooltipRect.height - 8;
  let left = rect.left + (rect.width - tooltipRect.width) / 2;

  // 若頂部空間不足，自動切換至連結下方
  if (top < 10) {
    top = rect.bottom + 8;
  }

  // 避免左右超出螢幕邊界
  if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }
  if (left < 10) {
    left = 10;
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  tooltip.classList.add("yt-sub-preview-show");
}

function updateTooltipText(text) {
  if (activeTooltip) {
    activeTooltip.innerText = text;
  }
}

function removeTooltip() {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

/**
 * 將數值格式化為易讀字串 (如: 1234567 -> 123.4萬)
 */
function formatSubscriberCount(countStr) {
  const num = parseInt(countStr, 10);
  if (isNaN(num)) return countStr;

  return new Intl.NumberFormat("zh-TW", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(num);
}

/**
 * 將 API 回傳的 ISO 3166-1 國家代碼轉為繁體中文地區名稱
 */
function formatChannelRegion(countryCode) {
  if (!countryCode) return "未公開";

  try {
    return (
      new Intl.DisplayNames(["zh-TW"], { type: "region" }).of(countryCode) ||
      countryCode
    );
  } catch (e) {
    return countryCode;
  }
}
