import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Chiffrement des mots de passe des bases des hôpitaux (AES-256-GCM). La clé (CREDENTIALS_KEY,
// 32 octets en base64) n'existe que dans la configuration du serveur, jamais en base.
// Format stocké : base64(iv) . base64(tag) . base64(texte chiffré)

function key(): Buffer {
  const raw = process.env.CREDENTIALS_KEY
  const buffer = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0)
  if (buffer.length !== 32) throw new Error('CREDENTIALS_KEY absente ou invalide (32 octets en base64, voir .env.example).')
  return buffer
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64')).join('.')
}

export function decryptSecret(stored: string): string {
  const [iv, tag, encrypted] = stored.split('.').map((part) => Buffer.from(part, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
