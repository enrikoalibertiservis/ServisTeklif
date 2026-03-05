export { default } from "next-auth/middleware"

/**
 * Tüm /dashboard/* rotaları oturum gerektiriyor.
 * Oturum yoksa NextAuth otomatik olarak /login'e yönlendirir.
 */
export const config = {
  matcher: ["/dashboard/:path*"],
}
