import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSupabaseAdmin, LOANER_DOCS_BUCKET } from "@/lib/supabase"

export const runtime = "nodejs"

// ── Yetki kontrolü ───────────────────────────────────────────
const LOANER_OPERATORS = ["serdar güler", "handan özçetin", "özgür zavalsız"]
function normName(n: string) {
  return n.toLowerCase().trim().replace(/İ/g, "i").replace(/I/g, "ı")
}
function canOperate(name: string) {
  return LOANER_OPERATORS.some(op => normName(op) === normName(name))
}

// ── Dosya kısıtlamaları ───────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg":      "jpg",
  "image/png":       "png",
  "image/webp":      "webp",
  "image/heic":      "heic",
  "application/pdf": "pdf",
}
const ALLOWED_TYPES      = Object.keys(MIME_TO_EXT)
const ALLOWED_FILE_TYPES = new Set(["contract", "license"])

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    if (!canOperate(session.user.name ?? ""))
      return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Sunucu yapılandırma hatası." }, { status: 500 })
    }

    const formData = await req.formData()
    const file     = formData.get("file") as File | null
    const loanId   = formData.get("loanId") as string | null
    const fileType = formData.get("fileType") as "contract" | "license" | null

    if (!file || !loanId || !fileType)
      return NextResponse.json({ error: "Eksik parametreler." }, { status: 400 })

    if (!ALLOWED_FILE_TYPES.has(fileType))
      return NextResponse.json({ error: "Geçersiz dosya türü parametresi." }, { status: 400 })

    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json(
        { error: `Dosya boyutu 5 MB'ı aşamaz. Seçilen: ${(file.size / 1024 / 1024).toFixed(1)} MB` },
        { status: 400 }
      )

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json(
        { error: "Desteklenmeyen dosya türü. PDF, JPG veya PNG yükleyin." },
        { status: 400 }
      )

    const loan = await prisma.loanerCarLoan.findUnique({ where: { id: loanId } })
    if (!loan) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 })

    let sb: ReturnType<typeof getSupabaseAdmin>
    try {
      sb = getSupabaseAdmin()
    } catch (envErr) {
      return NextResponse.json(
        { error: "Supabase yapılandırma hatası: " + (envErr instanceof Error ? envErr.message : String(envErr)) },
        { status: 500 }
      )
    }

    // Eski dosyayı sil
    const oldUrl = fileType === "contract" ? loan.contractFileUrl : loan.licenseFileUrl
    if (oldUrl) {
      const parts = oldUrl.split(`/object/public/${LOANER_DOCS_BUCKET}/`)
      const oldPath = parts[1]
      if (oldPath) {
        await sb.storage.from(LOANER_DOCS_BUCKET).remove([decodeURIComponent(oldPath)])
      }
    }

    // Yeni dosyayı yükle
    const ext         = MIME_TO_EXT[file.type] ?? "bin"
    const timestamp   = Date.now()
    const storagePath = `${loanId}/${fileType}-${timestamp}.${ext}`
    const buffer      = Buffer.from(await file.arrayBuffer())

    console.log(`Supabase upload: ${storagePath} (${(buffer.length / 1024).toFixed(0)} KB)`)

    const { error: uploadError } = await sb.storage
      .from(LOANER_DOCS_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error("Supabase upload error:", JSON.stringify(uploadError))
      return NextResponse.json(
        { error: `Depolama hatası: ${uploadError.message}` },
        { status: 500 }
      )
    }

    const { data: { publicUrl } } = sb.storage
      .from(LOANER_DOCS_BUCKET)
      .getPublicUrl(storagePath)

    const updateData = fileType === "contract"
      ? { contractFileUrl: publicUrl }
      : { licenseFileUrl: publicUrl }

    const updated = await prisma.loanerCarLoan.update({
      where: { id: loanId },
      data: updateData,
    })

    return NextResponse.json({ url: publicUrl, loan: updated })
  } catch (err) {
    console.error("Upload route error:", err)
    return NextResponse.json(
      { error: "Beklenmeyen hata: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    if (!canOperate(session.user.name ?? ""))
      return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

    const { loanId, fileType } = await req.json() as { loanId: string; fileType: "contract" | "license" }

    const loan = await prisma.loanerCarLoan.findUnique({ where: { id: loanId } })
    if (!loan) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 })

    const oldUrl = fileType === "contract" ? loan.contractFileUrl : loan.licenseFileUrl
    if (oldUrl) {
      try {
        const sb = getSupabaseAdmin()
        const parts = oldUrl.split(`/object/public/${LOANER_DOCS_BUCKET}/`)
        const oldPath = parts[1]
        if (oldPath) {
          await sb.storage.from(LOANER_DOCS_BUCKET).remove([decodeURIComponent(oldPath)])
        }
      } catch { /* silme hatası kritik değil */ }
    }

    const updateData = fileType === "contract"
      ? { contractFileUrl: null }
      : { licenseFileUrl: null }

    await prisma.loanerCarLoan.update({ where: { id: loanId }, data: updateData })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Delete route error:", err)
    return NextResponse.json(
      { error: "Beklenmeyen hata: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }
}
