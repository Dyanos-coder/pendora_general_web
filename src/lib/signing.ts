import 'server-only'
import { createPrivateKey, createPublicKey, sign, verify } from 'crypto'

// Signature Ed25519 des abonnements (§6.4). La clé privée (SUBSCRIPTION_PRIVATE_KEY) ne quitte
// jamais le serveur ; l'application des hôpitaux embarque la clé publique correspondante.

function privateKey() {
  const raw = process.env.SUBSCRIPTION_PRIVATE_KEY
  if (!raw) throw new Error('SUBSCRIPTION_PRIVATE_KEY absente (voir .env.example).')
  return createPrivateKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'pkcs8' })
}

export function signText(text: string): string {
  return sign(null, Buffer.from(text, 'utf8'), privateKey()).toString('base64')
}

export function verifyText(text: string, signature: string): boolean {
  try {
    return verify(null, Buffer.from(text, 'utf8'), createPublicKey(privateKey()), Buffer.from(signature, 'base64'))
  } catch {
    return false
  }
}
