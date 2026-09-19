const API_KEY_STORAGE_KEY = "youtubeApiKey";
const SETTINGS_STORAGE_KEY = "previewSettings";
const FIELDS = ["subscriberCount", "videoCount", "viewCount", "country", "publishedAt"];
const CACHE_DAYS = [0, 1, 3, 7, 30];
const PERMANENT_CACHE_VALUE = -1;
const DEFAULT_SETTINGS = {
  fields: Object.fromEntries(FIELDS.map((field) => [field, true])),
  cacheDays: { subscriberCount: 7, videoCount: 30, viewCount: 30, country: -1, publishedAt: -1 }
};
const apiKeyInput = document.querySelector("#api-key");
const status = document.querySelector("#status");

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const storedConfig = await chrome.storage.local.get([API_KEY_STORAGE_KEY, SETTINGS_STORAGE_KEY]);
    apiKeyInput.value = storedConfig[API_KEY_STORAGE_KEY] || "";
    const settings = normalizeSettings(storedConfig[SETTINGS_STORAGE_KEY]);
    FIELDS.forEach((field) => {
      document.querySelector(`[data-field="${field}"]`).checked = settings.fields[field];
      const select = document.querySelector(`[data-cache-field="${field}"]`);
      const options = ["country", "publishedAt"].includes(field)
        ? [[0, "不快取"], [PERMANENT_CACHE_VALUE, "永久"]]
        : CACHE_DAYS.map((days) => [
            days,
            days === 0 ? "不快取" : `${days} ${days === 1 ? "day" : "days"}`
          ]);
      options.forEach(([value, label]) => select.add(new Option(label, value)));
      select.value = settings.cacheDays[field];
    });
    await refreshCacheInfo();
  } catch {
    status.textContent = "無法讀取設定，請重新載入選項頁";
  }
});

document.querySelector("#save").addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  try {
    const values = { [SETTINGS_STORAGE_KEY]: readSettings() };
    if (apiKey) values[API_KEY_STORAGE_KEY] = apiKey;
    await chrome.storage.local.set(values);
    status.textContent = "設定已儲存";
  } catch {
    status.textContent = "設定儲存失敗，請重新載入選項頁";
  }
});

document.querySelector("#validate").addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    status.textContent = "請先輸入 API Key";
    return;
  }

  status.textContent = "正在驗證 API Key...";
  try {
    const response = await chrome.runtime.sendMessage({
      action: "validateApiKey",
      apiKey
    });
    status.textContent = response?.success
      ? "API Key 有效"
      : response?.error || "API Key 驗證失敗";
  } catch {
    status.textContent = "API Key 驗證失敗，請重新載入選項頁";
  }
});

document.querySelector("#clear").addEventListener("click", async () => {
  try {
    await chrome.storage.local.remove(API_KEY_STORAGE_KEY);
    apiKeyInput.value = "";
    status.textContent = "API Key 已清除";
  } catch {
    status.textContent = "API Key 清除失敗，請重新載入選項頁";
  }
});

document.querySelector("#clear-cache").addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({ action: "clearCache" });
  status.textContent = response?.success ? "所有快取已清除" : response?.error || "快取清除失敗";
  await refreshCacheInfo();
});

function readSettings() {
  return {
    fields: Object.fromEntries(FIELDS.map((field) => [
      field, document.querySelector(`[data-field="${field}"]`).checked
    ])),
    cacheDays: Object.fromEntries(FIELDS.map((field) => [
      field, Number(document.querySelector(`[data-cache-field="${field}"]`).value)
    ]))
  };
}

function normalizeSettings(settings) {
  const cacheDays = {
    ...DEFAULT_SETTINGS.cacheDays,
    ...(settings?.cacheDays || {})
  };
  ["country", "publishedAt"].forEach((field) => {
    if (Number(cacheDays[field]) === 30) cacheDays[field] = PERMANENT_CACHE_VALUE;
  });
  return {
    fields: { ...DEFAULT_SETTINGS.fields, ...(settings?.fields || {}) },
    cacheDays
  };
}

async function refreshCacheInfo() {
  const response = await chrome.runtime.sendMessage({ action: "getCacheInfo" });
  if (!response?.success) return;
  document.querySelector("#cache-size").textContent = formatBytes(response.bytes);
  document.querySelector("#cache-entries").textContent = response.entries;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
