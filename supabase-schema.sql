-- ================================================================
-- TABIA – Servis Teklif Sistemi
-- Supabase SQL Editor'da bu scripti çalıştırın
-- ================================================================

-- ─── Users & Auth ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "User" (
  id             TEXT PRIMARY KEY,
  email          TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  name           TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'ADVISOR', -- ADMIN | ADVISOR
  active         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Vehicle Catalog ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Brand" (
  id          TEXT PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "VehicleModel" (
  id          TEXT PRIMARY KEY,
  "brandId"   TEXT NOT NULL REFERENCES "Brand"(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("brandId", name)
);

CREATE TABLE IF NOT EXISTS "SubModel" (
  id          TEXT PRIMARY KEY,
  "modelId"   TEXT NOT NULL REFERENCES "VehicleModel"(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("modelId", name)
);

CREATE TABLE IF NOT EXISTS "VehicleSpec" (
  id           TEXT PRIMARY KEY,
  "subModelId" TEXT NOT NULL REFERENCES "SubModel"(id) ON DELETE CASCADE,
  "specKey"    TEXT NOT NULL,
  "specValue"  TEXT NOT NULL,
  UNIQUE ("subModelId", "specKey")
);

-- ─── Parts ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Part" (
  id           TEXT PRIMARY KEY,
  "brandId"    TEXT NOT NULL REFERENCES "Brand"(id) ON DELETE CASCADE,
  "partNo"     TEXT NOT NULL,
  name         TEXT NOT NULL,
  "unitPrice"  DOUBLE PRECISION NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'TRY',
  "validFrom"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "versionTag" TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("brandId", "partNo")
);

CREATE INDEX IF NOT EXISTS "Part_partNo_idx" ON "Part"("partNo");
CREATE INDEX IF NOT EXISTS "Part_name_idx"   ON "Part"(name);

-- ─── Labor Operations ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LaborOperation" (
  id              TEXT PRIMARY KEY,
  "brandId"       TEXT NOT NULL REFERENCES "Brand"(id) ON DELETE CASCADE,
  "operationCode" TEXT NOT NULL,
  name            TEXT NOT NULL,
  "durationHours" DOUBLE PRECISION NOT NULL,
  "hourlyRate"    DOUBLE PRECISION NOT NULL,
  "totalPrice"    DOUBLE PRECISION,
  currency        TEXT NOT NULL DEFAULT 'TRY',
  "validFrom"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "versionTag"    TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("brandId", "operationCode")
);

CREATE INDEX IF NOT EXISTS "LaborOperation_operationCode_idx" ON "LaborOperation"("operationCode");
CREATE INDEX IF NOT EXISTS "LaborOperation_name_idx"          ON "LaborOperation"(name);

-- ─── Maintenance Templates ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "MaintenanceTemplate" (
  id            TEXT PRIMARY KEY,
  "brandId"     TEXT NOT NULL REFERENCES "Brand"(id) ON DELETE CASCADE,
  "modelId"     TEXT REFERENCES "VehicleModel"(id),
  "subModelId"  TEXT REFERENCES "SubModel"(id),
  "periodKm"    INTEGER,
  "periodMonth" INTEGER,
  "serviceType" TEXT,  -- NORMAL | HIZLI
  name          TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "MaintenanceTemplate_lookup_idx"
  ON "MaintenanceTemplate"("brandId", "modelId", "subModelId", "periodKm", "serviceType");

CREATE TABLE IF NOT EXISTS "MaintenanceTemplateItem" (
  id                 TEXT PRIMARY KEY,
  "templateId"       TEXT NOT NULL REFERENCES "MaintenanceTemplate"(id) ON DELETE CASCADE,
  "itemType"         TEXT NOT NULL,  -- PART | LABOR
  "referenceCode"    TEXT NOT NULL,
  quantity           DOUBLE PRECISION NOT NULL DEFAULT 1,
  "durationOverride" DOUBLE PRECISION,
  "sortOrder"        INTEGER NOT NULL DEFAULT 0
);

-- ─── Quotes ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Quote" (
  id                TEXT PRIMARY KEY,
  "quoteNo"         TEXT UNIQUE NOT NULL,
  revision          INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT | FINALIZED | CANCELLED

  -- Müşteri
  "customerName"    TEXT,
  "customerPhone"   TEXT,
  "customerEmail"   TEXT,
  "plateNo"         TEXT,

  -- Araç (tarihsel saklama)
  "brandName"       TEXT NOT NULL,
  "modelName"       TEXT NOT NULL,
  "subModelName"    TEXT,
  "vehicleSpecs"    TEXT,  -- JSON
  "periodKm"        INTEGER,
  "periodMonth"     INTEGER,
  "serviceType"     TEXT,

  -- Fiyatlandırma
  "partsSubtotal"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "laborSubtotal"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  subtotal          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountType"    TEXT,  -- PERCENT | AMOUNT
  "discountValue"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountAmount"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxRate"         DOUBLE PRECISION NOT NULL DEFAULT 20,
  "taxAmount"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "grandTotal"      DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- Meta
  "priceListVersion" TEXT,
  notes              TEXT,
  "createdById"      TEXT NOT NULL REFERENCES "User"(id),
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Quote_createdById_idx" ON "Quote"("createdById");
CREATE INDEX IF NOT EXISTS "Quote_createdAt_idx"   ON "Quote"("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "QuoteItem" (
  id               TEXT PRIMARY KEY,
  "quoteId"        TEXT NOT NULL REFERENCES "Quote"(id) ON DELETE CASCADE,
  "itemType"       TEXT NOT NULL,   -- PART | LABOR
  "referenceCode"  TEXT NOT NULL,
  name             TEXT NOT NULL,
  quantity         DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitPrice"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountPct"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalPrice"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "durationHours"  DOUBLE PRECISION,
  "hourlyRate"     DOUBLE PRECISION,
  "sortOrder"      INTEGER NOT NULL DEFAULT 0
);

-- ─── Import Tracking ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PriceListVersion" (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,  -- PART | LABOR | TEMPLATE
  "brandName"     TEXT NOT NULL,
  "fileName"      TEXT NOT NULL,
  "recordCount"   INTEGER NOT NULL DEFAULT 0,
  added           INTEGER NOT NULL DEFAULT 0,
  updated         INTEGER NOT NULL DEFAULT 0,
  errors          INTEGER NOT NULL DEFAULT 0,
  "errorDetails"  TEXT,  -- JSON
  "uploadedById"  TEXT NOT NULL REFERENCES "User"(id),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── App Settings ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AppSetting" (
  id    TEXT PRIMARY KEY,
  key   TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE "User"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleModel"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubModel"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleSpec"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Part"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LaborOperation"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaintenanceTemplate"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaintenanceTemplateItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteItem"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceListVersion"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppSetting"              ENABLE ROW LEVEL SECURITY;

-- Prisma service_role key tüm tablolara tam erişim (RLS bypass)
-- Uygulama Prisma üzerinden service_role ile bağlandığı için
-- ayrıca policy gerekmez. İleride anon/authenticated erişim
-- gerekirse buraya policy eklenebilir.
