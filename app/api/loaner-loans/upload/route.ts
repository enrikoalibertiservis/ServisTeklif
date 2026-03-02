import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin, LOANER_DOCS_BUCKET } from "@/lib/supabase"

export const runtime = "nodejs"

const LOANER_OPERATORS = ["serdar güler", "handan özçetin", "özgür zavalsız"]

function normName(n: string) {
  return n.toLowerCase().trim().replace(/İ/g, "i").replace(/I/g, "ı")
}
function canOperate(name: string) {
  return LOANER_OPERATORS.some(op => normName(op) === normName(name))
}

const MAX_FILE_SIZE = 500 * 1024 // 500 KB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic",
  "application/pdf",
]

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

    // Eski dosyayı sil (varsa)
    const oldUrl = fileType === "contract" ? loan.contractFileUrl : loan.licenseFileUrl
    if (oldUrl) {
      const parts = oldUrl.split(`/object/public/${LOANER_DOCS_BUCKET}/`)
      const oldPath = parts[1]
      if (oldPath) {
        await supabaseAdmin.storage.from(LOANER_DOCS_BUCKET).remove([decodeURIComponent(oldPath)])
      }
    }

    // Yeni dosyayı yükle — ArrayBuffer → Buffer (Node.js uyumluluğu)
    const ext         = (file.name.split(".").pop() ?? "bin").toLowerCase()
    const timestamp   = Date.now()
    const storagePath = `${loanId}/${fileType}-${timestamp}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from(LOANER_DOCS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error("Supabase upload error:", uploadError)
      return NextResponse.json(
        { error: "Depolama hatası: " + uploadError.message },
        { status: 500 }
      )
    }

    // Public URL al
    const { data: { publicUrl } } = supabaseAdmin.storage
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
      const parts = oldUrl.split(`/object/public/${LOANER_DOCS_BUCKET}/`)
      const oldPath = parts[1]
      if (oldPath) {
        await supabaseAdmin.storage.from(LOANER_DOCS_BUCKET).remove([decodeURIComponent(oldPath)])
      }
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
