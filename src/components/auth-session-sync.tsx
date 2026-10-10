"use client";

import { useEffect } from "react";
import { createClient } from "../lib/supabase/client";
import {
  identifyAnalyticsUser,
  resetAnalyticsUser,
} from "../lib/analytics";

const authStorageKey = "thinkpin:is-authenticated";

function saveAuthStatus(isAuthenticated: boolean) {
  try {
    window.localStorage.setItem(authStorageKey, String(isAuthenticated));
  } catch (error) {
    console.warn("Could not cache the current authentication status.", error);
  }
}

export function AuthSessionSync() {
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Could not read the current authentication session.", error);
        return;
      }
      if (isMounted) {
        saveAuthStatus(Boolean(data.session));
        if (data.session?.user.id) identifyAnalyticsUser(data.session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        saveAuthStatus(false);
        resetAnalyticsUser();
      } else if (session) {
        saveAuthStatus(true);
        identifyAnalyticsUser(session.user.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
