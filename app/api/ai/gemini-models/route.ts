import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const apiKey = req.nextUrl.searchParams.get("key")
  if (!apiKey) {
    return NextResponse.json({ error: "API key gerekli" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
      const msg = err?.error?.message || `HTTP ${res.status}`
      return NextResponse.json({ error: `Gemini hatası: ${msg}` }, { status: res.status })
    }
    const data = await res.json()
    // Sadece generateContent destekleyen modelleri filtrele
    const models: string[] = (data.models || [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent")
      )
      .map((m: { name: string }) => m.name.replace("models/", ""))
      .sort()
    return NextResponse.json({ models })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Bağlantı hatası"
    return NextResponse.json({ error: `Gemini'ye ulaşılamıyor: ${msg}` }, { status: 502 })
  }
}
