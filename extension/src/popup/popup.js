import {
  getAuthSession,
  getSettings,
  saveAppUrl,
  saveBookmark,
  signIn,
  signOut,
} from "../api.js";

const byId = (id) => document.getElementById(id);
const setupSection = byId("setup");
const authSection = byId("auth");
const saveSection = byId("save-panel");
const statusElement = byId("status");
let activeTab = null;
let supabaseOrigin = null;
let supabasePermissionGranted = false;

function setStatus(message, type = "info") {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
}

function hideStatus() {
  statusElement.textContent = "";
  statusElement.className = "status hidden";
}

function setButtonBusy(button, busy, busyText, idleText) {
  button.disabled = busy;
  button.textContent = busy ? busyText : idleText;
}

function setOnboardingStage(stage) {
  const stages = ["connect", "authorize", "sign-in", "save"];
  const activeIndex = stages.indexOf(stage);
  stages.forEach((name, index) => {
    const item = byId(`step-${name}`);
    item.classList.toggle("complete", index < activeIndex);
    item.classList.toggle("active", index === activeIndex);
    if (index < activeIndex) {
      item.querySelector(".step-number").textContent = "✓";
    } else {
      item.querySelector(".step-number").textContent = String(index + 1);
    }
  });

  const copy = {
    connect: [
      "A little setup, then one-click saving",
      "Connect your library",
      "Link this extension to your ThinkPin account. Your bookmarks stay in one library, wherever you save them.",
    ],
    authorize: [
      "Your account stays private",
      "Allow a secure connection",
      "Give the extension permission to contact only your app and its sign-in service. It never reads or changes other sites.",
    ],
    "sign-in": [
      "One account, one library",
      "Sign in your way",
      "Use the same Google account or email and password you use on ThinkPin.",
    ],
    save: [
      "You’re all set",
      "Save this page for later",
      "Check the page below. Add optional details if you like, then save it to your library.",
    ],
  }[stage];
  byId("eyebrow").textContent = copy[0];
  byId("welcome-title").textContent = copy[1];
  byId("welcome-copy").textContent = copy[2];
  byId("connection-label").textContent =
    stage === "save" ? "Connected" : stage === "connect" ? "Not connected" : "Almost there";
  byId("connection-badge").classList.toggle("is-connected", stage === "save");
}

function getSafePageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

async function showCurrentTab() {
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageUrl = getSafePageUrl(activeTab?.url ?? "");
  if (!pageUrl) {
    saveSection.classList.add("hidden");
    setStatus("This browser page can't be saved. Open a public HTTP or HTTPS page.", "error");
    return;
  }
  byId("page-domain").textContent = pageUrl.hostname;
  byId("page-title").textContent = activeTab.title || pageUrl.hostname;
  byId("page-url").textContent = pageUrl.href;
  saveSection.classList.remove("hidden");
}

async function render() {
  hideStatus();
  const settings = await getSettings();
  byId("app-url").value = settings.appUrl;
  byId("settings-app-url").value = settings.appUrl;
  byId("web-login").href = `${settings.appUrl}/login`;
  byId("library-link").href = `${settings.appUrl}/app/bookmarks`;
  byId("brand-link").href = `${settings.appUrl}/app`;
  const configured = await chrome.storage.local.get("supabaseConfig");
  setupSection.classList.toggle("hidden", Boolean(configured.supabaseConfig));
  if (!configured.supabaseConfig) {
    setOnboardingStage("connect");
    authSection.classList.add("hidden");
    saveSection.classList.add("hidden");
    return;
  }
  supabaseOrigin = configured.supabaseConfig
    ? new URL(configured.supabaseConfig.supabaseUrl).origin
    : null;
  const { origins = [] } = await chrome.permissions.getAll();
  supabasePermissionGranted = origins.some((pattern) => {
    try {
      return new URL(pattern.replace(/\/\*$/, "")).origin === supabaseOrigin;
    } catch {
      return false;
    }
  });
  byId("permission-card").classList.toggle("hidden", supabasePermissionGranted);
  byId("authorize-supabase").classList.toggle("hidden", supabasePermissionGranted);
  byId("auth-methods").classList.toggle("hidden", !supabasePermissionGranted);
  byId("oauth-redirect-url").textContent = chrome.identity.getRedirectURL();
  byId("oauth-redirect-help").classList.toggle(
    "hidden",
    !supabasePermissionGranted,
  );
  const session = await getAuthSession();
  const activeSession = session && session.expiresAt > Date.now();
  if (session && !activeSession) {
    await chrome.storage.local.remove("authSession");
  }
  authSection.classList.toggle("hidden", Boolean(activeSession));
  byId("account-email").textContent = activeSession
    ? session.email || "your account"
    : "";
  if (activeSession) {
    setOnboardingStage("save");
    byId("saved-confirmation").classList.add("hidden");
    byId("authorize-supabase").classList.add("hidden");
    byId("auth-form").classList.add("hidden");
    byId("auth-methods").classList.add("hidden");
    await showCurrentTab();
  } else {
    saveSection.classList.add("hidden");
    setOnboardingStage(
      supabasePermissionGranted ? "sign-in" : "authorize",
    );
  }
}

byId("setup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideStatus();
  const button = event.currentTarget.querySelector("button[type=submit]");
  setButtonBusy(button, true, "Connecting…", "Connect app");
  try {
    await saveAppUrl(byId("app-url").value);
    await render();
    setStatus("App connected. Allow secure sign-in to continue.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setButtonBusy(button, false, "Connecting…", "Connect app");
  }
});

byId("authorize-supabase").addEventListener("click", async () => {
  hideStatus();
  try {
    if (!supabaseOrigin) {
      throw new Error("Connect the app before authorizing sign-in.");
    }
    const permission = chrome.permissions.request({ origins: [`${supabaseOrigin}/*`] });
    if (!(await permission)) {
      throw new Error("Allow access to Supabase to sign in securely.");
    }
    await render();
    setStatus("Secure connection allowed. Choose how you sign in.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

byId("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideStatus();
  const button = event.currentTarget.querySelector("button[type=submit]");
  setButtonBusy(button, true, "Signing in…", "Sign in");
  try {
    await signIn(byId("email").value.trim(), byId("password").value);
    byId("password").value = "";
    await render();
  } catch (error) {
    setStatus(error.message, "error");
    if (/session|token|sign in/i.test(error.message)) {
      await render();
    }
  } finally {
    setButtonBusy(button, false, "Signing in…", "Sign in");
  }
});

byId("google-sign-in").addEventListener("click", async () => {
  hideStatus();
  try {
    await chrome.tabs.create({
      url: chrome.runtime.getURL("src/auth/auth.html"),
    });
    setStatus("Secure sign-in opened in a new tab. Complete it there, then return here.", "info");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

byId("copy-redirect").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(chrome.identity.getRedirectURL());
    byId("copy-redirect").textContent = "Copied";
  } catch (error) {
    setStatus(`Could not copy the URL: ${error.message}`, "error");
  }
});

byId("save-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideStatus();
  const button = byId("save-button");
  setButtonBusy(button, true, "Saving…", "Save bookmark");
  const tags = byId("tags").value
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
  if (tags.length > 30 || tags.some((tag) => tag.length > 80)) {
    setStatus("Use up to 30 tags, each 80 characters or fewer.", "error");
    setButtonBusy(button, false, "Saving…", "Save bookmark");
    return;
  }
  try {
    const result = await saveBookmark(activeTab.url, {
      collection: byId("collection").value.trim(),
      tags,
      savedReason: byId("saved-reason").value.trim(),
    });
    byId("saved-title").textContent = result.duplicate
      ? "Already in your library"
      : "Saved to your library";
    byId("saved-message").textContent = result.duplicate
      ? result.processingQueued
        ? "This page was already saved. Its background processing is still underway."
        : "This page is already in your library."
      : result.processingQueued
        ? "Your page is being organized in the background. You can keep browsing."
        : "The page is saved. Background processing may need to be retried.";
    byId("saved-confirmation").classList.remove("hidden");
    byId("tags").value = "";
    byId("collection").value = "";
    byId("saved-reason").value = "";
    byId("organize-options").open = false;
  } catch (error) {
    if (error.status === 401) {
      await render();
    }
    setStatus(error.message, error.bookmarkSaved ? "info" : "error");
  } finally {
    setButtonBusy(button, false, "Saving…", "Save bookmark");
  }
});

byId("sign-out").addEventListener("click", async () => {
  const result = await signOut();
  await render();
  setStatus(
    result.revoked
      ? "Signed out of the extension."
      : "Signed out locally, but Supabase could not revoke the session. Try again when online.",
    result.revoked ? "info" : "error",
  );
});

byId("settings-toggle").addEventListener("click", () => {
  byId("settings").classList.toggle("hidden");
});

byId("settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideStatus();
  const button = event.currentTarget.querySelector("button[type=submit]");
  setButtonBusy(button, true, "Updating…", "Update connection");
  try {
    await saveAppUrl(byId("settings-app-url").value);
    byId("settings").classList.add("hidden");
    await render();
    setStatus("Connection updated.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setButtonBusy(button, false, "Updating…", "Update connection");
  }
});

void render().catch((error) => setStatus(error.message, "error"));
