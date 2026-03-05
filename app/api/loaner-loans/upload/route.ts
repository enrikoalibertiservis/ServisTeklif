import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSupabaseAdmin, LOANER_DOCS_BUCKET } from "@/lib/supabase"

export const runtime = "nodejs"

const LOANER_OPERATORS = ["serdar güler", "handan özçetin", "özgür zavalsız"]

function normName(n: string) {
  return n.toLowerCase().trim().replace(/İ/g, "i").replace(/I/g, "ı")
}
function canOperate(name: string) {
  return LOANER_OPERATORS.some(op => normName(op) === normName(name))
}

const MAX_FILE_SIZE = 500 * 1024 // 500 KB

// MIME → uzantı eşlemesi: uzantı asla client'tan gelmez
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg":       "jpg",
  "image/png":        "png",
  "image/webp":       "webp",
  "image/heic":       "heic",
  "application/pdf":  "pdf",
}
const ALLOWED_TYPES = Object.keys(MIME_TO_EXT)

// fileType parametresi için izin verilen değerler
const ALLOWED_FILE_TYPES = new Set(["contract", "license"])

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    if (!canOperate(session.user.name ?? ""))
      return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

    // Env kontrol
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik")
      return NextResponse.json({ error: "Sunucu yapılandırma hatası." }, { status: 500 })
    }

    const formData = await req.formData()
    const file     = formData.get("file") as File | null
    const loanId   = formData.get("loanId") as string | null
    const fileType = formData.get("fileType") as "contract" | "license" | null

    if (!file || !loanId || !fileType) {
      return NextResponse.json({ error: "Eksik parametreler." }, { status: 400 })
    }

    // fileType runtime doğrulaması (TypeScript tip güvencesi yeterli değil)
    if (!ALLOWED_FILE_TYPES.has(fileType)) {
      return NextResponse.json({ error: "Geçersiz dosya türü parametresi." }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Dosya boyutu 500 KB'ı aşamaz. Seçilen dosya: ${(file.size / 1024).toFixed(0)} KB` },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Desteklenmeyen dosya türü. PDF, JPG veya PNG yükleyin." },
        { status: 400 }
      )
    }

    // Mevcut kaydı doğrula
    const loan = await prisma.loanerCarLoan.findUnique({ where: { id: loanId } })
    if (!loan) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 })

    // Supabase client — env var hatası burada yakalanır
    let sb: ReturnType<typeof getSupabaseAdmin>
    try {
      sb = getSupabaseAdmin()
    } catch (envErr) {
      console.error("Supabase init error:", envErr)
      return NextResponse.json(
        { error: "Sunucu yapılandırma hatası: " + (envErr instanceof Error ? envErr.message : String(envErr)) },
        { status: 500 }
      )
    }

    // Eski dosyayı sil (varsa)
    const oldUrl = fileType === "contract" ? loan.contractFileUrl : loan.licenseFileUrl
    if (oldUrl) {
      const parts = oldUrl.split(`/object/public/${LOANER_DOCS_BUCKET}/`)
      const oldPath = parts[1]
      if (oldPath) {
        await sb.storage.from(LOANER_DOCS_BUCKET).remove([decodeURIComponent(oldPath)])
      }
    }

    // Yeni dosyayı yükle — ArrayBuffer → Buffer (Node.js uyumluluğu)
    // Uzantı asla client'tan gelmez; MIME eşlemesinden türetilir
    const ext         = MIME_TO_EXT[file.type] ?? "bin"
    const timestamp   = Date.now()
    const storagePath = `${loanId}/${fileType}-${timestamp}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    console.log(`Upload attempt: bucket=${LOANER_DOCS_BUCKET} path=${storagePath} size=${buffer.length} type=${file.type}`)

    const { error: uploadError } = await sb.storage
      .from(LOANER_DOCS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error("Supabase upload error:", JSON.stringify(uploadError))
      return NextResponse.json(
        { error: `Depolama hatası [${uploadError.message}] — Bucket: ${LOANER_DOCS_BUCKET}` },
        { status: 500 }
      )
    }

    // Public URL al
    const { data: { publicUrl } } = sb.storage
      .from(LOANER_DOCS_BUCKET)
      .getPublicUrl(storagePath)

    // DB güncelle
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
