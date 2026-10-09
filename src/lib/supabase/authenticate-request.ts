import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "./server";
import { getSupabasePublicConfig } from "./env";
import { throwIfSupabaseAuthUnavailable } from "./auth-errors";

const MAX_ACCESS_TOKEN_LENGTH = 8_192;

export async function authenticateSupabaseRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization === null) {
    const supabase = await createCookieClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    throwIfSupabaseAuthUnavailable(error);

    if (
      error &&
      error.status !== 401 &&
      error.name !== "AuthSessionMissingError"
    ) {
      throw error;
    }
    return { supabase, user };
  }

  const { url, publishableKey } = getSupabasePublicConfig();
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  const accessToken = match?.[1];
  const supabase = createSupabaseClient(url, publishableKey, {
    ...(accessToken && accessToken.length <= MAX_ACCESS_TOKEN_LENGTH
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  if (!accessToken || accessToken.length > MAX_ACCESS_TOKEN_LENGTH) {
    return { supabase, user: null };
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  throwIfSupabaseAuthUnavailable(error);
  if (
    error &&
    error.status !== 401 &&
    error.status !== 403 &&
    error.name !== "AuthApiError"
  ) {
    throw error;
  }

  return { supabase, user };
}
