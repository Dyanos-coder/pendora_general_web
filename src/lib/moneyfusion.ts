import 'server-only'

// MoneyFusion (paiement Mobile Money) — création d'un paiement et consultation de son état.
// Aucun secret webhook n'existe : l'état d'un paiement est toujours relu ici, auprès de
// MoneyFusion, avant tout traitement (Plan-Site-Pandora.md §9-F).

export interface MoneyFusionCreateInput {
  totalPrice: number
  article: Record<string, number>[]
  numeroSend: string
  nomclient: string
  personal_Info: Record<string, string>[]
  return_url: string
  webhook_url: string
}

export interface MoneyFusionStatus {
  statut: 'pending' | 'failure' | 'no paid' | 'paid' | string
  Montant?: number
  frais?: number
  numeroTransaction?: string
  moyen?: string
}

export async function createMoneyFusionPayment(input: MoneyFusionCreateInput): Promise<{ token: string; url: string }> {
  const apiUrl = process.env.MONEYFUSION_API_URL
  if (!apiUrl) throw new Error('MONEYFUSION_API_URL non configurée.')
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(20000)
  })
  const body = (await response.json().catch(() => null)) as { statut?: boolean; token?: string; url?: string; message?: string } | null
  if (!response.ok || !body?.statut || !body.token || !body.url) {
    throw new Error(`MoneyFusion a refusé la création du paiement${body?.message ? ` : ${body.message}` : ''}.`)
  }
  return { token: body.token, url: body.url }
}

export async function getMoneyFusionStatus(token: string): Promise<MoneyFusionStatus | null> {
  const response = await fetch(`https://pay.moneyfusion.net/paiementNotif/${encodeURIComponent(token)}`, {
    signal: AbortSignal.timeout(15000),
    cache: 'no-store'
  })
  const body = (await response.json().catch(() => null)) as { statut?: boolean; data?: MoneyFusionStatus } | null
  if (!response.ok || !body?.statut || !body.data) return null
  return body.data
}
