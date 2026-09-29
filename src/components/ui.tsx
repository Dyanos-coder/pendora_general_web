import type { ReactNode } from 'react'

// Petits composants d'interface partagés (sans état — utilisables côté serveur comme client).

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONES: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-accent-50 text-accent-700',
  neutral: 'bg-gray-100 text-gray-600'
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  const accent = tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : tone === 'success' ? 'text-emerald-600' : 'text-gray-900'
  return (
    <Card>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </Card>
  )
}

export const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60'
export const buttonSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
export const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20'
export const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} F`
}

export function formatDate(iso: string | Date | null | undefined, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return withTime
    ? `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString('fr-FR')
}

export const MOBILE_STATUS: Record<'NON_SOUHAITEE' | 'SOUHAITEE' | 'INSTALLEE', { label: string; tone: Tone }> = {
  NON_SOUHAITEE: { label: 'Non souhaitée', tone: 'neutral' },
  SOUHAITEE: { label: 'Souhaitée', tone: 'warning' },
  INSTALLEE: { label: 'Installée', tone: 'success' }
}

export function FormMessage({ state }: { state: { error?: string; success?: string } | undefined }) {
  if (!state) return null
  if (state.error) return <p className="text-sm text-red-600">{state.error}</p>
  if (state.success) return <p className="text-sm text-emerald-600">{state.success}</p>
  return null
}
