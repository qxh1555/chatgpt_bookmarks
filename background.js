chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "conversation-bookmarks:toggle" });
    await chrome.action.setBadgeText({ tabId: tab.id, text: "" });
    await chrome.action.setTitle({ tabId: tab.id, title: "打开对话书签" });
  } catch {
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: "请打开 ChatGPT 对话；安装或更新后，请先刷新页面。"
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.id === chrome.runtime.id && message.type === "conversation-bookmarks:privacy") {
    chrome.tabs.create({ url: chrome.runtime.getURL("privacy.html") });
  }
});
