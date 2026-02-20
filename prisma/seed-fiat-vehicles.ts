import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface VehicleDef {
  model: string
  subModel: string
  specs: Record<string, string>
}

const vehicles: VehicleDef[] = [
  // ─── 1.2 MOTOR ────────────────────────────
  { model: "500", subModel: "1.2", specs: { engineCode: "1.2", engineSize: "1.2", fuelType: "Benzin", engineFamily: "Fire" } },
  { model: "Panda", subModel: "1.2", specs: { engineCode: "1.2", engineSize: "1.2", fuelType: "Benzin", engineFamily: "Fire" } },
  { model: "500L", subModel: "1.2", specs: { engineCode: "1.2", engineSize: "1.2", fuelType: "Benzin", engineFamily: "Fire" } },
  { model: "500X", subModel: "1.2", specs: { engineCode: "1.2", engineSize: "1.2", fuelType: "Benzin", engineFamily: "Fire" } },

  // ─── 1.3 MOTOR (Multijet / Dizel) ─────────
  { model: "Egea", subModel: "Sedan 1.3 Multijet", specs: { engineCode: "1.3 Multijet", engineSize: "1.3", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Egea", subModel: "Hatchback 1.3 Multijet", specs: { engineCode: "1.3 Multijet", engineSize: "1.3", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Egea", subModel: "Station Wagon 1.3 Multijet", specs: { engineCode: "1.3 Multijet", engineSize: "1.3", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Egea", subModel: "Cross 1.3 Multijet", specs: { engineCode: "1.3 Multijet", engineSize: "1.3", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Fiorino", subModel: "1.3 Multijet", specs: { engineCode: "1.3 Multijet", engineSize: "1.3", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Doblo", subModel: "1.3 Multijet", specs: { engineCode: "1.3 Multijet", engineSize: "1.3", fuelType: "Dizel", engineFamily: "Multijet" } },

  // ─── 1.4 MOTOR (Fire / Benzin) ────────────
  { model: "Egea", subModel: "Sedan 1.4 Fire", specs: { engineCode: "1.4 Fire", engineSize: "1.4", fuelType: "Benzin", engineFamily: "Fire" } },
  { model: "Egea", subModel: "Hatchback 1.4 Fire", specs: { engineCode: "1.4 Fire", engineSize: "1.4", fuelType: "Benzin", engineFamily: "Fire" } },
  { model: "Egea", subModel: "Station Wagon 1.4 Fire", specs: { engineCode: "1.4 Fire", engineSize: "1.4", fuelType: "Benzin", engineFamily: "Fire" } },
  { model: "Egea", subModel: "Cross 1.4 Fire", specs: { engineCode: "1.4 Fire", engineSize: "1.4", fuelType: "Benzin", engineFamily: "Fire" } },
  { model: "Fiorino", subModel: "1.4 Fire", specs: { engineCode: "1.4 Fire", engineSize: "1.4", fuelType: "Benzin", engineFamily: "Fire" } },

  // ─── 1.6 MOTOR (Multijet / Dizel) ─────────
  { model: "Egea", subModel: "Sedan 1.6 Multijet", specs: { engineCode: "1.6 Multijet", engineSize: "1.6", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Egea", subModel: "Hatchback 1.6 Multijet", specs: { engineCode: "1.6 Multijet", engineSize: "1.6", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Egea", subModel: "Station Wagon 1.6 Multijet", specs: { engineCode: "1.6 Multijet", engineSize: "1.6", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Egea", subModel: "Cross 1.6 Multijet", specs: { engineCode: "1.6 Multijet", engineSize: "1.6", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Doblo", subModel: "1.6 Multijet", specs: { engineCode: "1.6 Multijet", engineSize: "1.6", fuelType: "Dizel", engineFamily: "Multijet" } },

  // ─── DİĞER MOTORLAR ───────────────────────
  // Elektrikli
  { model: "600", subModel: "Elektrikli", specs: { engineCode: "Elektrik", fuelType: "Elektrik", driveType: "FWD" } },
  { model: "500e", subModel: "Elektrikli", specs: { engineCode: "Elektrik", fuelType: "Elektrik", driveType: "FWD" } },
  { model: "Topolino", subModel: "Elektrikli", specs: { engineCode: "Elektrik", fuelType: "Elektrik" } },

  // Ulysse
  { model: "Ulysse", subModel: "2.0 Dizel", specs: { engineCode: "2.0", engineSize: "2.0", fuelType: "Dizel" } },
  { model: "Ulysse", subModel: "Elektrikli", specs: { engineCode: "Elektrik", fuelType: "Elektrik" } },

  // Grande Panda
  { model: "Grande Panda", subModel: "Hibrit", specs: { engineCode: "Hibrit", fuelType: "Hibrit" } },
  { model: "Grande Panda", subModel: "Elektrikli", specs: { engineCode: "Elektrik", fuelType: "Elektrik" } },

  // Scudo
  { model: "Scudo", subModel: "2.0 Dizel", specs: { engineCode: "2.0", engineSize: "2.0", fuelType: "Dizel" } },
  { model: "Scudo", subModel: "Elektrikli", specs: { engineCode: "Elektrik", fuelType: "Elektrik" } },

  // Ducato
  { model: "Ducato", subModel: "2.2 Multijet", specs: { engineCode: "2.2 Multijet", engineSize: "2.2", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Ducato", subModel: "2.3 Multijet", specs: { engineCode: "2.3 Multijet", engineSize: "2.3", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Ducato", subModel: "3.0 Multijet", specs: { engineCode: "3.0 Multijet", engineSize: "3.0", fuelType: "Dizel", engineFamily: "Multijet" } },
]

async function main() {
  const fiat = await prisma.brand.findUnique({ where: { name: "Fiat" } })
  if (!fiat) throw new Error("Fiat markası bulunamadı!")

  console.log(`Fiat markası bulundu: ${fiat.id}`)
  console.log(`Toplam ${vehicles.length} araç tanımı eklenecek...\n`)

  let modelsCreated = 0
  let modelsExisted = 0
  let subModelsCreated = 0
  let subModelsExisted = 0
  let specsCreated = 0

  // First remove old seed sub-models that don't match new structure
  // (Sedan, Hatchback, Cross without engine info)
  const oldSubModels = await prisma.subModel.findMany({
    where: {
      model: { brandId: fiat.id },
      name: { in: ["Sedan", "Hatchback", "Cross"] },
    },
    include: { model: true },
  })
  for (const old of oldSubModels) {
    if (old.model.name === "Egea") {
      console.log(`  Eski alt model siliniyor: Egea > ${old.name}`)
      await prisma.vehicleSpec.deleteMany({ where: { subModelId: old.id } })
      await prisma.subModel.delete({ where: { id: old.id } })
    }
  }

  for (const v of vehicles) {
    // Upsert model
    let model = await prisma.vehicleModel.findFirst({
      where: { brandId: fiat.id, name: v.model },
    })
    if (!model) {
      model = await prisma.vehicleModel.create({
        data: { brandId: fiat.id, name: v.model },
      })
      modelsCreated++
      console.log(`+ Model oluşturuldu: ${v.model}`)
    } else {
      modelsExisted++
    }

    // Upsert sub-model
    let subModel = await prisma.subModel.findFirst({
      where: { modelId: model.id, name: v.subModel },
    })
    if (!subModel) {
      subModel = await prisma.subModel.create({
        data: { modelId: model.id, name: v.subModel },
      })
      subModelsCreated++
      console.log(`  + Alt model oluşturuldu: ${v.model} > ${v.subModel}`)
    } else {
      subModelsExisted++
    }

    // Upsert specs
    for (const [key, value] of Object.entries(v.specs)) {
      await prisma.vehicleSpec.upsert({
        where: { subModelId_specKey: { subModelId: subModel.id, specKey: key } },
        update: { specValue: value },
        create: { subModelId: subModel.id, specKey: key, specValue: value },
      })
      specsCreated++
    }
  }

  console.log("\n════════════════════════════════════")
  console.log("  SONUÇ")
  console.log("════════════════════════════════════")
  console.log(`  Yeni model:     ${modelsCreated} (mevcut: ${modelsExisted})`)
  console.log(`  Yeni alt model: ${subModelsCreated} (mevcut: ${subModelsExisted})`)
  console.log(`  Spec kayıtları: ${specsCreated}`)
  console.log("════════════════════════════════════\n")

  // Final summary
  const allModels = await prisma.vehicleModel.findMany({
    where: { brandId: fiat.id },
    include: {
      subModels: {
        include: { specs: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  console.log("FIAT ARAÇ KATALOĞU:")
  console.log("─".repeat(50))
  for (const m of allModels) {
    console.log(`\n${m.name} (${m.subModels.length} alt model)`)
    for (const sm of m.subModels) {
      const specStr = sm.specs.map(s => `${s.specKey}=${s.specValue}`).join(", ")
      console.log(`  ├─ ${sm.name}${specStr ? ` [${specStr}]` : ""}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
