import { createClient } from "@supabase/supabase-js"

export const LOANER_DOCS_BUCKET = "loaner-docs"

// Lazy-init: env vars modül yüklenirken değil, ilk kullanımda okunur
let _client: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      `Supabase env vars eksik: SUPABASE_URL=${url ? "OK" : "YOK"}, SUPABASE_SERVICE_ROLE_KEY=${key ? "OK" : "YOK"}`
    )
  }
  _client = createClient(url, key, { auth: { persistSession: false } })
  return _client
}

// Geriye uyumluluk — eski importlar kırılmasın
export const supabaseAdmin = {
  get storage() { return getSupabaseAdmin().storage },
}
