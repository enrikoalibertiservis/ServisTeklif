import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// ─── İşçilik Grupları (Normal Bakım) ─────────────────────────────
// Grup A: 8.708,33 TL/saat
//   Alfa Romeo: Junior (Giulia, Tonale, Stelvio hariç tüm modeller)
//   Jeep: Renegade, Avenger
//
// Grup B: 9.675 TL/saat
//   Jeep: Cherokee, Compass
//   Lancia: Voyager
//   Alfa Romeo: Tonale
//
// Grup C: 11.250 TL/saat
//   Jeep: Grand Cherokee, Wrangler
//   Lancia: Thema
//   Alfa Romeo: Giulia, Stelvio

interface LaborDef {
  brand: string
  code: string
  name: string
  hourlyRate: number
  models: string[] // hangi modellere uygulanacak
}

const laborDefs: LaborDef[] = [
  // ─── ALFA ROMEO ───────────────────────────────────
  { brand: "Alfa Romeo", code: "ISCILIK-NORMAL-GRUP-A", name: "Normal Bakım İşçilik - Grup A (Junior vb.)", hourlyRate: 8708.33, models: ["Junior"] },
  { brand: "Alfa Romeo", code: "ISCILIK-NORMAL-GRUP-B", name: "Normal Bakım İşçilik - Grup B (Tonale)", hourlyRate: 9675.00, models: ["Tonale"] },
  { brand: "Alfa Romeo", code: "ISCILIK-NORMAL-GRUP-C", name: "Normal Bakım İşçilik - Grup C (Giulia, Stelvio)", hourlyRate: 11250.00, models: ["Giulia", "Stelvio"] },

  // ─── JEEP ─────────────────────────────────────────
  { brand: "Jeep", code: "ISCILIK-NORMAL-GRUP-A", name: "Normal Bakım İşçilik - Grup A (Renegade, Avenger)", hourlyRate: 8708.33, models: ["Renegade", "Avenger"] },
  { brand: "Jeep", code: "ISCILIK-NORMAL-GRUP-B", name: "Normal Bakım İşçilik - Grup B (Cherokee, Compass)", hourlyRate: 9675.00, models: ["Cherokee", "Compass"] },
  { brand: "Jeep", code: "ISCILIK-NORMAL-GRUP-C", name: "Normal Bakım İşçilik - Grup C (Grand Cherokee, Wrangler)", hourlyRate: 11250.00, models: ["Grand Cherokee", "Wrangler"] },

  // ─── LANCIA ───────────────────────────────────────
  { brand: "Lancia", code: "ISCILIK-NORMAL-GRUP-B", name: "Normal Bakım İşçilik - Grup B (Voyager)", hourlyRate: 9675.00, models: ["Voyager"] },
  { brand: "Lancia", code: "ISCILIK-NORMAL-GRUP-C", name: "Normal Bakım İşçilik - Grup C (Thema)", hourlyRate: 11250.00, models: ["Thema"] },
]

// Yeni marka/model/alt model tanımları
const newBrands = [
  {
    name: "Lancia",
    models: [
      { model: "Voyager", subModels: [{ name: "2.8 CRD", specs: { engineCode: "2.8 CRD", fuelType: "Dizel" } }] },
      { model: "Thema", subModels: [{ name: "3.0 V6 Dizel", specs: { engineCode: "3.0 V6", fuelType: "Dizel" } }] },
    ],
  },
]

const newModels = [
  { brand: "Jeep", model: "Cherokee", subModels: [
    { name: "2.0 Multijet", specs: { engineCode: "2.0 Multijet", engineSize: "2.0", fuelType: "Dizel", engineFamily: "Multijet" } },
    { name: "2.2 Multijet", specs: { engineCode: "2.2 Multijet", engineSize: "2.2", fuelType: "Dizel", engineFamily: "Multijet" } },
  ]},
]

async function main() {
  console.log("═══════════════════════════════════════════════════════")
  console.log("  ALFA ROMEO / JEEP / LANCIA İŞÇİLİK + MODEL EKLEME")
  console.log("═══════════════════════════════════════════════════════\n")

  // ─── 1) Lancia markası ve modelleri ekle ──────────────────────
  console.log("1) Yeni markalar ve modeller ekleniyor...\n")

  for (const b of newBrands) {
    let brand = await prisma.brand.findUnique({ where: { name: b.name } })
    if (!brand) {
      brand = await prisma.brand.create({ data: { name: b.name } })
      console.log(`  + Marka eklendi: ${b.name}`)
    } else {
      console.log(`  ✓ Marka mevcut: ${b.name}`)
    }

    for (const m of b.models) {
      let model = await prisma.vehicleModel.findFirst({ where: { brandId: brand.id, name: m.model } })
      if (!model) {
        model = await prisma.vehicleModel.create({ data: { brandId: brand.id, name: m.model } })
        console.log(`    + Model eklendi: ${m.model}`)
      }

      for (const sm of m.subModels) {
        let subModel = await prisma.subModel.findFirst({ where: { modelId: model.id, name: sm.name } })
        if (!subModel) {
          subModel = await prisma.subModel.create({ data: { modelId: model.id, name: sm.name } })
          console.log(`      + Alt model: ${sm.name}`)
        }
        for (const [key, value] of Object.entries(sm.specs)) {
          await prisma.vehicleSpec.upsert({
            where: { subModelId_specKey: { subModelId: subModel.id, specKey: key } },
            update: { specValue: value },
            create: { subModelId: subModel.id, specKey: key, specValue: value },
          })
        }
      }
    }
  }

  // ─── 2) Jeep Cherokee modeli ekle ─────────────────────────────
  for (const nm of newModels) {
    const brand = await prisma.brand.findUnique({ where: { name: nm.brand } })
    if (!brand) continue

    let model = await prisma.vehicleModel.findFirst({ where: { brandId: brand.id, name: nm.model } })
    if (!model) {
      model = await prisma.vehicleModel.create({ data: { brandId: brand.id, name: nm.model } })
      console.log(`    + Model eklendi: ${nm.brand} ${nm.model}`)
    } else {
      console.log(`    ✓ Model mevcut: ${nm.brand} ${nm.model}`)
    }

    for (const sm of nm.subModels) {
      let subModel = await prisma.subModel.findFirst({ where: { modelId: model.id, name: sm.name } })
      if (!subModel) {
        subModel = await prisma.subModel.create({ data: { modelId: model.id, name: sm.name } })
        console.log(`      + Alt model: ${sm.name}`)
      }
      for (const [key, value] of Object.entries(sm.specs)) {
        await prisma.vehicleSpec.upsert({
          where: { subModelId_specKey: { subModelId: subModel.id, specKey: key } },
          update: { specValue: value },
          create: { subModelId: subModel.id, specKey: key, specValue: value },
        })
      }
    }
  }

  // ─── 3) İşçilikleri ekle ──────────────────────────────────────
  console.log("\n2) Normal bakım işçilikleri ekleniyor...\n")

  for (const def of laborDefs) {
    const brand = await prisma.brand.findUnique({ where: { name: def.brand } })
    if (!brand) { console.log(`  HATA: Marka bulunamadı: ${def.brand}`); continue }

    // Mevcut aynı kodlu işçiliği sil/güncelle
    const existing = await prisma.laborOperation.findFirst({
      where: { brandId: brand.id, operationCode: def.code },
    })

    if (existing) {
      await prisma.laborOperation.update({
        where: { id: existing.id },
        data: { name: def.name, hourlyRate: def.hourlyRate, totalPrice: def.hourlyRate },
      })
      console.log(`  ✓ Güncellendi: ${def.brand} - ${def.name} → ${def.hourlyRate.toLocaleString("tr-TR")} TL`)
    } else {
      await prisma.laborOperation.create({
        data: {
          brandId: brand.id,
          operationCode: def.code,
          name: def.name,
          durationHours: 1,
          hourlyRate: def.hourlyRate,
          totalPrice: def.hourlyRate,
        },
      })
      console.log(`  + Eklendi: ${def.brand} - ${def.name} → ${def.hourlyRate.toLocaleString("tr-TR")} TL`)
    }
  }

  // ─── 4) Alfa Romeo / Jeep mevcut şablonlara NORMAL serviceType ata ──
  console.log("\n3) Mevcut şablonlara servis tipi atanıyor...\n")

  const brandsToFix = ["Alfa Romeo", "Jeep"]
  for (const brandName of brandsToFix) {
    const brand = await prisma.brand.findUnique({ where: { name: brandName } })
    if (!brand) continue

    const templates = await prisma.maintenanceTemplate.findMany({
      where: { brandId: brand.id, serviceType: null },
    })

    for (const t of templates) {
      if (t.periodKm === 0) {
        await prisma.maintenanceTemplate.update({
          where: { id: t.id },
          data: { serviceType: "HIZLI", name: "Hızlı Servis" },
        })
      } else {
        await prisma.maintenanceTemplate.update({
          where: { id: t.id },
          data: {
            serviceType: "NORMAL",
            name: `${(t.periodKm! / 1000).toFixed(0)}.000 km Normal Bakım`,
          },
        })
      }
    }
    console.log(`  ${brandName}: ${templates.length} şablon güncellendi (serviceType atandı)`)
  }

  // ─── 5) Lancia ve Jeep Cherokee için bakım şablonları oluştur ─
  console.log("\n4) Yeni modeller için bakım şablonları oluşturuluyor...\n")

  const maxKm = 120000
  const newModelPeriods = [
    { brand: "Lancia", model: "Voyager", subModel: "2.8 CRD", baseKm: 20000, baseMonth: 12 },
    { brand: "Lancia", model: "Thema", subModel: "3.0 V6 Dizel", baseKm: 20000, baseMonth: 12 },
    { brand: "Jeep", model: "Cherokee", subModel: "2.0 Multijet", baseKm: 15000, baseMonth: 12 },
    { brand: "Jeep", model: "Cherokee", subModel: "2.2 Multijet", baseKm: 15000, baseMonth: 12 },
  ]

  let templatesCreated = 0

  for (const p of newModelPeriods) {
    const brand = await prisma.brand.findUnique({ where: { name: p.brand } })
    if (!brand) continue
    const model = await prisma.vehicleModel.findFirst({ where: { brandId: brand.id, name: p.model } })
    if (!model) continue
    const subModel = await prisma.subModel.findFirst({ where: { modelId: model.id, name: p.subModel } })
    if (!subModel) continue

    // Hızlı Servis
    const existingHizli = await prisma.maintenanceTemplate.findFirst({
      where: { brandId: brand.id, modelId: model.id, subModelId: subModel.id, periodKm: 0 },
    })
    if (!existingHizli) {
      await prisma.maintenanceTemplate.create({
        data: {
          brandId: brand.id, modelId: model.id, subModelId: subModel.id,
          periodKm: 0, periodMonth: 0, serviceType: "HIZLI", name: "Hızlı Servis",
        },
      })
      templatesCreated++
    }

    // Normal Bakım periyodları
    for (let mult = 1; mult * p.baseKm <= maxKm; mult++) {
      const km = mult * p.baseKm
      const month = mult * p.baseMonth

      const existing = await prisma.maintenanceTemplate.findFirst({
        where: { brandId: brand.id, modelId: model.id, subModelId: subModel.id, periodKm: km, serviceType: "NORMAL" },
      })
      if (!existing) {
        await prisma.maintenanceTemplate.create({
          data: {
            brandId: brand.id, modelId: model.id, subModelId: subModel.id,
            periodKm: km, periodMonth: month, serviceType: "NORMAL",
            name: `${(km / 1000).toFixed(0)}.000 km Normal Bakım`,
          },
        })
        templatesCreated++
      }
    }
    console.log(`  + ${p.brand} ${p.model} ${p.subModel} → ${p.baseKm / 1000}K baz, NORMAL + Hızlı Servis`)
  }

  // ─── 6) Özet ──────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  SONUÇ")
  console.log("═══════════════════════════════════════════════════════")
  console.log(`  Yeni bakım şablonu: ${templatesCreated}`)
  console.log("═══════════════════════════════════════════════════════\n")

  // İşçilik özeti
  console.log("İŞÇİLİK ÜCRETLERİ:")
  console.log("─".repeat(70))
  for (const bName of ["Alfa Romeo", "Jeep", "Lancia"]) {
    const brand = await prisma.brand.findUnique({ where: { name: bName } })
    if (!brand) continue
    const ops = await prisma.laborOperation.findMany({
      where: { brandId: brand.id },
      orderBy: { hourlyRate: "asc" },
    })
    console.log(`\n  ${bName}:`)
    for (const op of ops) {
      console.log(`    ${op.name} → ${op.hourlyRate.toLocaleString("tr-TR")} TL/saat`)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
