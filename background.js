// background.js

// 1. 請替換為你的 Google Cloud YouTube Data API Key
const API_KEY = "AIzaSyD6ePkaw8CVap70by11vIhglAKy40M_IlQ"; 

// 2. 設定各類資料的快取過期時間（單位毫秒）
const SUBSCRIBER_CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const VIDEO_VIEW_CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// 監聽來自 Content Script 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSubscriberCount") {
    handleGetSubscriberCount(request.identifier)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    // 回傳 true 告知 Chrome 將以非同步（Async）方式呼叫 sendResponse
    return true; 
  }
});

/**
 * 處理訂閱數查詢與快取邏輯
 * @param {string} identifier 頻道識別碼 (例如: "@username" 或 "UCxxx")
 */
async function handleGetSubscriberCount(identifier) {
  if (!identifier) {
    throw new Error("無效的頻道識別碼");
  }

  const now = Date.now();

  // --- 步驟 A：檢查 chrome.storage 本地快取 ---
  const cachedData = await chrome.storage.local.get([identifier]);
  const cacheEntry = cachedData[identifier];

  if (
    cacheEntry &&
    hasCompleteChannelData(cacheEntry) &&
    now - cacheEntry.subscriberCachedAt < SUBSCRIBER_CACHE_EXPIRY_MS &&
    now - cacheEntry.videoViewCachedAt < VIDEO_VIEW_CACHE_EXPIRY_MS
  ) {
    return {
      subscriberCount: cacheEntry.subscriberCount,
      hiddenSubscriberCount: cacheEntry.hiddenSubscriberCount,
      country: cacheEntry.country,
      videoCount: cacheEntry.videoCount,
      viewCount: cacheEntry.viewCount,
      publishedAt: cacheEntry.publishedAt,
      fromCache: true
    };
  }

  // --- 步驟 B：無快取或過期，發送 API 請求 ---
  let apiUrl = "";

  if (identifier.startsWith("UC")) {
    // 頻道 Channel ID
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&id=${identifier}&key=${API_KEY}`;
  } else {
    // 頻道 Handle (例如 @ChannelName)
    const handle = identifier.startsWith("@") ? identifier : `@${identifier}`;
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&forHandle=${encodeURIComponent(handle)}&key=${API_KEY}`;
  }

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`API 請求失敗，狀態碼：${response.status}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error("未找到該頻道的統計資料");
  }

  const channel = data.items[0];
  const statistics = channel.statistics || {};
  const snippet = channel.snippet || {};
  const hiddenSubscriberCount = statistics.hiddenSubscriberCount === true;
  const subscriberCount = hiddenSubscriberCount
    ? null
    : statistics.subscriberCount ?? null;
  const country = snippet.country ?? null;
  const videoCount = statistics.videoCount ?? null;
  const viewCount = statistics.viewCount ?? null;
  const publishedAt = snippet.publishedAt ?? null;

  // --- 步驟 C：將最新數據寫入 chrome.storage 快取 ---
  await chrome.storage.local.set({
    [identifier]: {
      subscriberCount: subscriberCount,
      hiddenSubscriberCount: hiddenSubscriberCount,
      country: country,
      videoCount: videoCount,
      viewCount: viewCount,
      publishedAt: publishedAt,
      subscriberCachedAt: now,
      videoViewCachedAt: now
    }
  });

  return {
    subscriberCount: subscriberCount,
    hiddenSubscriberCount: hiddenSubscriberCount,
    country: country,
    videoCount: videoCount,
    viewCount: viewCount,
    publishedAt: publishedAt,
    fromCache: false
  };
}

function hasCompleteChannelData(cacheEntry) {
  return [
    "subscriberCount",
    "hiddenSubscriberCount",
    "country",
    "videoCount",
    "viewCount",
    "publishedAt",
    "subscriberCachedAt",
    "videoViewCachedAt"
  ].every((field) => Object.prototype.hasOwnProperty.call(cacheEntry, field));
}
