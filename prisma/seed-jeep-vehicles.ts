import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface VehicleDef {
  model: string
  subModel: string
  specs: Record<string, string>
}

const vehicles: VehicleDef[] = [
  // ─── 1.3 MOTOR ────────────────────────────
  { model: "Renegade", subModel: "1.3 T4", specs: { engineCode: "1.3 T4", engineSize: "1.3", fuelType: "Benzin", engineFamily: "T4" } },
  { model: "Compass", subModel: "1.3 T4", specs: { engineCode: "1.3 T4", engineSize: "1.3", fuelType: "Benzin", engineFamily: "T4" } },

  // ─── 1.5 MOTOR ────────────────────────────
  { model: "Renegade", subModel: "1.5 e-Hybrid", specs: { engineCode: "1.5 e-Hybrid", engineSize: "1.5", fuelType: "Hibrit", engineFamily: "e-Hybrid" } },
  { model: "Compass", subModel: "1.5 e-Hybrid", specs: { engineCode: "1.5 e-Hybrid", engineSize: "1.5", fuelType: "Hibrit", engineFamily: "e-Hybrid" } },

  // ─── 2.0 MOTOR ────────────────────────────
  { model: "Compass", subModel: "2.0 Multijet", specs: { engineCode: "2.0 Multijet", engineSize: "2.0", fuelType: "Dizel", engineFamily: "Multijet" } },
  { model: "Wrangler", subModel: "2.0 Turbo", specs: { engineCode: "2.0 Turbo", engineSize: "2.0", fuelType: "Benzin", engineFamily: "Turbo" } },

  // ─── 2.2 MOTOR ────────────────────────────
  { model: "Wrangler", subModel: "2.2 Multijet", specs: { engineCode: "2.2 Multijet", engineSize: "2.2", fuelType: "Dizel", engineFamily: "Multijet" } },

  // ─── DİĞER MOTORLAR ───────────────────────
  { model: "Avenger", subModel: "1.2 Turbo", specs: { engineCode: "1.2 Turbo", engineSize: "1.2", fuelType: "Benzin", engineFamily: "Turbo" } },
  { model: "Avenger", subModel: "Elektrikli", specs: { engineCode: "Elektrik", fuelType: "Elektrik" } },

  { model: "Renegade", subModel: "4xe Plug-in Hybrid", specs: { engineCode: "1.3 + Elektrik", engineSize: "1.3", fuelType: "Plug-in Hybrid", engineFamily: "4xe", driveType: "AWD" } },
  { model: "Compass", subModel: "4xe Plug-in Hybrid", specs: { engineCode: "1.3 + Elektrik", engineSize: "1.3", fuelType: "Plug-in Hybrid", engineFamily: "4xe", driveType: "AWD" } },

  { model: "Grand Cherokee", subModel: "4xe Plug-in Hybrid", specs: { engineCode: "2.0 + Elektrik", engineSize: "2.0", fuelType: "Plug-in Hybrid", engineFamily: "4xe", driveType: "AWD" } },
  { model: "Grand Cherokee", subModel: "3.0 Dizel", specs: { engineCode: "3.0", engineSize: "3.0", fuelType: "Dizel" } },
]

async function main() {
  const jeep = await prisma.brand.findUnique({ where: { name: "Jeep" } })
  if (!jeep) throw new Error("Jeep markası bulunamadı!")

  console.log(`Jeep markası bulundu: ${jeep.id}`)
  console.log(`Toplam ${vehicles.length} araç tanımı eklenecek...\n`)

  let modelsCreated = 0
  let modelsExisted = 0
  let subModelsCreated = 0
  let subModelsExisted = 0
  let specsCreated = 0

  for (const v of vehicles) {
    let model = await prisma.vehicleModel.findFirst({
      where: { brandId: jeep.id, name: v.model },
    })
    if (!model) {
      model = await prisma.vehicleModel.create({
        data: { brandId: jeep.id, name: v.model },
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
    where: { brandId: jeep.id },
    include: {
      subModels: {
        include: { specs: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  console.log("JEEP ARAÇ KATALOĞU:")
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
