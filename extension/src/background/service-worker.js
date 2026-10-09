import { getAuthSession, saveBookmark } from "../api.js";

const MENU_ID = "save-page-to-internet-memory";

void chrome.storage.local
  .setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
  .catch((error) => {
    console.error("Could not restrict extension storage to trusted contexts.", error);
  });

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Save page to ThinkPin",
      contexts: ["page", "link"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const url = info.linkUrl ?? info.pageUrl ?? tab?.url;
  if (url) void quickSave(url);
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "save-current-page") return;
  void (async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url) await quickSave(tab.url);
  })();
});

async function quickSave(url) {
  if (!/^https?:\/\//i.test(url)) {
    await showBadge("!", "Only HTTP and HTTPS pages can be saved.");
    return;
  }
  try {
    const session = await getAuthSession();
    if (!session) {
      await showBadge("!", "Open the extension popup and sign in first.");
      return;
    }
    const result = await saveBookmark(url);
    await showBadge(
      "✓",
      result.duplicate ? "Already saved to your library." : "Saved to your library.",
    );
  } catch (error) {
    await showBadge("!", error.message);
  }
}

async function showBadge(text, message) {
  await chrome.action.setBadgeBackgroundColor({
    color: text === "!" ? "#ec6765" : "#65c467",
  });
  await chrome.action.setBadgeText({ text });
  await chrome.action.setTitle({ title: message });
}
