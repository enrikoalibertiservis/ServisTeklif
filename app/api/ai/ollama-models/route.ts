import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const url = req.nextUrl.searchParams.get("url") || "http://localhost:11434"
  const base = url.replace(/\/$/, "")

  try {
    const res = await fetch(`${base}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Ollama yanıt vermedi (HTTP ${res.status})` },
        { status: 502 }
      )
    }
    const data = await res.json()
    const models: string[] = (data.models || []).map((m: { name: string }) => m.name)
    return NextResponse.json({ models })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Bağlantı hatası"
    return NextResponse.json(
      { error: `Ollama'ya ulaşılamıyor: ${msg}` },
      { status: 502 }
    )
  }
}
