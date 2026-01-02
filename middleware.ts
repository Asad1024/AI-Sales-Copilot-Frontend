import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Minimal middleware: keep legacy auth routes working by redirecting to the native auth pages.
 */
export default function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.redirect(new URL(`/auth/login${search}`, req.url));
  }

  if (pathname === "/sign-in" || pathname.startsWith("/sign-in/")) {
    return NextResponse.redirect(new URL(`/auth/login${search}`, req.url));
  }

  if (pathname === "/sign-up" || pathname.startsWith("/sign-up/")) {
    return NextResponse.redirect(new URL(`/auth/signup${search}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login/:path*", "/sign-in/:path*", "/sign-up/:path*"],
};

