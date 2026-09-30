import type { Tone } from '@/components/ui'

// Statut d'abonnement affiché dans la console (pur, utilisable côté serveur et client).

export function subscriptionStatus(sub: { endDate: string; valid: boolean } | null | undefined): { label: string; tone: Tone; key: 'none' | 'invalid' | 'expired' | 'soon' | 'ok' } {
  if (!sub) return { label: 'Non activé', tone: 'neutral', key: 'none' }
  if (!sub.valid) return { label: 'Signature invalide', tone: 'danger', key: 'invalid' }
  const today = new Date().toISOString().slice(0, 10)
  if (sub.endDate < today) return { label: 'Expiré', tone: 'danger', key: 'expired' }
  const daysLeft = Math.round((Date.parse(`${sub.endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)
  if (daysLeft <= 7) return { label: `Expire dans ${daysLeft} j`, tone: 'warning', key: 'soon' }
  return { label: 'À jour', tone: 'success', key: 'ok' }
}

export function formatYmd(ymd: string | null | undefined): string {
  if (!ymd) return '—'
  const [y, m, d] = ymd.split('-')
  return `${d}/${m}/${y}`
}

export const PAYMENT_STATUS: Record<'EN_ATTENTE' | 'PAYE' | 'APPLIQUE' | 'ECHEC' | 'ANNULE', { label: string; tone: Tone }> = {
  EN_ATTENTE: { label: 'En attente', tone: 'warning' },
  PAYE: { label: 'Payé — à appliquer', tone: 'warning' },
  APPLIQUE: { label: 'Appliqué', tone: 'success' },
  ECHEC: { label: 'Échec', tone: 'danger' },
  ANNULE: { label: 'Annulé', tone: 'neutral' }
}
