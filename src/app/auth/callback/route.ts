import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Only allow same-origin relative paths (open-redirect guard). */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}

/**
 * Supabase OAuth / magic-link callback.
 * Exchanges ?code= for a session cookie on the redirect response, then sends
 * the user into the app. Cookies must be written onto the redirect response
 * itself — cookieStore.set alone can drop them on some Next runtimes.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const oauthError =
    url.searchParams.get("error_description") ||
    url.searchParams.get("error");

  if (oauthError) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", oauthError);
    return NextResponse.redirect(login);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const redirect = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirect.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", error.message);
    return NextResponse.redirect(login);
  }

  return redirect;
}
