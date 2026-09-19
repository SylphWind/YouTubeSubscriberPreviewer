const API_KEY_STORAGE_KEY = "youtubeApiKey";
const apiKeyInput = document.querySelector("#api-key");
const status = document.querySelector("#status");

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const storedConfig = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
    apiKeyInput.value = storedConfig[API_KEY_STORAGE_KEY] || "";
  } catch {
    status.textContent = "無法讀取設定，請重新載入選項頁";
  }
});

document.querySelector("#save").addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    status.textContent = "請輸入 API Key";
    return;
  }

  try {
    await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: apiKey });
    status.textContent = "API Key 已儲存";
  } catch {
    status.textContent = "API Key 儲存失敗，請重新載入選項頁";
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
