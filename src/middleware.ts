import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const USER_ID_HEADER = "x-uid";

export async function middleware(request: NextRequest) {
  // Remove qualquer valor que o cliente tenha mandado nesse header antes de decidirmos o real
  // (nunca confiar em header vindo do request original pra essa finalidade).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(USER_ID_HEADER);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

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
    pathname.startsWith("/settings") ||
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

  // Repassa o id do usuário já validado pra dentro (via header do request), pra loadActiveContext()
  // não precisar chamar auth.getUser() de novo lá — some com um round-trip inteiro por navegação.
  if (user) {
    requestHeaders.set(USER_ID_HEADER, user.id);
    const withHeader = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.getAll().forEach((c) => withHeader.cookies.set(c));
    response = withHeader;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|workbox-.*|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico)$|api/whatsapp/.*|api/cron/.*).*)",
  ],
};
