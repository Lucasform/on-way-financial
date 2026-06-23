import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (items: { name: string; value: string; options: CookieOptions }[]) => {
          items.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          items.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login");
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/transactions") ||
    path.startsWith("/obra") ||
    path.startsWith("/modules") ||
    path.startsWith("/setup") ||
    path.startsWith("/suppliers") ||
    path.startsWith("/reports") ||
    path.startsWith("/import") ||
    path.startsWith("/family") ||
    path.startsWith("/accounts") ||
    path.startsWith("/budgets") ||
    path.startsWith("/recurring") ||
    path.startsWith("/goals") ||
    path.startsWith("/settings");

  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
