'use client'

import { useState, useTransition } from 'react'
import { BadgePercent, Plus, Trash2 } from 'lucide-react'
import { saveDiscountRules } from '@/app/actions/discounts'
import type { FormState } from '@/app/actions/form-state'
import { MAX_RULES, MAX_TIERS, applyPercent, sortTiers, validateRules, type DiscountRuleDef } from '@/lib/discount-math'
import { Card, FormMessage, buttonPrimary, buttonSecondary, formatFcfa, inputClass } from '@/components/ui'

// Console › Plans & tarifs : règles de réduction (Plan-Reductions-Abonnement.md §8). Une règle porte
// sur tout l'abonnement ou sur certaines sections ; elle compte les éléments payants choisis dans sa
// portée et réduit ces éléments. Deux règles sur un même élément : la plus forte s'applique.

interface TierRow {
  id: number
  minItems: string
  percent: string
}

interface RuleRow {
  id: string
  /** Vide = tout l'abonnement. */
  planIds: string[]
  /** Portée choisie : tout l'abonnement, ou des sections (cochées en dessous). */
  sections: boolean
  tiers: TierRow[]
}

/** Exemple proposé en un clic : celui de la demande (3 éléments −17 %, 10 éléments −25 %). */
const EXAMPLE: DiscountRuleDef[] = [
  {
    id: '',
    planIds: [],
    tiers: [
      { minItems: 3, percent: 17 },
      { minItems: 10, percent: 25 }
    ]
  }
]

// Champ étroit : la classe commune est pleine largeur.
const smallInput = `${inputClass.replace('w-full', '')} w-20 text-center`

let nextId = 1
const toRows = (rules: DiscountRuleDef[]): RuleRow[] =>
  rules.map((r) => ({
    id: r.id || `new-${nextId++}`,
    planIds: r.planIds,
    sections: r.planIds.length > 0,
    tiers: sortTiers(r.tiers).map((t) => ({ id: nextId++, minItems: String(t.minItems), percent: String(t.percent) }))
  }))

const toDefs = (rows: RuleRow[]): DiscountRuleDef[] =>
  rows.map((r) => ({
    id: r.id.startsWith('new-') ? '' : r.id,
    planIds: r.sections ? r.planIds : [],
    tiers: sortTiers(r.tiers.map((t) => ({ minItems: Number(t.minItems), percent: Number(t.percent) })))
  }))

export function DiscountRulesEditor({
  rules,
  plans,
  unitPrice
}: {
  rules: DiscountRuleDef[]
  plans: { id: string; name: string }[]
  unitPrice: number
}) {
  const [rows, setRows] = useState<RuleRow[]>(() => toRows(rules))
  const [state, setState] = useState<FormState>(undefined)
  const [pending, startTransition] = useTransition()

  const nameOf = (id: string): string => plans.find((p) => p.id === id)?.name ?? id
  const defs = toDefs(rows)
  const complete = rows.every((r) => r.tiers.every((t) => t.minItems.trim() !== '' && t.percent.trim() !== ''))
  const emptyScope = rows.find((r) => r.sections && r.planIds.length === 0)
  const problem = !complete
    ? 'Complétez chaque palier.'
    : emptyScope
      ? 'Cochez au moins une section pour chaque règle « Certaines sections ».'
      : validateRules(defs, nameOf)
  const changed = JSON.stringify(defs.map((d) => ({ ...d, id: '' }))) !== JSON.stringify(rules.map((r) => ({ ...r, id: '', tiers: sortTiers(r.tiers) })))

  function edit(ruleId: string, change: (rule: RuleRow) => RuleRow): void {
    setState(undefined)
    setRows((prev) => prev.map((r) => (r.id === ruleId ? change(r) : r)))
  }

  function addRule(): void {
    setState(undefined)
    const hasGlobal = rows.some((r) => !r.sections)
    setRows((prev) => [
      ...prev,
      { id: `new-${nextId++}`, planIds: [], sections: hasGlobal, tiers: [{ id: nextId++, minItems: '3', percent: '10' }] }
    ])
  }

  function save(): void {
    startTransition(async () => {
      try {
        setState(await saveDiscountRules(defs))
      } catch {
        // Page ouverte avant une mise en ligne (action de l'ancienne version) ou serveur injoignable.
        setState({ error: 'Enregistrement impossible : rechargez la page (le site a peut-être été mis à jour), puis recommencez.' })
      }
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
          <button type="button" disabled={rows.length >= MAX_RULES} onClick={addRule} className={buttonSecondary}>
            <Plus className="h-4 w-4" />
            Ajouter une règle
          </button>
        </div>
      </div>
      <p className="mb-4 max-w-3xl text-xs text-gray-500">
        Chaque règle porte sur <strong>tout l&apos;abonnement</strong> ou sur <strong>certaines sections</strong> : elle compte les
        éléments payants choisis dans sa portée (un forfait compte pour 1) et réduit ces éléments, mois et ajouts en cours de période
        compris. Si deux règles touchent le même élément, la plus forte s&apos;applique. Montant arrondi à la dizaine inférieure ;
        valable pour les prochains devis et paiements.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-400">
          Aucune réduction : le prix est la somme des éléments choisis.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((rule, index) => {
            const usedElsewhere = new Set(rows.filter((r) => r.id !== rule.id && r.sections).flatMap((r) => r.planIds))
            const globalElsewhere = rows.some((r) => r.id !== rule.id && !r.sections)
            return (
              <div key={rule.id} data-rule className="rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="font-semibold text-gray-900">Règle {index + 1}</span>
                  <span className="text-gray-500">S&apos;applique à :</span>
                  <label className="flex items-center gap-1.5 text-gray-700">
                    <input
                      type="radio"
                      name={`scope-${rule.id}`}
                      checked={!rule.sections}
                      disabled={globalElsewhere}
                      onChange={() => edit(rule.id, (r) => ({ ...r, sections: false }))}
                    />
                    Tout l&apos;abonnement
                  </label>
                  <label className="flex items-center gap-1.5 text-gray-700">
                    <input
                      type="radio"
                      name={`scope-${rule.id}`}
                      checked={rule.sections}
                      onChange={() => edit(rule.id, (r) => ({ ...r, sections: true }))}
                    />
                    Certaines sections
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setState(undefined)
                      setRows((prev) => prev.filter((r) => r.id !== rule.id))
                    }}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer la règle
                  </button>
                </div>

                {rule.sections && (
                  <div className="mb-3 flex flex-wrap gap-2" data-rule-sections>
                    {plans.map((plan) => {
                      const checked = rule.planIds.includes(plan.id)
                      const taken = usedElsewhere.has(plan.id)
                      return (
                        <label
                          key={plan.id}
                          title={taken ? 'Déjà dans une autre règle' : undefined}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                            checked ? 'border-accent-300 bg-accent-50 text-accent-800' : 'border-gray-200 text-gray-600'
                          } ${taken ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={taken}
                            onChange={(e) =>
                              edit(rule.id, (r) => ({
                                ...r,
                                planIds: e.target.checked ? [...r.planIds, plan.id] : r.planIds.filter((id) => id !== plan.id)
                              }))
                            }
                          />
                          {plan.name}
                        </label>
                      )
                    })}
                  </div>
                )}

                <div className="space-y-2">
                  {rule.tiers.map((tier) => {
                    const n = Number(tier.minItems)
                    const p = Number(tier.percent)
                    const gross = n * unitPrice
                    const preview = n > 0 && p > 0 && p <= 90 ? applyPercent(gross, p) : null
                    const update = (field: 'minItems' | 'percent', value: string): void =>
                      edit(rule.id, (r) => ({
                        ...r,
                        tiers: r.tiers.map((t) => (t.id === tier.id ? { ...t, [field]: value.replace(/[^\d]/g, '') } : t))
                      }))
                    return (
                      <div key={tier.id} className="flex flex-wrap items-center gap-2 text-sm text-gray-700" data-tier-row>
                        <span>À partir de</span>
                        <input
                          value={tier.minItems}
                          onChange={(e) => update('minItems', e.target.value)}
                          inputMode="numeric"
                          aria-label="Nombre d'éléments"
                          className={smallInput}
                        />
                        <span>{rule.sections ? 'éléments de ces sections :' : 'éléments :'}</span>
                        <input
                          value={tier.percent}
                          onChange={(e) => update('percent', e.target.value)}
                          inputMode="numeric"
                          aria-label="Réduction en pourcentage"
                          className={smallInput}
                        />
                        <span>% de réduction{rule.sections ? ' sur ces éléments' : ''}</span>
                        {preview && (
                          <span className="text-xs text-gray-400">
                            ex. {n} × {formatFcfa(unitPrice)} : <span className="line-through">{formatFcfa(gross)}</span>{' '}
                            <strong className="text-accent-700">{formatFcfa(preview.total)}</strong> / mois
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={rule.tiers.length === 1}
                          onClick={() => edit(rule.id, (r) => ({ ...r, tiers: r.tiers.filter((t) => t.id !== tier.id) }))}
                          aria-label="Supprimer ce palier"
                          title={rule.tiers.length === 1 ? 'Une règle garde au moins un palier' : 'Supprimer ce palier'}
                          className="ml-auto inline-grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  disabled={rule.tiers.length >= MAX_TIERS}
                  onClick={() =>
                    edit(rule.id, (r) => {
                      const last = sortTiers(toDefs([r])[0].tiers.filter((t) => t.minItems > 0)).at(-1)
                      return {
                        ...r,
                        tiers: [
                          ...r.tiers,
                          {
                            id: nextId++,
                            minItems: String(last ? last.minItems + 3 : 3),
                            percent: String(last ? Math.min(90, last.percent + 5) : 10)
                          }
                        ]
                      }
                    })
                  }
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent-600 hover:text-accent-700 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un palier
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !changed || Boolean(problem)} className={buttonPrimary}>
          {pending ? 'Enregistrement…' : 'Enregistrer les réductions'}
        </button>
        {changed && problem && <p className="text-sm text-amber-700">{problem}</p>}
        <FormMessage state={state} />
      </div>
    </Card>
  )
}
