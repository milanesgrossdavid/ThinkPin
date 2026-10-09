const MAX_ACCESS_TOKEN_LENGTH = 8192;
const DEFAULT_APP_URL = "https://thinkpin.app";

export async function getSettings() {
  const { appUrl } = await chrome.storage.local.get("appUrl");
  return { appUrl: appUrl || DEFAULT_APP_URL };
}

export function normalizeAppUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid app URL.");
  }
  if (
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1"))) ||
    url.username ||
    url.password
  ) {
    throw new Error("Use an HTTPS app URL (HTTP is allowed only on localhost).");
  }
  return url.origin;
}

function originPattern(value) {
  const url = new URL(value);
  return `${url.origin}/*`;
}

export async function requestHostAccess(value) {
  const pattern = originPattern(value);
  const granted = await chrome.permissions.request({ origins: [pattern] });
  if (!granted) {
    throw new Error("Allow network access to this host to continue.");
  }
}

export async function saveAppUrl(value) {
  const appUrl = normalizeAppUrl(value);
  await requestHostAccess(appUrl);
  const config = await fetchSupabaseConfig(appUrl);
  const { appUrl: oldAppUrl, supabaseConfig: oldConfig } =
    await chrome.storage.local.get(["appUrl", "supabaseConfig"]);
  if (
    (oldAppUrl && oldAppUrl !== appUrl) ||
    (oldConfig && oldConfig.supabaseUrl !== config.supabaseUrl)
  ) {
    await chrome.storage.local.remove("authSession");
  }
  await chrome.storage.local.set({ appUrl, supabaseConfig: config });
  return { appUrl, config };
}

export async function fetchSupabaseConfig(appUrl) {
  const response = await fetch(`${appUrl}/api/extension/config`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body && typeof body.error === "string"
        ? body.error
        : "Could not connect to the ThinkPin app.",
    );
  }
  if (
    typeof body?.supabaseUrl !== "string" ||
    typeof body?.supabasePublishableKey !== "string"
  ) {
    throw new Error("The app returned invalid authentication configuration.");
  }
  const supabaseUrl = new URL(body.supabaseUrl);
  if (
    supabaseUrl.protocol !== "https:" &&
    supabaseUrl.hostname !== "localhost" &&
    supabaseUrl.hostname !== "127.0.0.1"
  ) {
    throw new Error("The configured Supabase endpoint must use HTTPS.");
  }
  return {
    supabaseUrl: supabaseUrl.origin,
    supabasePublishableKey: body.supabasePublishableKey,
  };
}

async function getSupabaseConfig() {
  const { appUrl, supabaseConfig } = await chrome.storage.local.get([
    "appUrl",
    "supabaseConfig",
  ]);
  if (
    typeof supabaseConfig?.supabaseUrl === "string" &&
    typeof supabaseConfig?.supabasePublishableKey === "string"
  ) {
    return supabaseConfig;
  }
  throw new Error(
    typeof appUrl === "string"
      ? "Reconnect the app before signing in."
      : "Set your ThinkPin app URL first.",
  );
}

async function supabaseAuthRequest(config, path, payload) {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: config.supabasePublishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    let message =
      result?.msg || result?.message || result?.error_description ||
      result?.error || "Authentication failed.";
    if (/invalid login credentials/i.test(String(message))) {
      message =
        "Email or password is incorrect. If you use Google to sign in, choose “Continue with Google” instead.";
    }
    throw new Error(String(message));
  }
  return result;
}

function createPkceVerifier() {
  const random = new Uint32Array(56);
  crypto.getRandomValues(random);
  return Array.from(random, (value) => value.toString(16).padStart(8, "0")).join("");
}

async function createPkceChallenge(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const bytes = String.fromCharCode(...new Uint8Array(digest));
  return btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function launchOAuthFlow(url) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url, interactive: true },
      (redirectUrl) => {
        if (chrome.runtime.lastError) {
          const message = chrome.runtime.lastError.message;
          reject(
            new Error(
              /only one web auth flow/i.test(message)
                ? "Chrome still has another sign-in attempt open. Close any Google sign-in window opened by this extension. If none is visible, fully quit and reopen Chrome, then reload the extension and try again."
                : message,
            ),
          );
          return;
        }
        if (!redirectUrl) {
          reject(new Error("Google sign-in did not return to the extension."));
          return;
        }
        resolve(redirectUrl);
      },
    );
  });
}

export async function signInWithGoogle() {
  const config = await getSupabaseConfig();
  const redirectUrl = chrome.identity.getRedirectURL();
  const verifier = createPkceVerifier();
  const challenge = await createPkceChallenge(verifier);
  const authorizeUrl = new URL(`${config.supabaseUrl}/auth/v1/authorize`);
  authorizeUrl.searchParams.set("provider", "google");
  authorizeUrl.searchParams.set("redirect_to", redirectUrl);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "s256");

  const callback = new URL(await launchOAuthFlow(authorizeUrl.toString()));
  const expectedRedirect = new URL(redirectUrl);
  if (
    callback.origin !== expectedRedirect.origin ||
    callback.pathname !== expectedRedirect.pathname
  ) {
    throw new Error("Google returned an unexpected sign-in redirect.");
  }
  const oauthError =
    callback.searchParams.get("error_description") ??
    callback.searchParams.get("error");
  if (oauthError) throw new Error(oauthError);
  const code = callback.searchParams.get("code");
  if (!code) throw new Error("Google sign-in did not return an authorization code.");

  const session = await supabaseAuthRequest(config, "token?grant_type=pkce", {
    auth_code: code,
    code_verifier: verifier,
  });
  if (
    typeof session.access_token !== "string" ||
    session.access_token.length > MAX_ACCESS_TOKEN_LENGTH ||
    typeof session.refresh_token !== "string" ||
    !session.user?.id
  ) {
    throw new Error("Google sign-in returned an invalid session.");
  }
  await chrome.storage.local.set({
    authSession: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: sessionExpiry(session),
      email: session.user.email ?? "",
    },
  });
}

function sessionExpiry(session) {
  const expiresIn = Number(session.expires_in);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error("Authentication returned an invalid session expiry.");
  }
  return Date.now() + expiresIn * 1000;
}

export async function signIn(email, password) {
  const config = await getSupabaseConfig();
  const session = await supabaseAuthRequest(
    config,
    "token?grant_type=password",
    { email, password },
  );
  if (
    typeof session.access_token !== "string" ||
    session.access_token.length > MAX_ACCESS_TOKEN_LENGTH ||
    typeof session.refresh_token !== "string" ||
    !session.user?.id
  ) {
    throw new Error("Authentication returned an invalid session.");
  }
  await chrome.storage.local.set({
    authSession: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: sessionExpiry(session),
      email: session.user.email ?? email,
    },
  });
}

export async function signOut() {
  const { authSession, supabaseConfig } = await chrome.storage.local.get([
    "authSession",
    "supabaseConfig",
  ]);
  await chrome.storage.local.remove("authSession");
  let revoked = true;
  if (authSession?.accessToken && supabaseConfig) {
    try {
      const response = await fetch(`${supabaseConfig.supabaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: supabaseConfig.supabasePublishableKey,
          Authorization: `Bearer ${authSession.accessToken}`,
        },
      });
      revoked = response.ok;
    } catch (error) {
      revoked = false;
      console.warn("Could not revoke the extension session remotely.", error);
    }
  }
  return { revoked };
}

export async function getAuthSession() {
  const { authSession } = await chrome.storage.local.get("authSession");
  return authSession ?? null;
}

async function getFreshSession() {
  const session = await getAuthSession();
  if (!session) throw new Error("Sign in to ThinkPin to save pages.");
  if (session.expiresAt > Date.now() + 60_000) return session;

  const config = await getSupabaseConfig();
  try {
    const refreshed = await supabaseAuthRequest(
      config,
      "token?grant_type=refresh_token",
      { refresh_token: session.refreshToken },
    );
    const nextSession = {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: sessionExpiry(refreshed),
      email: refreshed.user?.email ?? session.email,
    };
    if (
      typeof nextSession.accessToken !== "string" ||
      typeof nextSession.refreshToken !== "string" ||
      nextSession.accessToken.length > MAX_ACCESS_TOKEN_LENGTH
    ) {
      throw new Error("Session refresh returned invalid credentials.");
    }
    await chrome.storage.local.set({ authSession: nextSession });
    return nextSession;
  } catch (error) {
    await chrome.storage.local.remove("authSession");
    throw error;
  }
}

export async function appRequest(path, options = {}) {
  const session = await getFreshSession();
  const { appUrl } = await getSettings();
  const response = await fetch(`${appUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${session.accessToken}`,
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      await chrome.storage.local.remove("authSession");
    }
    const message =
      body && typeof body.error === "string"
        ? body.error
        : response.status === 409
          ? "This page is already in your library."
          : "The request could not be completed.";
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export async function saveBookmark(url, organization = {}) {
  let response;
  try {
    response = await appRequest("/api/bookmarks", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  } catch (error) {
    if (error.status !== 409 || error.body?.code !== "BOOKMARK_ALREADY_EXISTS") {
      throw error;
    }
    response = {
      duplicate: true,
      bookmarkId: error.body.bookmarkId,
      processingQueued: error.body.processingQueued,
    };
  }

  const bookmarkId = response.bookmark?.id ?? response.bookmarkId;
  if (!bookmarkId) throw new Error("The app did not return the saved bookmark.");
  const updates = {};
  if (organization.collection) updates.collection = organization.collection;
  if (organization.tags?.length) updates.tags = organization.tags;
  if (organization.savedReason) updates.savedReason = organization.savedReason;

  if (Object.keys(updates).length) {
    try {
      await appRequest(`/api/bookmarks/${encodeURIComponent(bookmarkId)}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    } catch (error) {
      error.message = `Bookmark saved, but its organization could not be updated: ${error.message}`;
      error.bookmarkSaved = true;
      throw error;
    }
  }
  return {
    bookmarkId,
    duplicate: response.duplicate === true,
    processingQueued:
      response.processingQueued ?? response.bookmark?.processingQueued ?? false,
  };
}
