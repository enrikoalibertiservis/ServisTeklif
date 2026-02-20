import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface PeriodDef {
  brand: string
  model: string
  subModel: string
  periodKm: number
  periodMonth: number
}

const periods: PeriodDef[] = [
  // ─── FIAT 1.2 Motor → 20.000 km / 12 ay ──────────
  { brand: "Fiat", model: "500", subModel: "1.2", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "Panda", subModel: "1.2", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "500L", subModel: "1.2", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "500X", subModel: "1.2", periodKm: 20000, periodMonth: 12 },

  // ─── FIAT 1.3 Multijet → 10.000 km / 12 ay ───────
  { brand: "Fiat", model: "Egea", subModel: "Sedan 1.3 Multijet", periodKm: 10000, periodMonth: 12 },
  { brand: "Fiat", model: "Egea", subModel: "Hatchback 1.3 Multijet", periodKm: 10000, periodMonth: 12 },
  { brand: "Fiat", model: "Egea", subModel: "Station Wagon 1.3 Multijet", periodKm: 10000, periodMonth: 12 },
  { brand: "Fiat", model: "Egea", subModel: "Cross 1.3 Multijet", periodKm: 10000, periodMonth: 12 },
  { brand: "Fiat", model: "Fiorino", subModel: "1.3 Multijet", periodKm: 10000, periodMonth: 12 },
  { brand: "Fiat", model: "Doblo", subModel: "1.3 Multijet", periodKm: 10000, periodMonth: 12 },

  // ─── FIAT 1.4 Fire (Egea) → 10.000 km / 12 ay ────
  { brand: "Fiat", model: "Egea", subModel: "Sedan 1.4 Fire", periodKm: 10000, periodMonth: 12 },
  { brand: "Fiat", model: "Egea", subModel: "Hatchback 1.4 Fire", periodKm: 10000, periodMonth: 12 },
  { brand: "Fiat", model: "Egea", subModel: "Station Wagon 1.4 Fire", periodKm: 10000, periodMonth: 12 },
  { brand: "Fiat", model: "Egea", subModel: "Cross 1.4 Fire", periodKm: 10000, periodMonth: 12 },
  // Fiorino 1.4 → 20.000 km / 12 ay
  { brand: "Fiat", model: "Fiorino", subModel: "1.4 Fire", periodKm: 20000, periodMonth: 12 },

  // ─── FIAT 1.6 Multijet → 20.000 km / 12 ay ───────
  { brand: "Fiat", model: "Egea", subModel: "Sedan 1.6 Multijet", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "Egea", subModel: "Hatchback 1.6 Multijet", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "Egea", subModel: "Station Wagon 1.6 Multijet", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "Egea", subModel: "Cross 1.6 Multijet", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "Doblo", subModel: "1.6 Multijet", periodKm: 20000, periodMonth: 12 },

  // ─── FIAT Elektrikli / Diğer ──────────────────────
  { brand: "Fiat", model: "600", subModel: "Elektrikli", periodKm: 15000, periodMonth: 12 },
  { brand: "Fiat", model: "500e", subModel: "Elektrikli", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "500e", subModel: "Cabrio", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "500e", subModel: "3+1", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "Topolino", subModel: "Elektrikli", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "Ulysse", subModel: "2.0 Dizel", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "Ulysse", subModel: "Elektrikli", periodKm: 20000, periodMonth: 12 },
  { brand: "Fiat", model: "Grande Panda", subModel: "Hibrit", periodKm: 15000, periodMonth: 12 },
  { brand: "Fiat", model: "Grande Panda", subModel: "Elektrikli", periodKm: 15000, periodMonth: 12 },

  // ─── JEEP ─────────────────────────────────────────
  { brand: "Jeep", model: "Renegade", subModel: "1.3 T4", periodKm: 15000, periodMonth: 12 },
  { brand: "Jeep", model: "Compass", subModel: "1.3 T4", periodKm: 15000, periodMonth: 12 },
  { brand: "Jeep", model: "Renegade", subModel: "1.5 e-Hybrid", periodKm: 15000, periodMonth: 12 },
  { brand: "Jeep", model: "Compass", subModel: "1.5 e-Hybrid", periodKm: 15000, periodMonth: 12 },
  { brand: "Jeep", model: "Compass", subModel: "2.0 Multijet", periodKm: 15000, periodMonth: 12 },
  { brand: "Jeep", model: "Wrangler", subModel: "2.0 Turbo", periodKm: 10000, periodMonth: 12 },
  { brand: "Jeep", model: "Avenger", subModel: "1.2 Turbo", periodKm: 15000, periodMonth: 12 },
  { brand: "Jeep", model: "Avenger", subModel: "Elektrikli", periodKm: 15000, periodMonth: 12 },
  { brand: "Jeep", model: "Renegade", subModel: "4xe Plug-in Hybrid", periodKm: 15000, periodMonth: 12 },
  { brand: "Jeep", model: "Compass", subModel: "4xe Plug-in Hybrid", periodKm: 15000, periodMonth: 12 },
  { brand: "Jeep", model: "Grand Cherokee", subModel: "4xe Plug-in Hybrid", periodKm: 15000, periodMonth: 12 },

  // ─── ALFA ROMEO ───────────────────────────────────
  { brand: "Alfa Romeo", model: "Tonale", subModel: "1.5 Hybrid", periodKm: 15000, periodMonth: 12 },
  { brand: "Alfa Romeo", model: "Tonale", subModel: "1.3 Plug-in Hybrid Q4", periodKm: 15000, periodMonth: 12 },
  { brand: "Alfa Romeo", model: "Giulia", subModel: "2.0 Turbo", periodKm: 15000, periodMonth: 12 },
  { brand: "Alfa Romeo", model: "Stelvio", subModel: "2.0 Turbo", periodKm: 15000, periodMonth: 12 },
  { brand: "Alfa Romeo", model: "Junior", subModel: "1.2 Hybrid", periodKm: 15000, periodMonth: 12 },
  { brand: "Alfa Romeo", model: "Junior", subModel: "Elektrikli", periodKm: 15000, periodMonth: 12 },
  { brand: "Alfa Romeo", model: "Tonale", subModel: "1.6 Dizel", periodKm: 15000, periodMonth: 12 },
]

async function main() {
  console.log("Bakım periyotları tanımlanıyor...\n")

  // Also remove Jeep Wrangler 2.2 Multijet (TR'de yok)
  const jeep = await prisma.brand.findUnique({ where: { name: "Jeep" } })
  if (jeep) {
    const wranglerModel = await prisma.vehicleModel.findFirst({ where: { brandId: jeep.id, name: "Wrangler" } })
    if (wranglerModel) {
      const wrangler22 = await prisma.subModel.findFirst({ where: { modelId: wranglerModel.id, name: "2.2 Multijet" } })
      if (wrangler22) {
        await prisma.vehicleSpec.deleteMany({ where: { subModelId: wrangler22.id } })
        await prisma.subModel.delete({ where: { id: wrangler22.id } })
        console.log("Silindi: Jeep Wrangler 2.2 Multijet (TR'de yok)")
      }
    }
  }

  // Also remove Alfa Romeo Giulia/Stelvio 2.2 Dizel if you want to keep only 2.0 Turbo
  // (keeping them for now since they were in the original list)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const p of periods) {
    try {
      const brand = await prisma.brand.findUnique({ where: { name: p.brand } })
      if (!brand) { console.log(`  HATA: Marka bulunamadı: ${p.brand}`); errors++; continue }

      const model = await prisma.vehicleModel.findFirst({ where: { brandId: brand.id, name: p.model } })
      if (!model) { console.log(`  HATA: Model bulunamadı: ${p.brand} ${p.model}`); errors++; continue }

      const subModel = await prisma.subModel.findFirst({ where: { modelId: model.id, name: p.subModel } })
      if (!subModel) { console.log(`  HATA: Alt model bulunamadı: ${p.brand} ${p.model} ${p.subModel}`); errors++; continue }

      // Check if already exists
      const existing = await prisma.maintenanceTemplate.findFirst({
        where: {
          brandId: brand.id,
          modelId: model.id,
          subModelId: subModel.id,
        },
      })

      if (existing) {
        // Update period
        await prisma.maintenanceTemplate.update({
          where: { id: existing.id },
          data: {
            periodKm: p.periodKm,
            periodMonth: p.periodMonth,
            name: `${(p.periodKm / 1000).toFixed(0)}.000 km / ${p.periodMonth} ay Periyodik Bakım`,
          },
        })
        skipped++
        continue
      }

      await prisma.maintenanceTemplate.create({
        data: {
          brandId: brand.id,
          modelId: model.id,
          subModelId: subModel.id,
          periodKm: p.periodKm,
          periodMonth: p.periodMonth,
          name: `${(p.periodKm / 1000).toFixed(0)}.000 km / ${p.periodMonth} ay Periyodik Bakım`,
        },
      })
      created++
      console.log(`+ ${p.brand} ${p.model} ${p.subModel} → ${p.periodKm.toLocaleString("tr-TR")} km / ${p.periodMonth} ay`)
    } catch (err: any) {
      console.log(`  HATA: ${p.brand} ${p.model} ${p.subModel}: ${err.message}`)
      errors++
    }
  }

  console.log("\n════════════════════════════════════════════")
  console.log("  SONUÇ")
  console.log("════════════════════════════════════════════")
  console.log(`  Oluşturulan: ${created}`)
  console.log(`  Güncellenen: ${skipped}`)
  console.log(`  Hata:        ${errors}`)
  console.log("════════════════════════════════════════════\n")

  // Summary by brand
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } })
  for (const brand of brands) {
    const templates = await prisma.maintenanceTemplate.findMany({
      where: { brandId: brand.id, subModelId: { not: null } },
      include: {
        model: { select: { name: true } },
        subModel: { select: { name: true } },
      },
      orderBy: [{ model: { name: "asc" } }, { subModel: { name: "asc" } }],
    })

    if (templates.length === 0) continue

    console.log(`\n${brand.name} (${templates.length} araç bakım periyodu):`)
    console.log("─".repeat(60))
    for (const t of templates) {
      const km = t.periodKm ? `${t.periodKm.toLocaleString("tr-TR")} km` : ""
      const month = t.periodMonth ? `${t.periodMonth} ay` : ""
      console.log(`  ${t.model?.name} ${t.subModel?.name} → ${km} / ${month}`)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
