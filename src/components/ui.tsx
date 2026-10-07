import type { ReactNode } from 'react'

// Petits composants d'interface partagés (sans état — utilisables côté serveur comme client).

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(10,30,18,0.05),0_6px_18px_rgba(10,30,18,0.05)] ${className}`}
    >
      {children}
    </div>
  )
}

/** Tracé de pouls (ECG), signature de la marque — sous les titres de page. */
export function EcgLine({ className = '' }: { className?: string }) {
  return (
    <svg className={`block ${className}`} viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 35 H120 L132 35 L140 22 L148 35 H170 L180 35 L188 6 L198 62 L206 35 H240 L252 28 L262 35 H400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold'

// « Succès » en turquoise : distinct du vert des boutons (même règle que l'application).
const TONES: Record<Tone, string> = {
  success: 'bg-teal-50 text-teal-700 ring-teal-600/15',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/15',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  neutral: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  gold: 'bg-gold-100 text-gold-700 ring-gold-600/20'
}

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs leading-none font-semibold whitespace-nowrap ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  )
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-extrabold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        <EcgLine className="mt-2.5 h-3.5 w-28 text-accent-500" />
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  const accent =
    tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : tone === 'success' ? 'text-teal-700' : tone === 'gold' ? 'text-gold-700' : 'text-gray-900'
  return (
    <Card className={tone === 'gold' ? 'border-gold-300/70 bg-gradient-to-br from-gold-50 via-white to-white' : ''}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 font-display text-[26px] leading-tight font-extrabold tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </Card>
  )
}

export const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-[10px] bg-gradient-to-b from-accent-500 to-accent-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-accent-600/25 transition-all hover:from-accent-600 hover:to-accent-700 hover:shadow-[0_0_0_4px_var(--color-accent-100),0_0_18px_rgba(52,204,107,0.35)] disabled:cursor-not-allowed disabled:opacity-60'
export const buttonSecondary =
  'inline-flex items-center justify-center gap-2 rounded-[10px] border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
export const inputClass =
  'w-full rounded-[10px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-[border-color,box-shadow] focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
export const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

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
  if (state.success) return <p className="text-sm text-teal-700">{state.success}</p>
  return null
}
