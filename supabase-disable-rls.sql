-- Prisma sunucu taraflı çalıştığı için RLS'ye gerek yok
-- Uygulama seviyesinde NextAuth ile erişim kontrolü yapılıyor

ALTER TABLE "User"                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Brand"                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleModel"            DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SubModel"                DISABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleSpec"             DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Part"                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE "LaborOperation"          DISABLE ROW LEVEL SECURITY;
ALTER TABLE "MaintenanceTemplate"     DISABLE ROW LEVEL SECURITY;
ALTER TABLE "MaintenanceTemplateItem" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote"                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteItem"               DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PriceListVersion"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AppSetting"              DISABLE ROW LEVEL SECURITY;
