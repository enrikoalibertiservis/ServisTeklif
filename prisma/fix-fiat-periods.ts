import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface PeriodFix {
  model: string
  subModel: string
  correctKm: number
  correctMonth: number
}

const correctPeriods: PeriodFix[] = [
  // 1.2 MOTOR → 20.000 km / 12 ay (eskiden 15.000 km idi)
  { model: "500", subModel: "1.2", correctKm: 20000, correctMonth: 12 },
  { model: "Panda", subModel: "1.2", correctKm: 20000, correctMonth: 12 },
  { model: "500L", subModel: "1.2", correctKm: 20000, correctMonth: 12 },
  { model: "500X", subModel: "1.2", correctKm: 20000, correctMonth: 12 },

  // 1.3 MOTOR → 10.000 km / 12 ay (eskiden 20.000 km idi)
  { model: "Egea", subModel: "Sedan 1.3 Multijet", correctKm: 10000, correctMonth: 12 },
  { model: "Egea", subModel: "Hatchback 1.3 Multijet", correctKm: 10000, correctMonth: 12 },
  { model: "Egea", subModel: "Station Wagon 1.3 Multijet", correctKm: 10000, correctMonth: 12 },
  { model: "Egea", subModel: "Cross 1.3 Multijet", correctKm: 10000, correctMonth: 12 },
  { model: "Fiorino", subModel: "1.3 Multijet", correctKm: 10000, correctMonth: 12 },
  { model: "Doblo", subModel: "1.3 Multijet", correctKm: 10000, correctMonth: 12 },

  // 1.4 MOTOR (Egea) → 10.000 km / 12 ay (eskiden 20.000 km idi)
  { model: "Egea", subModel: "Sedan 1.4 Fire", correctKm: 10000, correctMonth: 12 },
  { model: "Egea", subModel: "Hatchback 1.4 Fire", correctKm: 10000, correctMonth: 12 },
  { model: "Egea", subModel: "Station Wagon 1.4 Fire", correctKm: 10000, correctMonth: 12 },
  { model: "Egea", subModel: "Cross 1.4 Fire", correctKm: 10000, correctMonth: 12 },
  // Fiorino 1.4 → 20.000 km / 12 ay (zaten doğru)
  { model: "Fiorino", subModel: "1.4 Fire", correctKm: 20000, correctMonth: 12 },

  // 1.6 MOTOR → 20.000 km / 12 ay (zaten doğru)
  { model: "Egea", subModel: "Sedan 1.6 Multijet", correctKm: 20000, correctMonth: 12 },
  { model: "Egea", subModel: "Hatchback 1.6 Multijet", correctKm: 20000, correctMonth: 12 },
  { model: "Egea", subModel: "Station Wagon 1.6 Multijet", correctKm: 20000, correctMonth: 12 },
  { model: "Egea", subModel: "Cross 1.6 Multijet", correctKm: 20000, correctMonth: 12 },
  { model: "Doblo", subModel: "1.6 Multijet", correctKm: 20000, correctMonth: 12 },

  // ELEKTRİKLİ / DİĞER
  { model: "600", subModel: "Elektrikli", correctKm: 15000, correctMonth: 12 },
  { model: "500e", subModel: "Elektrikli", correctKm: 20000, correctMonth: 12 },
  { model: "500e", subModel: "Cabrio", correctKm: 20000, correctMonth: 12 },
  { model: "500e", subModel: "3+1", correctKm: 20000, correctMonth: 12 },
  { model: "Topolino", subModel: "Elektrikli", correctKm: 20000, correctMonth: 12 },
  { model: "Ulysse", subModel: "2.0 Dizel", correctKm: 20000, correctMonth: 12 },
  { model: "Ulysse", subModel: "Elektrikli", correctKm: 20000, correctMonth: 12 },
  { model: "Grande Panda", subModel: "Hibrit", correctKm: 15000, correctMonth: 12 },
  { model: "Grande Panda", subModel: "Elektrikli", correctKm: 15000, correctMonth: 12 },
]

async function main() {
  const fiat = await prisma.brand.findUnique({ where: { name: "Fiat" } })
  if (!fiat) throw new Error("Fiat markası bulunamadı!")

  console.log("═══════════════════════════════════════════════════════")
  console.log("  FIAT BAKIM PERİYOTLARI DÜZELTME")
  console.log("═══════════════════════════════════════════════════════\n")

  // ─── 1) Eksik alt modelleri ekle (500e Cabrio, 500e 3+1) ────────
  console.log("1) Eksik alt modeller kontrol ediliyor...\n")

  const newSubModels = [
    { model: "500e", subModel: "Cabrio", specs: { engineCode: "Elektrik", fuelType: "Elektrik", driveType: "FWD", bodyType: "Cabrio" } },
    { model: "500e", subModel: "3+1", specs: { engineCode: "Elektrik", fuelType: "Elektrik", driveType: "FWD", bodyType: "3+1" } },
  ]

  for (const v of newSubModels) {
    const model = await prisma.vehicleModel.findFirst({ where: { brandId: fiat.id, name: v.model } })
    if (!model) { console.log(`  HATA: Model bulunamadı: ${v.model}`); continue }

    let subModel = await prisma.subModel.findFirst({ where: { modelId: model.id, name: v.subModel } })
    if (!subModel) {
      subModel = await prisma.subModel.create({ data: { modelId: model.id, name: v.subModel } })
      console.log(`  + Alt model eklendi: ${v.model} > ${v.subModel}`)

      for (const [key, value] of Object.entries(v.specs)) {
        await prisma.vehicleSpec.upsert({
          where: { subModelId_specKey: { subModelId: subModel.id, specKey: key } },
          update: { specValue: value },
          create: { subModelId: subModel.id, specKey: key, specValue: value },
        })
      }
    } else {
      console.log(`  ✓ Zaten mevcut: ${v.model} > ${v.subModel}`)
    }
  }

  // ─── 2) Fiat'a ait TÜM eski şablonları sil ────────────────────
  console.log("\n2) Fiat'a ait tüm eski bakım şablonları siliniyor...\n")

  const oldTemplates = await prisma.maintenanceTemplate.findMany({
    where: { brandId: fiat.id },
    include: { model: { select: { name: true } }, subModel: { select: { name: true } } },
  })

  for (const t of oldTemplates) {
    await prisma.maintenanceTemplateItem.deleteMany({ where: { templateId: t.id } })
    await prisma.maintenanceTemplate.delete({ where: { id: t.id } })
  }
  console.log(`  ${oldTemplates.length} eski şablon silindi.`)

  // ─── 3) Doğru periyotlarla yeni şablonlar oluştur ──────────────
  console.log("\n3) Doğru periyotlarla yeni şablonlar oluşturuluyor...\n")

  let created = 0
  let errors = 0
  const maxKm = 120000

  for (const p of correctPeriods) {
    const model = await prisma.vehicleModel.findFirst({ where: { brandId: fiat.id, name: p.model } })
    if (!model) { console.log(`  HATA: Model bulunamadı: ${p.model}`); errors++; continue }

    const subModel = await prisma.subModel.findFirst({ where: { modelId: model.id, name: p.subModel } })
    if (!subModel) { console.log(`  HATA: Alt model bulunamadı: ${p.model} > ${p.subModel}`); errors++; continue }

    // Temel periyod + katları (120K'ya kadar)
    for (let multiplier = 1; multiplier * p.correctKm <= maxKm; multiplier++) {
      const km = multiplier * p.correctKm
      const month = multiplier * p.correctMonth

      await prisma.maintenanceTemplate.create({
        data: {
          brandId: fiat.id,
          modelId: model.id,
          subModelId: subModel.id,
          periodKm: km,
          periodMonth: month,
          name: `${(km / 1000).toFixed(0)}.000 km / ${month} ay Periyodik Bakım`,
        },
      })
      created++
    }

    const periodCount = Math.floor(maxKm / p.correctKm)
    const periods = Array.from({ length: periodCount }, (_, i) => `${((i + 1) * p.correctKm / 1000).toFixed(0)}K`).join(", ")
    console.log(`  ✓ ${p.model} ${p.subModel} → ${p.correctKm / 1000}K baz (${periodCount} periyot: ${periods})`)
  }

  // ─── 4) Özet ───────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  SONUÇ")
  console.log("═══════════════════════════════════════════════════════")
  console.log(`  Oluşturulan şablon: ${created}`)
  console.log(`  Hata:               ${errors}`)
  console.log("═══════════════════════════════════════════════════════\n")

  // Final check
  const finalTemplates = await prisma.maintenanceTemplate.findMany({
    where: { brandId: fiat.id },
    include: {
      model: { select: { name: true } },
      subModel: { select: { name: true } },
    },
    orderBy: [
      { model: { name: "asc" } },
      { subModel: { name: "asc" } },
      { periodKm: "asc" },
    ],
  })

  const grouped = new Map<string, typeof finalTemplates>()
  for (const t of finalTemplates) {
    const key = `${t.model?.name || "?"} ${t.subModel?.name || "Genel"}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(t)
  }

  console.log("FIAT BAKIM PERİYOTLARI (güncel):")
  console.log("─".repeat(70))
  for (const [vehicle, tpls] of Array.from(grouped.entries())) {
    const baseKm = tpls[0]?.periodKm || 0
    const periods = tpls.map(t => `${(t.periodKm! / 1000).toFixed(0)}K`).join(", ")
    console.log(`  ${vehicle} → Baz: ${baseKm / 1000}K km | ${periods}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
