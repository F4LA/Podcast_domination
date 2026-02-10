import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/auth/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Allow API routes except dashboard data (webhooks, cron jobs need to work)
  if (pathname.startsWith("/api/")) {
    // These API routes should be protected
    const protectedApiRoutes = [
      "/api/podcasts",
      "/api/discovery",
      "/api/draft",
      "/api/outreach",
      "/api/settings",
      "/api/analytics",
    ];
    
    const isProtectedApi = protectedApiRoutes.some(route => 
      pathname.startsWith(route)
    );
    
    if (!isProtectedApi) {
      return NextResponse.next();
    }
  }
  
  // Check for auth cookie
  const authToken = request.cookies.get("auth_token");
  
  if (!authToken || authToken.value !== "authenticated") {
    // Redirect to login for page requests
    if (!pathname.startsWith("/api/")) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Return 401 for API requests
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.ico$).*)",
  ],
};

