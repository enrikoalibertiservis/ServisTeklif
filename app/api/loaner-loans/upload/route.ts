import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin, LOANER_DOCS_BUCKET } from "@/lib/supabase"

const LOANER_OPERATORS = ["serdar güler", "handan özçetin", "özgür zavalsız"]

function normName(n: string) {
  return n.toLowerCase().trim().replace(/İ/g, "i").replace(/I/g, "ı")
}
function canOperate(name: string) {
  return LOANER_OPERATORS.some(op => normName(op) === normName(name))
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic",
  "application/pdf",
]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canOperate(session.user.name ?? ""))
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

  const formData = await req.formData()
  const file     = formData.get("file") as File | null
  const loanId   = formData.get("loanId") as string | null
  const fileType = formData.get("fileType") as "contract" | "license" | null // contract | license

  if (!file || !loanId || !fileType) {
    return NextResponse.json({ error: "Eksik parametreler." }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Dosya boyutu 10 MB'ı aşamaz." }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Desteklenmeyen dosya türü. PDF veya resim yükleyin." }, { status: 400 })
  }

  // Mevcut kaydı doğrula
  const loan = await prisma.loanerCarLoan.findUnique({ where: { id: loanId } })
  if (!loan) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 })

  // Eski dosyayı sil (varsa)
  const oldUrl = fileType === "contract" ? loan.contractFileUrl : loan.licenseFileUrl
  if (oldUrl) {
    const oldPath = oldUrl.split(`/${LOANER_DOCS_BUCKET}/`)[1]
    if (oldPath) {
      await supabaseAdmin.storage.from(LOANER_DOCS_BUCKET).remove([oldPath])
    }
  }

  // Yeni dosyayı yükle
  const ext        = file.name.split(".").pop() ?? "bin"
  const timestamp  = Date.now()
  const path       = `${loanId}/${fileType}-${timestamp}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabaseAdmin.storage
    .from(LOANER_DOCS_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error("Supabase upload error:", uploadError)
    return NextResponse.json({ error: "Dosya yüklenemedi: " + uploadError.message }, { status: 500 })
  }

  // Public URL al
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(LOANER_DOCS_BUCKET)
    .getPublicUrl(path)

  // DB güncelle
  const updateData = fileType === "contract"
    ? { contractFileUrl: publicUrl }
    : { licenseFileUrl: publicUrl }

  const updated = await prisma.loanerCarLoan.update({
    where: { id: loanId },
    data: updateData,
  })

  return NextResponse.json({ url: publicUrl, loan: updated })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  if (!canOperate(session.user.name ?? ""))
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

  const { loanId, fileType } = await req.json() as { loanId: string; fileType: "contract" | "license" }

  const loan = await prisma.loanerCarLoan.findUnique({ where: { id: loanId } })
  if (!loan) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 })

  const oldUrl = fileType === "contract" ? loan.contractFileUrl : loan.licenseFileUrl
  if (oldUrl) {
    const oldPath = oldUrl.split(`/${LOANER_DOCS_BUCKET}/`)[1]
    if (oldPath) {
      await supabaseAdmin.storage.from(LOANER_DOCS_BUCKET).remove([oldPath])
    }
  }

  const updateData = fileType === "contract"
    ? { contractFileUrl: null }
    : { licenseFileUrl: null }

  await prisma.loanerCarLoan.update({ where: { id: loanId }, data: updateData })
  return NextResponse.json({ ok: true })
}
