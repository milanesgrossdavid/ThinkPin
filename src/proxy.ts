import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./lib/supabase/env";
import { isSupabaseAuthUnavailable } from "./lib/supabase/auth-errors";

function legacyAppPath(pathname: string) {
  if (pathname === "/dashboard") {
    return "/app";
  }
  if (pathname === "/library" || pathname.startsWith("/library/")) {
    return pathname.replace(/^\/library/, "/app/bookmarks");
  }
  if (pathname === "/collections" || pathname.startsWith("/collections/")) {
    return pathname.replace(/^\/collections/, "/app/collections");
  }
  if (pathname === "/search" || pathname.startsWith("/search/")) {
    return pathname.replace(/^\/search/, "/app/search");
  }
  if (pathname === "/save" || pathname.startsWith("/save/")) {
    return pathname.replace(/^\/save/, "/app/save");
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const legacyPath = legacyAppPath(request.nextUrl.pathname);
  if (legacyPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyPath;
    return NextResponse.redirect(redirectUrl);
  }

  const { url, publishableKey } = getSupabasePublicConfig();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  if (isSupabaseAuthUnavailable(error)) {
    const unavailableResponse = new NextResponse(
      "Authentication is temporarily unavailable. Please try again shortly.",
      { status: 503 },
    );
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      unavailableResponse.cookies.set(cookie);
    });
    return unavailableResponse;
  }

  if (error || !data?.claims?.sub) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    const redirectResponse = NextResponse.redirect(loginUrl);

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/app/:path*",
    "/dashboard/:path*",
    "/library/:path*",
    "/collections/:path*",
    "/search/:path*",
    "/save/:path*",
  ],
};
