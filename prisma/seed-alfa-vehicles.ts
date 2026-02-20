import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface VehicleDef {
  model: string
  subModel: string
  specs: Record<string, string>
}

const vehicles: VehicleDef[] = [
  // ─── 1.3 MOTOR ────────────────────────────
  { model: "Tonale", subModel: "1.3 Plug-in Hybrid Q4", specs: { engineCode: "1.3 + Elektrik", engineSize: "1.3", fuelType: "Plug-in Hybrid", engineFamily: "PHEV", driveType: "AWD (Q4)" } },

  // ─── 1.5 MOTOR ────────────────────────────
  { model: "Tonale", subModel: "1.5 Hybrid", specs: { engineCode: "1.5 Hybrid", engineSize: "1.5", fuelType: "Hibrit", engineFamily: "Hybrid" } },

  // ─── 2.0 MOTOR ────────────────────────────
  { model: "Giulia", subModel: "2.0 Turbo", specs: { engineCode: "2.0 Turbo", engineSize: "2.0", fuelType: "Benzin", engineFamily: "Turbo" } },
  { model: "Stelvio", subModel: "2.0 Turbo", specs: { engineCode: "2.0 Turbo", engineSize: "2.0", fuelType: "Benzin", engineFamily: "Turbo" } },

  // ─── 2.2 MOTOR ────────────────────────────
  { model: "Giulia", subModel: "2.2 Dizel", specs: { engineCode: "2.2 Dizel", engineSize: "2.2", fuelType: "Dizel" } },
  { model: "Stelvio", subModel: "2.2 Dizel", specs: { engineCode: "2.2 Dizel", engineSize: "2.2", fuelType: "Dizel" } },

  // ─── DİĞER MOTORLAR ───────────────────────
  { model: "Junior", subModel: "Elektrikli", specs: { engineCode: "Elektrik", fuelType: "Elektrik" } },
  { model: "Junior", subModel: "1.2 Hybrid", specs: { engineCode: "1.2 Hybrid", engineSize: "1.2", fuelType: "Hibrit", engineFamily: "Hybrid" } },
  { model: "Tonale", subModel: "1.6 Dizel", specs: { engineCode: "1.6 Dizel", engineSize: "1.6", fuelType: "Dizel" } },
]

async function main() {
  const alfa = await prisma.brand.findUnique({ where: { name: "Alfa Romeo" } })
  if (!alfa) throw new Error("Alfa Romeo markası bulunamadı!")

  console.log(`Alfa Romeo markası bulundu: ${alfa.id}`)
  console.log(`Toplam ${vehicles.length} araç tanımı eklenecek...\n`)

  let modelsCreated = 0
  let modelsExisted = 0
  let subModelsCreated = 0
  let subModelsExisted = 0
  let specsCreated = 0

  for (const v of vehicles) {
    let model = await prisma.vehicleModel.findFirst({
      where: { brandId: alfa.id, name: v.model },
    })
    if (!model) {
      model = await prisma.vehicleModel.create({
        data: { brandId: alfa.id, name: v.model },
      })
      modelsCreated++
      console.log(`+ Model oluşturuldu: ${v.model}`)
    } else {
      modelsExisted++
    }

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

  const allModels = await prisma.vehicleModel.findMany({
    where: { brandId: alfa.id },
    include: {
      subModels: {
        include: { specs: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  console.log("ALFA ROMEO ARAÇ KATALOĞU:")
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
