'use client'

import { useState, useTransition } from 'react'
import { BadgePercent, Plus, Trash2 } from 'lucide-react'
import { saveDiscountTiers } from '@/app/actions/discounts'
import type { FormState } from '@/app/actions/form-state'
import { MAX_TIERS, applyPercent, sortTiers, validateTiers, type DiscountTierRule } from '@/lib/discount-math'
import { Card, FormMessage, buttonPrimary, buttonSecondary, formatFcfa, inputClass } from '@/components/ui'

// Console › Plans & tarifs : réductions selon le nombre d'éléments choisis (Plan-Reductions-Abonnement.md).

interface Row {
  id: number
  minItems: string
  percent: string
}

/** Exemple proposé en un clic : celui de la demande (3 éléments −17 %, 10 éléments −25 %). */
const EXAMPLE: DiscountTierRule[] = [
  { minItems: 3, percent: 17 },
  { minItems: 10, percent: 25 }
]

// Champ étroit : la classe commune est pleine largeur.
const smallInput = `${inputClass.replace('w-full', '')} w-20 text-center`

let nextId = 1
const toRows = (tiers: DiscountTierRule[]): Row[] =>
  sortTiers(tiers).map((t) => ({ id: nextId++, minItems: String(t.minItems), percent: String(t.percent) }))

export function DiscountTiersEditor({ tiers, unitPrice }: { tiers: DiscountTierRule[]; unitPrice: number }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(tiers))
  const [state, setState] = useState<FormState>(undefined)
  const [pending, startTransition] = useTransition()

  const parsed = rows.map((r) => ({ minItems: Number(r.minItems), percent: Number(r.percent) }))
  const complete = rows.every((r) => r.minItems.trim() !== '' && r.percent.trim() !== '')
  const problem = complete ? validateTiers(parsed) : 'Complétez chaque palier.'
  const changed = JSON.stringify(sortTiers(parsed)) !== JSON.stringify(sortTiers(tiers))

  function update(id: number, field: 'minItems' | 'percent', value: string): void {
    setState(undefined)
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value.replace(/[^\d]/g, '') } : r)))
  }

  function save(): void {
    startTransition(async () => {
      const result = await saveDiscountTiers(sortTiers(parsed))
      setState(result)
      if (result?.success) setRows(toRows(parsed))
    })
  }

  return (
    <Card className="mb-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <BadgePercent className="h-4 w-4 text-accent-600" />
          Réductions selon le nombre d&apos;éléments
        </h2>
        <div className="flex flex-wrap gap-2">
          {rows.length === 0 && (
            <button type="button" onClick={() => setRows(toRows(EXAMPLE))} className={buttonSecondary}>
              Utiliser l&apos;exemple (3 → 17 %, 10 → 25 %)
            </button>
          )}
          <button
            type="button"
            disabled={rows.length >= MAX_TIERS}
            onClick={() => {
              setState(undefined)
              const last = sortTiers(parsed.filter((t) => t.minItems > 0)).at(-1)
              setRows((prev) => [
                ...prev,
                { id: nextId++, minItems: String(last ? last.minItems + 3 : 3), percent: String(last ? Math.min(90, last.percent + 5) : 10) }
              ])
            }}
            className={buttonSecondary}
          >
            <Plus className="h-4 w-4" />
            Ajouter un palier
          </button>
        </div>
      </div>
      <p className="mb-4 max-w-3xl text-xs text-gray-500">
        Plus un établissement choisit d&apos;éléments payants (un forfait compte pour 1), plus il paie moins cher. La réduction du palier
        atteint s&apos;applique à tout le paiement (mois et ajouts en cours de période), arrondi à la dizaine inférieure. Elle vaut pour les
        prochains devis et paiements, dans l&apos;application comme dans la console.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-400">
          Aucune réduction : le prix est la somme des éléments choisis.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const n = Number(row.minItems)
            const p = Number(row.percent)
            const gross = n * unitPrice
            const preview = n > 0 && p > 0 && p <= 90 ? applyPercent(gross, p) : null
            return (
              <div key={row.id} className="flex flex-wrap items-center gap-2 text-sm text-gray-700" data-tier-row>
                <span>À partir de</span>
                <input
                  value={row.minItems}
                  onChange={(e) => update(row.id, 'minItems', e.target.value)}
                  inputMode="numeric"
                  aria-label="Nombre d'éléments"
                  className={smallInput}
                />
                <span>éléments :</span>
                <input
                  value={row.percent}
                  onChange={(e) => update(row.id, 'percent', e.target.value)}
                  inputMode="numeric"
                  aria-label="Réduction en pourcentage"
                  className={smallInput}
                />
                <span>% de réduction</span>
                {preview && (
                  <span className="text-xs text-gray-400">
                    ex. {n} × {formatFcfa(unitPrice)} : <span className="line-through">{formatFcfa(gross)}</span>{' '}
                    <strong className="text-accent-700">{formatFcfa(preview.total)}</strong> / mois
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setState(undefined)
                    setRows((prev) => prev.filter((r) => r.id !== row.id))
                  }}
                  aria-label="Supprimer ce palier"
                  title="Supprimer ce palier"
                  className="ml-auto inline-grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !changed || Boolean(problem && rows.length > 0)} className={buttonPrimary}>
          {pending ? 'Enregistrement…' : 'Enregistrer les réductions'}
        </button>
        {changed && problem && rows.length > 0 && <p className="text-sm text-amber-700">{problem}</p>}
        <FormMessage state={state} />
      </div>
    </Card>
  )
}
