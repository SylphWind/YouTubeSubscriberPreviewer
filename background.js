// background.js

const API_KEY_STORAGE_KEY = "youtubeApiKey";
const API_KEY_VALIDATION_CHANNEL_ID = "UC_x5XG1OV2P6uZZ5FSM9Ttw";
const SETTINGS_STORAGE_KEY = "previewSettings";
const CACHE_KEY_PREFIX = "channelCache:";
const CHANNEL_FIELDS = [
  "subscriberCount",
  "videoCount",
  "viewCount",
  "country",
  "publishedAt"
];
const DEFAULT_SETTINGS = {
  fields: {
    subscriberCount: true,
    videoCount: true,
    viewCount: true,
    country: true,
    publishedAt: true
  },
  cacheDays: {
    subscriberCount: 7,
    videoCount: 30,
    viewCount: 30,
    country: -1,
    publishedAt: -1
  }
};

// 監聽來自 Content Script 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSubscriberCount") {
    handleGetSubscriberCount(request.identifier)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    // 回傳 true 告知 Chrome 將以非同步（Async）方式呼叫 sendResponse
    return true; 
  }

  if (request.action === "getPreviewSettings") {
    getSettings()
      .then((settings) => sendResponse({ success: true, settings }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "getCacheInfo") {
    getCacheInfo()
      .then((info) => sendResponse({ success: true, ...info }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "clearCache") {
    clearCache()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "validateApiKey") {
    validateApiKey(request.apiKey)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function validateApiKey(apiKey) {
  const normalizedApiKey = apiKey?.trim();
  if (!normalizedApiKey) {
    throw new Error("請先輸入 API Key");
  }

  const apiUrl =
    `https://www.googleapis.com/youtube/v3/channels?part=id&id=${API_KEY_VALIDATION_CHANNEL_ID}` +
    `&key=${encodeURIComponent(normalizedApiKey)}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw await createApiError(response);
  }
}

/**
 * 處理訂閱數查詢與快取邏輯
 * @param {string} identifier 頻道識別碼 (例如: "@username" 或 "UCxxx")
 */
async function handleGetSubscriberCount(identifier) {
  if (!identifier) {
    throw new Error("無效的頻道識別碼");
  }

  const now = Date.now();
  const settings = await getSettings();

  // --- 步驟 A：檢查 chrome.storage 本地快取 ---
  const cacheKey = `${CACHE_KEY_PREFIX}${identifier}`;
  const cachedData = await chrome.storage.local.get([cacheKey, identifier]);
  const cacheEntry = cachedData[cacheKey] || cachedData[identifier];

  if (
    cacheEntry &&
    hasCompleteChannelData(cacheEntry) &&
    CHANNEL_FIELDS
      .filter((field) => settings.fields[field])
      .every((field) => isCacheValid(cacheEntry, field, settings, now))
  ) {
    return createChannelResult(cacheEntry, true);
  }

  // --- 步驟 B：無快取或過期，發送 API 請求 ---
  const storedConfig = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
  const apiKey = storedConfig[API_KEY_STORAGE_KEY]?.trim();
  if (!apiKey) {
    throw new Error("尚未設定 API Key，請開啟擴充功能選項頁設定");
  }

  let apiUrl = "";

  if (identifier.startsWith("UC")) {
    // 頻道 Channel ID
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&id=${identifier}&key=${encodeURIComponent(apiKey)}`;
  } else {
    // 頻道 Handle (例如 @ChannelName)
    const handle = identifier.startsWith("@") ? identifier : `@${identifier}`;
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&forHandle=${encodeURIComponent(handle)}&key=${encodeURIComponent(apiKey)}`;
  }

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw await createApiError(response);
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
  const cacheEntryToStore = {
      subscriberCount: subscriberCount,
      hiddenSubscriberCount: hiddenSubscriberCount,
      country: country,
      videoCount: videoCount,
      viewCount: viewCount,
      publishedAt: publishedAt,
      cachedAt: Object.fromEntries(CHANNEL_FIELDS.map((field) => [field, now]))
  };
  if (CHANNEL_FIELDS.some((field) => settings.cacheDays[field] !== 0)) {
    await chrome.storage.local.set({ [cacheKey]: cacheEntryToStore });
  } else {
    await chrome.storage.local.remove(cacheKey);
  }

  return createChannelResult(cacheEntryToStore, false);
}

function hasCompleteChannelData(cacheEntry) {
  return [
    "subscriberCount",
    "hiddenSubscriberCount",
    "country",
    "videoCount",
    "viewCount",
    "publishedAt",
    "cachedAt"
  ].every((field) => Object.prototype.hasOwnProperty.call(cacheEntry, field));
}

function createChannelResult(cacheEntry, fromCache) {
  return {
    subscriberCount: cacheEntry.subscriberCount,
    hiddenSubscriberCount: cacheEntry.hiddenSubscriberCount,
    country: cacheEntry.country,
    videoCount: cacheEntry.videoCount,
    viewCount: cacheEntry.viewCount,
    publishedAt: cacheEntry.publishedAt,
    fromCache
  };
}

function isCacheValid(cacheEntry, field, settings, now) {
  const days = settings.cacheDays[field];
  if (days === -1) return true;
  if (!days) return false;
  const cachedAt = cacheEntry.cachedAt?.[field] || cacheEntry[`${field}CachedAt`];
  return Number.isFinite(cachedAt) && now - cachedAt < days * 24 * 60 * 60 * 1000;
}

async function getSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  return normalizeSettings(stored[SETTINGS_STORAGE_KEY]);
}

function normalizeSettings(settings) {
  const result = {
    fields: { ...DEFAULT_SETTINGS.fields, ...(settings?.fields || {}) },
    cacheDays: { ...DEFAULT_SETTINGS.cacheDays, ...(settings?.cacheDays || {}) }
  };
  CHANNEL_FIELDS.forEach((field) => {
    result.fields[field] = result.fields[field] !== false;
    const days = Number(result.cacheDays[field]);
    const allowedDays = ["country", "publishedAt"].includes(field)
      ? [0, -1]
      : [0, 1, 3, 7, 30];
    result.cacheDays[field] = allowedDays.includes(days)
      ? days
      : DEFAULT_SETTINGS.cacheDays[field];
  });
  return result;
}

function isCacheEntry(value) {
  return value && typeof value === "object" && (
    Object.prototype.hasOwnProperty.call(value, "cachedAt") ||
    Object.prototype.hasOwnProperty.call(value, "subscriberCachedAt")
  );
}

async function getCacheInfo() {
  const allData = await chrome.storage.local.get(null);
  const keys = Object.keys(allData).filter((key) => isCacheEntry(allData[key]));
  const bytes = keys.reduce(
    (total, key) => total + new Blob([JSON.stringify({ [key]: allData[key] })]).size,
    0
  );
  return { bytes, entries: keys.length };
}

async function clearCache() {
  const allData = await chrome.storage.local.get(null);
  const keys = Object.keys(allData).filter((key) => isCacheEntry(allData[key]));
  if (keys.length) await chrome.storage.local.remove(keys);
}

async function createApiError(response) {
  let apiError;
  try {
    apiError = await response.json();
  } catch {
    apiError = null;
  }

  const reason = apiError?.error?.errors?.[0]?.reason;
  const messageByReason = {
    keyInvalid: "API Key 無效，請確認選項頁中的 Key 是否正確",
    dailyLimitExceeded: "YouTube API 今日配額已用完",
    quotaExceeded: "YouTube API 配額已用完",
    rateLimitExceeded: "YouTube API 請求過於頻繁，請稍後再試",
    accessNotConfigured: "Google Cloud 尚未啟用 YouTube Data API v3",
    ipRefererBlocked:
      "API Key 的應用程式限制不允許 Chrome 擴充功能，請移除 HTTP referrer 限制",
    forbidden:
      "API Key 沒有權限使用 YouTube Data API，請檢查 API 限制設定"
  };
  return new Error(
    messageByReason[reason] ||
      `API 請求失敗，狀態碼：${response.status}${reason ? `（${reason}）` : ""}`
  );
}
