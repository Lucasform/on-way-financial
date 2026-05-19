import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // Refresh do token (revalida sessão a cada request)
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isAppArea =
    pathname.startsWith("/overview") ||
    pathname.startsWith("/transactions") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/payment-methods") ||
    pathname.startsWith("/family") ||
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/modules") ||
    pathname.startsWith("/onboarding");

  if (isAppArea && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|workbox-.*|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$|api/whatsapp/.*|api/cron/.*).*)",
  ],
};
