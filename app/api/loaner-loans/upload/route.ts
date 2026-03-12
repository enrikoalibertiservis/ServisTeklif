import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { v2 as cloudinary } from "cloudinary"

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

// ── Cloudinary yapılandırması ─────────────────────────────────
function getCloudinary() {
  const cloud  = process.env.CLOUDINARY_CLOUD_NAME
  const key    = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET
  if (!cloud || !key || !secret)
    throw new Error("Cloudinary env değişkenleri eksik (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)")

  cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret })
  return cloudinary
}

/** Buffer'ı Cloudinary'ye yükle, public URL döndür */
async function uploadToCloudinary(
  buffer: Buffer,
  mimeType: string,
  publicId: string,
): Promise<string> {
  const cl = getCloudinary()

  // PDF ve resim için farklı resource_type
  const resourceType = mimeType === "application/pdf" ? "raw" : "image"

  return new Promise((resolve, reject) => {
    cl.uploader.upload_stream(
      {
        public_id:     publicId,
        folder:        "ikame-belgeler",
        resource_type: resourceType,
        overwrite:     true,
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Cloudinary sonuç dönmedi"))
        resolve(result.secure_url)
      }
    ).end(buffer)
  })
}

/** Cloudinary'den public_id ile dosyayı sil */
async function deleteFromCloudinary(fileUrl: string) {
  try {
    const cl = getCloudinary()
    // secure_url → public_id çıkar
    // Format: https://res.cloudinary.com/{cloud}/image/upload/v.../ikame-belgeler/{id}.ext
    const match = fileUrl.match(/\/ikame-belgeler\/([^/.]+)/)
    if (!match) return

    const publicId   = `ikame-belgeler/${match[1]}`
    const isPdf      = fileUrl.includes("/raw/")
    const resourceType = isPdf ? "raw" : "image"

    await cl.uploader.destroy(publicId, { resource_type: resourceType })
  } catch {
    // Silme hatası kritik değil
  }
}
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    if (!canOperate(session.user.name ?? ""))
      return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

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

    // Eski dosyayı Cloudinary'den sil
    const oldUrl = fileType === "contract" ? loan.contractFileUrl : loan.licenseFileUrl
    if (oldUrl) await deleteFromCloudinary(oldUrl)

    // Yükle
    const timestamp = Date.now()
    const label     = fileType === "contract" ? "sozlesme" : "ehliyet"
    const publicId  = `${label}-${loanId}-${timestamp}`
    const buffer    = Buffer.from(await file.arrayBuffer())

    console.log(`Cloudinary upload: ${publicId} (${(buffer.length / 1024).toFixed(0)} KB, ${file.type})`)

    const publicUrl = await uploadToCloudinary(buffer, file.type, publicId)

    // Supabase DB'ye sadece link yaz
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
      { error: "Yükleme hatası: " + (err instanceof Error ? err.message : String(err)) },
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
    if (oldUrl) await deleteFromCloudinary(oldUrl)

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
