/**
 * TOTP (RFC 6238) implementation using only Node.js built-in crypto.
 * No external ESM-only dependencies.
 */
import { createHmac, randomBytes } from "crypto"

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function base32Decode(encoded: string): Buffer {
  const str = encoded.toUpperCase().replace(/=+$/, "").replace(/\s/g, "")
  let bits = 0
  let value = 0
  const output: number[] = []
  for (let i = 0; i < str.length; i++) {
    const idx = BASE32_CHARS.indexOf(str[i])
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(output)
}

function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let output = ""
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31]
  return output
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  buf.writeBigInt64BE(BigInt(counter))
  const hmac = createHmac("sha1", secret).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3]
  return String(code % 1_000_000).padStart(6, "0")
}

/** 20-byte base32-encoded secret üret */
export function generateSecret(): string {
  return base32Encode(randomBytes(20))
}

/** otpauth:// URI oluştur (Google Authenticator uyumlu) */
export function keyuri(email: string, service: string, secret: string): string {
  return `otpauth://totp/${encodeURIComponent(service)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(service)}`
}

/** TOTP token doğrula (±1 zaman penceresi = ±30 saniye tolerans) */
export function verifyTotp(token: string, secret: string): boolean {
  const key = base32Decode(secret)
  const counter = Math.floor(Date.now() / 1000 / 30)
  for (let delta = -1; delta <= 1; delta++) {
    if (hotp(key, counter + delta) === token) return true
  }
  return false
}
