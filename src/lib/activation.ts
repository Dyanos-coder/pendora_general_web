import 'server-only'
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto'
import type { Device, Hospital } from '@/generated/prisma/client'
import { prisma } from './db'
import { decryptSecret, encryptSecret } from './crypto'
import { accessOf, type HospitalDbAccess } from './hospital-db'

// Codes d'activation des postes (Plan-Code-Activation.md). Le code ne contient aucune information :
// c'est une clé aléatoire (≈ 125 bits) qui permet à un poste de demander au site les accès à la base
// de son hôpital. Un poste activé reçoit son propre jeton pour récupérer ensuite les accès à jour.

// Sans caractères ambigus (0/O, 1/I/L) : le code est souvent recopié à la main.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const GROUPS = 5
const GROUP_LENGTH = 5

export function generateActivationCode(): string {
  const groups = Array.from({ length: GROUPS }, () =>
    Array.from({ length: GROUP_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  )
  return `PND-${groups.join('-')}`
}

/** Forme canonique (majuscules, sans espaces ni tirets, sans le préfixe) : tolère les erreurs de copie. */
function canonical(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/^PND/, '')
}

export function hashActivationCode(code: string): string {
  return createHash('sha256').update(`pandora-activation:${canonical(code)}`).digest('hex')
}

/** Nouveau code pour un hôpital (l'ancien devient inutilisable ; les postes déjà activés restent). */
export async function assignActivationCode(hospitalId: string): Promise<string> {
  const code = generateActivationCode()
  await prisma.hospital.update({
    where: { id: hospitalId },
    data: { activationCodeHash: hashActivationCode(code), activationCodeEnc: encryptSecret(code), activationCodeAt: new Date() }
  })
  return code
}

export function readActivationCode(hospital: Hospital): string | null {
  if (!hospital.activationCodeEnc) return null
  try {
    return decryptSecret(hospital.activationCodeEnc)
  } catch {
    return null
  }
}

export async function findHospitalByCode(code: string): Promise<Hospital | null> {
  if (canonical(code).length !== GROUPS * GROUP_LENGTH) return null
  return prisma.hospital.findUnique({ where: { activationCodeHash: hashActivationCode(code) } })
}

// --- Jetons des postes ---------------------------------------------------------------------------

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Jeton transmis au poste : « idDuPoste.secret ». Seule l'empreinte du secret est conservée. */
export async function createDevice(hospitalId: string, name: string, appVersion: string | null): Promise<{ device: Device; token: string }> {
  const secret = randomBytes(32).toString('base64url')
  const device = await prisma.device.create({
    data: { hospitalId, name: name.slice(0, 120) || 'Poste', appVersion: appVersion?.slice(0, 40) ?? null, tokenHash: hashToken(secret) }
  })
  return { device, token: `${device.id}.${secret}` }
}

export type DeviceAuth = { ok: true; device: Device & { hospital: Hospital } } | { ok: false; reason: 'INVALID' | 'REVOKED' }

/** Authentifie un poste par son jeton (en-tête `Authorization: Bearer idDuPoste.secret`). */
export async function authenticateDevice(request: Request): Promise<DeviceAuth> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '')
  const [id, secret] = token.split('.')
  if (!id || !secret) return { ok: false, reason: 'INVALID' }
  const device = await prisma.device.findUnique({ where: { id }, include: { hospital: true } })
  if (!device) return { ok: false, reason: 'REVOKED' }
  const expected = Buffer.from(device.tokenHash, 'hex')
  const given = Buffer.from(hashToken(secret), 'hex')
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: 'INVALID' }
  if (device.revokedAt) return { ok: false, reason: 'REVOKED' }
  return { ok: true, device }
}

/** Accès à la base transmis au poste (HTTPS uniquement). */
export function dbAccessPayload(hospital: Hospital): HospitalDbAccess {
  return accessOf(hospital)
}

// --- Anti force brute (compté en base : le site tourne sur plusieurs instances) -------------------

const MAX_FAILURES_PER_HOUR = 10

export function clientIp(request: Request): string {
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'inconnue'
}

export async function tooManyFailures(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const failures = await prisma.auditLog.count({ where: { action: 'activation.failed', target: ip, createdAt: { gte: since } } })
  return failures >= MAX_FAILURES_PER_HOUR
}
