import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { google } from "googleapis"
import { Readable } from "stream"

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
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB (Drive'da alan bol)

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg":      "jpg",
  "image/png":       "png",
  "image/webp":      "webp",
  "image/heic":      "heic",
  "application/pdf": "pdf",
}
const ALLOWED_TYPES    = Object.keys(MIME_TO_EXT)
const ALLOWED_FILE_TYPES = new Set(["contract", "license"])

// ── Google Drive yardımcıları ─────────────────────────────────
function getDriveClient() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!json)     throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON tanımlı değil")
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID tanımlı değil")

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(json),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  })
  return { drive: google.drive({ version: "v3", auth }), folderId }
}

/** Drive URL'sinden dosya ID'sini çıkar
 *  Desteklenen formatlar:
 *  https://drive.google.com/file/d/{ID}/view
 *  https://drive.google.com/open?id={ID}
 */
function extractDriveFileId(url: string): string | null {
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]
  return null
}

async function uploadToDrive(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  folderId: string,
  drive: ReturnType<typeof google.drive>
): Promise<string> {
  // Yükle
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id,webViewLink",
  })

  const fileId = res.data.id
  if (!fileId) throw new Error("Drive'dan dosya ID alınamadı")

  // Herkese okuma izni ver (link ile erişim)
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  })

  return res.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`
}

async function deleteFromDrive(
  fileUrl: string,
  drive: ReturnType<typeof google.drive>
) {
  const fileId = extractDriveFileId(fileUrl)
  if (!fileId) return
  try {
    await drive.files.delete({ fileId })
  } catch {
    // Dosya zaten silinmiş olabilir, kritik değil
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
        { error: `Dosya boyutu ${MAX_FILE_SIZE / (1024 * 1024)} MB'ı aşamaz. Seçilen: ${(file.size / 1024 / 1024).toFixed(1)} MB` },
        { status: 400 }
      )

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json(
        { error: "Desteklenmeyen dosya türü. PDF, JPG veya PNG yükleyin." },
        { status: 400 }
      )

    const loan = await prisma.loanerCarLoan.findUnique({ where: { id: loanId } })
    if (!loan) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 })

    let drive: ReturnType<typeof google.drive>
    let folderId: string
    try {
      ({ drive, folderId } = getDriveClient())
    } catch (e) {
      console.error("Google Drive init error:", e)
      return NextResponse.json(
        { error: "Google Drive yapılandırma hatası: " + (e instanceof Error ? e.message : String(e)) },
        { status: 500 }
      )
    }

    // Eski dosyayı Drive'dan sil
    const oldUrl = fileType === "contract" ? loan.contractFileUrl : loan.licenseFileUrl
    if (oldUrl) {
      await deleteFromDrive(oldUrl, drive)
    }

    // Yeni dosyayı yükle
    const ext       = MIME_TO_EXT[file.type] ?? "bin"
    const timestamp = Date.now()
    const fileName  = `${fileType === "contract" ? "sozlesme" : "ehliyet"}-${loanId}-${timestamp}.${ext}`
    const buffer    = Buffer.from(await file.arrayBuffer())

    console.log(`Drive upload: ${fileName} (${(buffer.length / 1024).toFixed(0)} KB)`)

    const publicUrl = await uploadToDrive(buffer, file.type, fileName, folderId, drive)

    // Supabase DB'yi güncelle — sadece link yazılıyor
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
        const { drive } = getDriveClient()
        await deleteFromDrive(oldUrl, drive)
      } catch { /* Drive silme hatası kritik değil */ }
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
