import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// ── In-memory rate limiter (IP bazlı) ───────────────────────
const RATE_WINDOW_MS  = 15 * 60 * 1000 // 15 dakika
const MAX_ATTEMPTS    = 10              // pencere başına maksimum deneme

interface RateEntry { count: number; resetAt: number }
const ratemap = new Map<string, RateEntry>()

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const entry = ratemap.get(ip)

  if (!entry || now > entry.resetAt) {
    ratemap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true, retryAfterSec: 0 }
}
// ─────────────────────────────────────────────────────────────

/** Şifre doğrulama — 2FA gerekli mi? (session oluşturmaz) */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed, retryAfterSec } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: `Çok fazla deneme. ${Math.ceil(retryAfterSec / 60)} dakika sonra tekrar deneyin.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(MAX_ATTEMPTS),
        },
      }
    )
  }

  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: "Eksik alan" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) return NextResponse.json({ error: "Geçersiz kimlik bilgileri" }, { status: 401 })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return NextResponse.json({ error: "Geçersiz kimlik bilgileri" }, { status: 401 })

  return NextResponse.json({ requires2fa: user.twoFactorEnabled })
}
