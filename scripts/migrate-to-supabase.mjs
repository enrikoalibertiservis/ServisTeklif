/**
 * SQLite → Supabase Veri Taşıma Scripti (Supabase JS Client)
 */

import Database from "better-sqlite3"
import { createClient } from "@supabase/supabase-js"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SQLITE_PATH    = path.join(__dirname, "../prisma/dev.db")
const SUPABASE_URL   = "https://rjwxlzuwodptascjfcel.supabase.co"
const SUPABASE_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqd3hsenV3b2RwdGFzY2pmY2VsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYxODM1OCwiZXhwIjoyMDg3MTk0MzU4fQ.yNM3tuvGouGVH9cUeYEhY4aQNygsfo2fZs7PZZ3cST8"

const sqlite = new Database(SQLITE_PATH, { readonly: true })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

// SQLite timestamp → ISO string
function ts(val) {
  if (!val) return null
  // Sayısal Unix ms ise çevir, string ise direkt kullan
  if (typeof val === "number") return new Date(val).toISOString()
  return val
}

async function upsert(table, rows, label) {
  if (rows.length === 0) { console.log(`⏭️   ${label}: boş, atlandı`); return }

  // 500'lük gruplar hâlinde gönder
  const CHUNK = 500
  let total = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: "id" })
    if (error) throw new Error(`${label} hatası: ${error.message}`)
    total += chunk.length
  }
  console.log(`✅  ${label}: ${total} kayıt aktarıldı`)
}

async function run() {
  console.log("🚀  Supabase veri aktarımı başlıyor...\n")

  // ── 1. User ──────────────────────────────────────────────
  const users = sqlite.prepare("SELECT * FROM User").all().map(r => ({
    id: r.id, email: r.email, passwordHash: r.passwordHash,
    name: r.name, role: r.role, active: r.active === 1,
    createdAt: ts(r.createdAt), updatedAt: ts(r.updatedAt),
  }))
  await upsert("User", users, "👤  User")

  // ── 2. Brand ─────────────────────────────────────────────
  const brands = sqlite.prepare("SELECT * FROM Brand").all().map(r => ({
    id: r.id, name: r.name, createdAt: ts(r.createdAt),
  }))
  await upsert("Brand", brands, "🏷️   Brand")

  // ── 3. AppSetting ────────────────────────────────────────
  const settings = sqlite.prepare("SELECT * FROM AppSetting").all().map(r => ({
    id: r.id, key: r.key, value: r.value,
  }))
  await upsert("AppSetting", settings, "⚙️   AppSetting")

  // ── 4. VehicleModel ──────────────────────────────────────
  const models = sqlite.prepare("SELECT * FROM VehicleModel").all().map(r => ({
    id: r.id, brandId: r.brandId, name: r.name, createdAt: ts(r.createdAt),
  }))
  await upsert("VehicleModel", models, "🚗  VehicleModel")

  // ── 5. SubModel ──────────────────────────────────────────
  const subModels = sqlite.prepare("SELECT * FROM SubModel").all().map(r => ({
    id: r.id, modelId: r.modelId, name: r.name, createdAt: ts(r.createdAt),
  }))
  await upsert("SubModel", subModels, "🔩  SubModel")

  // ── 6. VehicleSpec ───────────────────────────────────────
  const specs = sqlite.prepare("SELECT * FROM VehicleSpec").all().map(r => ({
    id: r.id, subModelId: r.subModelId, specKey: r.specKey, specValue: r.specValue,
  }))
  await upsert("VehicleSpec", specs, "📋  VehicleSpec")

  // ── 7. Part ──────────────────────────────────────────────
  const parts = sqlite.prepare("SELECT * FROM Part").all().map(r => ({
    id: r.id, brandId: r.brandId, partNo: r.partNo, name: r.name,
    unitPrice: r.unitPrice, currency: r.currency, validFrom: ts(r.validFrom),
    versionTag: r.versionTag, createdAt: ts(r.createdAt),
  }))
  await upsert("Part", parts, "🔧  Part")

  // ── 8. LaborOperation ────────────────────────────────────
  const labors = sqlite.prepare("SELECT * FROM LaborOperation").all().map(r => ({
    id: r.id, brandId: r.brandId, operationCode: r.operationCode, name: r.name,
    durationHours: r.durationHours, hourlyRate: r.hourlyRate, totalPrice: r.totalPrice,
    currency: r.currency, validFrom: ts(r.validFrom), versionTag: r.versionTag, createdAt: ts(r.createdAt),
  }))
  await upsert("LaborOperation", labors, "👷  LaborOperation")

  // ── 9. MaintenanceTemplate ───────────────────────────────
  const templates = sqlite.prepare("SELECT * FROM MaintenanceTemplate").all().map(r => ({
    id: r.id, brandId: r.brandId, modelId: r.modelId, subModelId: r.subModelId,
    periodKm: r.periodKm, periodMonth: r.periodMonth, serviceType: r.serviceType,
    name: r.name, createdAt: ts(r.createdAt),
  }))
  await upsert("MaintenanceTemplate", templates, "📄  MaintenanceTemplate")

  // ── 10. MaintenanceTemplateItem ──────────────────────────
  const tItems = sqlite.prepare("SELECT * FROM MaintenanceTemplateItem").all().map(r => ({
    id: r.id, templateId: r.templateId, itemType: r.itemType, referenceCode: r.referenceCode,
    quantity: r.quantity, durationOverride: r.durationOverride, sortOrder: r.sortOrder,
  }))
  await upsert("MaintenanceTemplateItem", tItems, "📎  MaintenanceTemplateItem")

  // ── 11. Quote ────────────────────────────────────────────
  const quotes = sqlite.prepare("SELECT * FROM Quote").all().map(r => ({
    id: r.id, quoteNo: r.quoteNo, revision: r.revision, status: r.status,
    customerName: r.customerName, customerPhone: r.customerPhone,
    customerEmail: r.customerEmail, plateNo: r.plateNo,
    brandName: r.brandName, modelName: r.modelName, subModelName: r.subModelName,
    vehicleSpecs: r.vehicleSpecs, periodKm: r.periodKm, periodMonth: r.periodMonth,
    serviceType: r.serviceType, partsSubtotal: r.partsSubtotal, laborSubtotal: r.laborSubtotal,
    subtotal: r.subtotal, discountType: r.discountType, discountValue: r.discountValue,
    discountAmount: r.discountAmount, taxRate: r.taxRate, taxAmount: r.taxAmount,
    grandTotal: r.grandTotal, priceListVersion: r.priceListVersion, notes: r.notes,
    createdById: r.createdById, createdAt: ts(r.createdAt), updatedAt: ts(r.updatedAt),
  }))
  await upsert("Quote", quotes, "📃  Quote")

  // ── 12. QuoteItem ────────────────────────────────────────
  const qItems = sqlite.prepare("SELECT * FROM QuoteItem").all().map(r => ({
    id: r.id, quoteId: r.quoteId, itemType: r.itemType, referenceCode: r.referenceCode,
    name: r.name, quantity: r.quantity, unitPrice: r.unitPrice,
    discountPct: r.discountPct, discountAmount: r.discountAmount, totalPrice: r.totalPrice,
    durationHours: r.durationHours, hourlyRate: r.hourlyRate, sortOrder: r.sortOrder,
  }))
  await upsert("QuoteItem", qItems, "🧾  QuoteItem")

  // ── 13. PriceListVersion ─────────────────────────────────
  const versions = sqlite.prepare("SELECT * FROM PriceListVersion").all().map(r => ({
    id: r.id, type: r.type, brandName: r.brandName, fileName: r.fileName,
    recordCount: r.recordCount, added: r.added, updated: r.updated,
    errors: r.errors, errorDetails: r.errorDetails,
    uploadedById: r.uploadedById, createdAt: ts(r.createdAt),
  }))
  await upsert("PriceListVersion", versions, "📦  PriceListVersion")

  console.log("\n🎉  Tüm veriler başarıyla Supabase'e aktarıldı!")
  sqlite.close()
}

run().catch(err => {
  console.error("\n❌  Hata:", err.message)
  sqlite.close()
  process.exit(1)
})
